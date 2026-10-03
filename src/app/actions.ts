'use server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MACRO_CHECKIN_PERSONA } from '@/lib/aiPersonas';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Verified active Gemini model chain (ordered by capability)
// ---------------------------------------------------------------------------
const GEMINI_CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

// ---------------------------------------------------------------------------
// Module-level helper: single Gemini call with exponential backoff retry.
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

export async function ensureDevUserExists() {
  if (process.env.NODE_ENV === 'development') {
    try {
      await prisma.user.upsert({
        where: { id: 'local-dev-user' },
        update: {},
        create: {
          id: 'local-dev-user',
          name: 'Ashwin Verma',
          email: 'ashwin@local.dev',
        },
      });
    } catch (err) {
      console.warn('[Eclipse DB] Dev user upsert non-fatal error:', err);
    }
  }
}

async function getSessionUserId(): Promise<string> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch (err) {
    console.warn('[Eclipse Auth] Error fetching session:', err);
  }

  if (!userId && process.env.NODE_ENV === 'development') {
    userId = 'local-dev-user';
  }

  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (userId === 'local-dev-user') {
    await ensureDevUserExists();
  }

  return userId;
}

// ---------------------------------------------------------------------------
// NUTRITION — READ
// ---------------------------------------------------------------------------
export async function getTodayNutrition() {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];
  try {
    const entries = await prisma.nutritionEntry.findMany({
      where: { userId, date: today },
      orderBy: { createdAt: 'asc' }
    });
    return entries;
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// NUTRITION — CREATE
// ---------------------------------------------------------------------------
export async function addNutritionEntry(data: {
  itemName: string;
  category: string;
  calories: number;
  proteinG: number;
  waterMl?: number;
}) {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];
  try {
    const entry = await prisma.nutritionEntry.create({
      data: {
        itemName: data.itemName,
        category: data.category,
        calories: data.calories,
        proteinG: data.proteinG,
        waterMl: data.waterMl ?? 0,
        userId,
        date: today,
        isCompleted: true,
      }
    });
    revalidatePath('/');
    return entry;
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
      waterMl: data.waterMl ?? 0,
      isCompleted: true,
      createdAt: new Date(),
    };
  }
}

// ---------------------------------------------------------------------------
// NUTRITION — TOGGLE
// ---------------------------------------------------------------------------
export async function toggleNutritionItem(id: string, isCompleted: boolean) {
  await getSessionUserId();
  try {
    const entry = await prisma.nutritionEntry.update({
      where: { id },
      data: { isCompleted }
    });
    revalidatePath('/');
    return entry;
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// NUTRITION — UPDATE (inline edit calories/protein/name)
// ---------------------------------------------------------------------------
export async function updateNutritionEntry(
  id: string,
  data: { itemName?: string; calories?: number; proteinG?: number; category?: string; waterMl?: number }
) {
  await getSessionUserId();
  try {
    const entry = await prisma.nutritionEntry.update({
      where: { id },
      data,
    });
    revalidatePath('/');
    return { success: true, entry };
  } catch (error) {
    console.warn('updateNutritionEntry failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// NUTRITION — DELETE
// ---------------------------------------------------------------------------
export async function deleteNutritionEntry(id: string) {
  await getSessionUserId();
  try {
    await prisma.nutritionEntry.delete({ where: { id } });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.warn('deleteNutritionEntry failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// USER GOAL — READ active goal
// ---------------------------------------------------------------------------
export async function getActiveUserGoal() {
  const userId = await getSessionUserId();
  try {
    const goal = await prisma.userGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return goal;
  } catch (error) {
    console.warn('getActiveUserGoal failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// USER GOAL — UPDATE (inline edit calorie/protein/water targets)
// ---------------------------------------------------------------------------
export async function updateUserGoal(data: {
  targetDailyCals?: number;
  targetDailyProtein?: number;
  targetDailyWaterMl?: number;
}) {
  const userId = await getSessionUserId();
  try {
    // Find active goal
    const existing = await prisma.userGoal.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updated = await prisma.userGoal.update({
        where: { id: existing.id },
        data,
      });
      revalidatePath('/');
      return { success: true, goal: updated };
    } else {
      // Create a new goal if none exists
      const newGoal = await prisma.userGoal.create({
        data: {
          userId,
          goalType: 'Maintain',
          startWeight: 80,
          targetWeight: 80,
          targetDate: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000),
          targetDailyCals: data.targetDailyCals ?? 2950,
          targetDailyProtein: data.targetDailyProtein ?? 130,
          targetDailyWaterMl: data.targetDailyWaterMl ?? 2500,
          isActive: true,
        },
      });
      revalidatePath('/');
      return { success: true, goal: newGoal };
    }
  } catch (error) {
    console.warn('updateUserGoal failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT SET — LOG (legacy compat)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// WORKOUT SET — UPDATE (inline weight/rep blur save)
// ---------------------------------------------------------------------------
export async function updateWorkoutSet(
  setId: string,
  data: { targetWeight?: number; targetReps?: number; actualWeight?: number; actualReps?: number; isCompleted?: boolean; isDropSet?: boolean; rpe?: number; orderIndex?: number }
) {
  await getSessionUserId();
  try {
    const updated = await prisma.workoutSet.update({
      where: { id: setId },
      data,
    });
    revalidatePath('/workout/[split]', 'page');
    revalidatePath('/');
    return { success: true, set: updated };
  } catch (error) {
    console.warn('updateWorkoutSet failed:', error);
    return { success: false, error: String(error) };
  }
}


// ---------------------------------------------------------------------------
// WORKOUT EXERCISE — REORDER EXERCISES IN SESSION
// ---------------------------------------------------------------------------
export async function updateExerciseOrder(
  sessionId: string,
  exerciseOrders: Array<{ exerciseName: string; orderIndex: number }>
) {
  await getSessionUserId();
  try {
    await Promise.all(
      exerciseOrders.map((eo) =>
        prisma.workoutSet.updateMany({
          where: { sessionId, exerciseName: eo.exerciseName },
          data: { orderIndex: eo.orderIndex },
        })
      )
    );
    revalidatePath('/workout/[split]', 'page');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.warn('updateExerciseOrder failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT SET — DELETE
// ---------------------------------------------------------------------------
export async function deleteWorkoutSet(setId: string) {
  await getSessionUserId();
  try {
    await prisma.workoutSet.delete({ where: { id: setId } });
    revalidatePath('/workout/[split]', 'page');
    return { success: true };
  } catch (error) {
    console.warn('deleteWorkoutSet failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT EXERCISE — ADD with sets (nested create via pending session)
// ---------------------------------------------------------------------------
export async function addExerciseToSession(
  splitDayName: string,
  exercise: {
    name: string;
    type: 'Compound' | 'Isolation';
    sets: Array<{ weight: number; reps: number }>;
  }
) {
  const userId = await getSessionUserId();
  try {
    // Find or create pending session for this split
    let session = await prisma.workoutSession.findFirst({
      where: { userId, splitDayName: { contains: splitDayName, mode: 'insensitive' }, isCompleted: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      session = await prisma.workoutSession.create({
        data: { userId, splitDayName, totalTonnage: 0, isCompleted: false },
      });
    }

    // Get existing set count for this exercise in session to determine starting setNumber
    const existingSets = await prisma.workoutSet.findMany({
      where: { sessionId: session.id, exerciseName: exercise.name },
    });
    const startSetNum = existingSets.length + 1;

    const createdSets = await Promise.all(
      exercise.sets.map((s, idx) =>
        prisma.workoutSet.create({
          data: {
            sessionId: session!.id,
            exerciseName: exercise.name,
            setNumber: startSetNum + idx,
            targetWeight: s.weight,
            targetReps: s.reps,
            actualWeight: null,
            actualReps: null,
            isCompleted: false,
          },
        })
      )
    );

    revalidatePath('/workout/[split]', 'page');
    return { success: true, sessionId: session.id, sets: createdSets };
  } catch (error) {
    console.warn('addExerciseToSession failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT EXERCISE — RENAME (updates all sets under session)
// ---------------------------------------------------------------------------
export async function renameExerciseInSession(
  sessionId: string,
  oldName: string,
  newName: string
) {
  await getSessionUserId();
  try {
    await prisma.workoutSet.updateMany({
      where: { sessionId, exerciseName: oldName },
      data: { exerciseName: newName },
    });
    revalidatePath('/workout/[split]', 'page');
    return { success: true };
  } catch (error) {
    console.warn('renameExerciseInSession failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT EXERCISE — DELETE (removes all sets for an exercise from session)
// ---------------------------------------------------------------------------
export async function deleteExerciseFromSession(sessionId: string, exerciseName: string) {
  await getSessionUserId();
  try {
    await prisma.workoutSet.deleteMany({
      where: { sessionId, exerciseName },
    });
    revalidatePath('/workout/[split]', 'page');
    return { success: true };
  } catch (error) {
    console.warn('deleteExerciseFromSession failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT SET — ADD one set to existing exercise in session
// ---------------------------------------------------------------------------
export async function addSetToExercise(
  sessionId: string,
  exerciseName: string,
  weight: number,
  reps: number
) {
  await getSessionUserId();
  try {
    const existing = await prisma.workoutSet.findMany({
      where: { sessionId, exerciseName },
      orderBy: { setNumber: 'asc' },
    });
    const nextSetNum = (existing[existing.length - 1]?.setNumber ?? 0) + 1;
    const created = await prisma.workoutSet.create({
      data: {
        sessionId,
        exerciseName,
        setNumber: nextSetNum,
        targetWeight: weight,
        targetReps: reps,
        actualWeight: null,
        actualReps: null,
        isCompleted: false,
      },
    });
    revalidatePath('/workout/[split]', 'page');
    return { success: true, set: created };
  } catch (error) {
    console.warn('addSetToExercise failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// WORKOUT SESSION — GET pending session with all sets for a split
// ---------------------------------------------------------------------------
export async function getPendingSessionWithSets(splitDayName: string) {
  const userId = await getSessionUserId();
  try {
    const session = await prisma.workoutSession.findFirst({
      where: {
        userId,
        splitDayName: { contains: splitDayName, mode: 'insensitive' },
        isCompleted: false,
      },
      include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setNumber: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
    return session;
  } catch (error) {
    console.warn('getPendingSessionWithSets failed:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GHOST DATA (existing)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// BODY WEIGHT — LOG daily weigh-in
// ---------------------------------------------------------------------------
export async function logDailyWeight(weightKg: number) {
  const userId = await getSessionUserId();
  const today = new Date().toISOString().split('T')[0];
  try {
    const log = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      update: { morningWeight: weightKg, updatedAt: new Date() },
      create: { userId, date: today, morningWeight: weightKg },
    });
    revalidatePath('/');
    return { success: true, log };
  } catch (error) {
    console.warn('logDailyWeight failed:', error);
    return { success: false, error: String(error) };
  }
}

// ---------------------------------------------------------------------------
// BODY WEIGHT — GET last 7 days of weight logs
// ---------------------------------------------------------------------------
export async function getWeeklyWeightLogs() {
  const userId = await getSessionUserId();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // inclusive of today = 7 days
  try {
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo.toISOString().split('T')[0] },
      },
      orderBy: { date: 'asc' },
      select: { date: true, morningWeight: true },
    });
    return logs;
  } catch (error) {
    console.warn('getWeeklyWeightLogs failed:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// AI CHECK-IN (with dynamic context from DB)
// ---------------------------------------------------------------------------
export async function mockOrRunAICheckIn() {
  const userId = await getSessionUserId();

  let goalType = 'Bulk';
  let targetCals = 3100;
  let targetProtein = 160;
  let weeklyAvgWeight = 78.2;
  let weightDelta = '+0.05';
  let weightTrend = 'maintaining'; // gaining | losing | maintaining
  let sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Dynamic context: pull current state from DB
  let nutritionContext = '';
  let weightContext = '';
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

    // Phase 4: Aggregate 7-day daily weight logs for real trend calculation
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

      // Classify trend relative to goal
      if (goalType === 'Bulk') {
        weightTrend = delta > 0.1 ? 'gaining (on track)' : delta < -0.1 ? 'losing (off track)' : 'stalled';
      } else if (goalType === 'Cut') {
        weightTrend = delta < -0.1 ? 'losing (on track)' : delta > 0.1 ? 'gaining (off track)' : 'stalled';
      } else {
        weightTrend = Math.abs(delta) < 0.2 ? 'maintaining (on track)' : delta > 0.2 ? 'gaining' : 'losing';
      }
      weightContext = `\n7-day weight log: [${weights.map(w => `${w}kg`).join(', ')}]. Trend: ${weightTrend}.`;
    } else if (recentLogs.length === 1) {
      const w = recentLogs[0].morningWeight;
      weeklyAvgWeight = w ?? weeklyAvgWeight;
      weightContext = `\nOnly 1 weigh-in recorded this week (${weeklyAvgWeight}kg). Insufficient data for trend — use goal type to guide recommendation.`;
    } else {
      weightContext = '\nNo weigh-ins recorded this week. Base recommendation solely on goal type and calorie targets.';
    }

    // Fetch last 7 days of nutrition entries for compliance context
    const weekNutrition = await prisma.nutritionEntry.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo.toISOString().split('T')[0] },
        isCompleted: true,
      },
    });

    const dayMap: Record<string, { cals: number; protein: number }> = {};
    for (const e of weekNutrition) {
      if (!dayMap[e.date]) dayMap[e.date] = { cals: 0, protein: 0 };
      dayMap[e.date].cals += e.calories;
      dayMap[e.date].protein += e.proteinG;
    }
    const loggedDays = Object.values(dayMap);
    if (loggedDays.length > 0) {
      const avgCals = Math.round(loggedDays.reduce((s, d) => s + d.cals, 0) / loggedDays.length);
      const avgProtein = Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length);
      const compliancePct = Math.round((loggedDays.filter(d => Math.abs(d.cals - targetCals) < targetCals * 0.1).length / loggedDays.length) * 100);
      nutritionContext = `\n7-day nutrition avg: ${avgCals} kcal/day, ${avgProtein}g protein/day across ${loggedDays.length} logged days. Calorie compliance within 10%: ${compliancePct}% of days.`;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = await prisma.nutritionEntry.findMany({ where: { userId, date: today, isCompleted: true } });
      const todayCals = todayEntries.reduce((s, e) => s + e.calories, 0);
      const todayProtein = todayEntries.reduce((s, e) => s + e.proteinG, 0);
      nutritionContext = `\nToday's actual intake: ${todayCals} kcal, ${todayProtein}g protein (${todayEntries.length} items logged). No historical nutrition data available.`;
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
7-Day Weight Avg: ${weeklyAvgWeight}kg (7-Day Weight Delta: ${weightDelta}kg)${weightContext}
Current Targets: ${targetCals} kcal, ${targetProtein}g protein.${nutritionContext}

THERMODYNAMIC MACRO MATH INSTRUCTION:
Use strict thermodynamic math: 1kg of body tissue = 7,700 calories. If the user's 7-day weight trend shows a loss of 0.5kg, they are in a ~3,850 weekly calorie deficit (550 kcal/day). Calculate their exact TDEE based on this delta, and output a precise daily calorie and protein target to reach their goal.`;

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

    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
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
      let parsed: typeof fallbackResult;
      try {
        parsed = JSON.parse(rawText.trim());
      } catch {
        return fallbackResult;
      }

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

// ---------------------------------------------------------------------------
// NUTRITION — LOAD DEFAULT DAILY DIET PLAN
// ---------------------------------------------------------------------------
export async function loadDefaultDailyDiet(targetDate?: string) {
  const userId = await getSessionUserId();
  const date = targetDate || new Date().toISOString().split('T')[0];

  const defaultDietItems = [
    { itemName: 'Water 1', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
    { itemName: 'BREAKFAST', category: 'Meal', calories: 765, proteinG: 43, waterMl: 0 },
    { itemName: 'Dry fruits', category: 'Snack', calories: 275, proteinG: 9, waterMl: 0 },
    { itemName: 'Water 2', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
    { itemName: 'LUNCH', category: 'Meal', calories: 600, proteinG: 15, waterMl: 0 },
    { itemName: 'Water 3', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
    { itemName: 'Pre-Snack', category: 'Snack', calories: 360, proteinG: 4, waterMl: 0 },
    { itemName: 'Eggs (3)', category: 'Meal', calories: 200, proteinG: 18, waterMl: 0 },
    { itemName: 'Water 4', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
    { itemName: 'DINNER', category: 'Meal', calories: 600, proteinG: 15, waterMl: 0 },
    { itemName: 'Whey Protein + Isabgol', category: 'Snack', calories: 100, proteinG: 25, waterMl: 0 },
    { itemName: '2 Soaked Anjeer', category: 'Snack', calories: 50, proteinG: 1, waterMl: 0 },
  ];

  try {
    // Delete existing entries for this date to prevent duplicate loads
    await prisma.nutritionEntry.deleteMany({
      where: { userId, date },
    });

    const entries = await Promise.all(
      defaultDietItems.map((item) =>
        prisma.nutritionEntry.create({
          data: {
            userId,
            date,
            itemName: item.itemName,
            category: item.category,
            calories: item.calories,
            proteinG: item.proteinG,
            waterMl: item.waterMl,
            isCompleted: true,
          },
        })
      )
    );

    revalidatePath('/');
    return { success: true, count: entries.length, entries };
  } catch (error) {
    console.warn('loadDefaultDailyDiet failed:', error);
    return { success: false, error: String(error) };
  }
}

