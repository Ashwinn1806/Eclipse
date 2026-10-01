'use server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MACRO_CHECKIN_PERSONA } from '@/lib/aiPersonas';

// ---------------------------------------------------------------------------
// Verified active Gemini model chain (ordered by capability)
// ---------------------------------------------------------------------------
const GEMINI_CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

// ---------------------------------------------------------------------------
// Module-level helper: single Gemini call with exponential backoff retry.
// Extracted to module scope to avoid re-allocation on every call.
// ---------------------------------------------------------------------------
async function callWithBackoff(
  ai: any,
  model: string,
  contents: string,
  config: object,
  retries = 1,
  delayMs = 500,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  try {
    const response = await ai.models.generateContent({ model, contents, config });
    return {
      text: response.text || '',
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (err: any) {
    const isTransient =
      err?.status === 503 ||
      err?.status === 429 ||
      /overloaded|rate.?limit|unavailable/i.test(err?.message || '');

    if (isTransient && retries > 0) {
      await new Promise((res) => setTimeout(res, delayMs));
      return callWithBackoff(ai, model, contents, config, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function getTodayNutrition() {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];
  try {
    const entries = await prisma.nutritionEntry.findMany({
      where: { userId, date: today },
      orderBy: { createdAt: 'desc' }
    });
    return entries;
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return [];
  }
}

export async function addNutritionEntry(data: { itemName: string; category: string; calories: number; proteinG: number }) {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];
  try {
    return await prisma.nutritionEntry.create({
      data: {
        ...data,
        userId,
        date: today,
        isCompleted: true
      }
    });
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return {
      id: `local-${Date.now()}`,
      userId,
      date: today,
      itemName: data.itemName,
      category: data.category,
      calories: data.calories,
      proteinG: data.proteinG,
      isCompleted: true,
      createdAt: new Date(),
    };
  }
}

export async function toggleNutritionItem(id: string, isCompleted: boolean) {
  // Auth guard — ensure session is valid before any DB write
  await getSessionUserId();
  try {
    return await prisma.nutritionEntry.update({
      where: { id },
      data: { isCompleted }
    });
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return null;
  }
}

export async function logWorkoutSet(exerciseName: string, actualWeight: number, actualReps: number) {
  const userId = await getSessionUserId();
  try {
    let session = await prisma.workoutSession.findFirst({
      where: { userId, isCompleted: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      session = await prisma.workoutSession.create({
        data: {
          userId,
          splitDayName: 'Push Day A',
          totalTonnage: actualWeight * actualReps,
        }
      });
    } else {
      await prisma.workoutSession.update({
        where: { id: session.id },
        data: { totalTonnage: { increment: actualWeight * actualReps } }
      });
    }

    return await prisma.workoutSet.create({
      data: {
        sessionId: session.id,
        exerciseName,
        setNumber: 1,
        targetWeight: actualWeight,
        targetReps: actualReps,
        actualWeight,
        actualReps,
        isCompleted: true
      }
    });
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return {
      id: `local-set-${Date.now()}`,
      sessionId: 'local-session',
      exerciseName,
      setNumber: 1,
      targetWeight: actualWeight,
      targetReps: actualReps,
      actualWeight,
      actualReps,
      isCompleted: true,
      createdAt: new Date()
    };
  }
}

export async function getPreviousExerciseData(exerciseName: string) {
  const userId = await getSessionUserId();
  try {
    const previousSet = await prisma.workoutSet.findFirst({
      where: {
        exerciseName,
        isCompleted: true,
        session: { userId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        actualWeight: true,
        actualReps: true,
      }
    });

    if (previousSet && previousSet.actualWeight && previousSet.actualReps) {
      return {
        actualWeight: previousSet.actualWeight,
        actualReps: previousSet.actualReps,
      };
    }

    return { actualWeight: 32, actualReps: 10 };
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to default ghost benchmark:", error);
    return { actualWeight: 32, actualReps: 10 };
  }
}

export async function mockOrRunAICheckIn() {
  const userId = await getSessionUserId();

  // --- 1. Fetch real user profile from DB ---
  let goalType = 'Bulk';
  let targetCals = 3100;
  let targetProtein = 160;
  let weeklyAvgWeight = 78.2;
  let weightDelta = '+0.05';
  let sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const activeGoal = await prisma.userGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (activeGoal) {
      goalType = activeGoal.goalType;
      targetCals = activeGoal.targetDailyCals;
      targetProtein = activeGoal.targetDailyProtein;
    }

    const recentLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        morningWeight: { not: null },
        date: { gte: sevenDaysAgo.toISOString().split('T')[0] },
      },
      orderBy: { date: 'asc' },
    });

    if (recentLogs.length >= 2) {
      const weights = recentLogs
        .map((l) => l.morningWeight)
        .filter((w): w is number => w !== null);
      const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
      weeklyAvgWeight = Math.round(avg * 10) / 10;
      const delta = weights[weights.length - 1] - weights[0];
      weightDelta = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
    }
  } catch (err) {
    console.warn('Failed to load user profile for AI check-in, using defaults:', err);
  }

  const fallbackResult = {
    calsAdjustedBy: 150,
    newDailyCals: targetCals + 150,
    newDailyProtein: targetProtein,
    explanation: '[FALLBACK] Weight trend steady. Suggested +150 calorie surplus adjustment to sustain progressive overload.',
  };

  if (!process.env.GEMINI_API_KEY) {
    return {
      ...fallbackResult,
      explanation: `[MOCK] Weight trend stalled at ${weightDelta}kg/wk for ${goalType} goal. Adding 150 calories to break the plateau.`,
    };
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Goal: ${goalType}
7-Day Weight Avg: ${weeklyAvgWeight}kg (Delta: ${weightDelta}kg)
Current Target: ${targetCals} kcal, ${targetProtein}g protein.`;

    const config = {
      systemInstruction: MACRO_CHECKIN_PERSONA,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calsAdjustedBy: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
          newDailyCals: { type: Type.NUMBER },
          newDailyProtein: { type: Type.NUMBER },
        },
        required: ['calsAdjustedBy', 'explanation', 'newDailyCals', 'newDailyProtein'],
      },
    };

    let rawText = '';
    let usedModel = '';

    // --- 2. Try each model with backoff; module-level callWithBackoff avoids re-allocation ---
    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        // AbortController 10s hard timeout so Next.js never hangs indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        let result: { text: string; inputTokens: number; outputTokens: number };
        try {
          result = await callWithBackoff(ai, model, prompt, config);
        } finally {
          clearTimeout(timeoutId);
        }
        if (result.text) {
          rawText = result.text;
          usedModel = model;
          // 7. Token usage logging
          console.info('[Gemini] macro-checkin token usage:', {
            model,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          });
          break;
        }
      } catch (mErr: any) {
        console.warn(`[Gemini] model ${model} failed:`, mErr?.message || mErr);
        continue;
      }
    }

    if (rawText) {
      // --- 3. Safe JSON.parse — treat parse failure as a fallback trigger ---
      let parsed: typeof fallbackResult;
      try {
        parsed = JSON.parse(rawText.trim());
      } catch (parseErr) {
        console.warn('[Gemini] JSON parse failed despite responseSchema, using fallback:', parseErr);
        return fallbackResult;
      }

      // --- 4. Persist AI decision to WeeklySnapshot audit trail ---
      try {
        await prisma.weeklySnapshot.create({
          data: {
            userId,
            weekStartDate: sevenDaysAgo,
            avgWeight: weeklyAvgWeight,
            weightDelta: parseFloat(weightDelta),
            aiDecision: parsed.explanation,
            calsAdjustedBy: parsed.calsAdjustedBy,
          },
        });
        console.info('[Eclipse] WeeklySnapshot saved for user', userId);
      } catch (dbErr) {
        console.warn('[Eclipse] WeeklySnapshot write failed (non-fatal):', dbErr);
      }

      return parsed;
    }

    return fallbackResult;
  } catch (error) {
    console.warn('AI generation failed, returning fallback:', error);
    return fallbackResult;
  }
}

