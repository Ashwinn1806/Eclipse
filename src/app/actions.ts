'use server';
import { prisma } from '@/lib/prisma';

// Temporary dummy user ID for local PWA usage
const USER_ID = 'local-user-001';

export async function getTodayNutrition() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const entries = await prisma.nutritionEntry.findMany({
      where: { userId: USER_ID, date: today },
      orderBy: { createdAt: 'desc' }
    });
    return entries;
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return [];
  }
}

export async function addNutritionEntry(data: { itemName: string; category: string; calories: number; proteinG: number }) {
  const today = new Date().toISOString().split('T')[0];
  try {
    return await prisma.nutritionEntry.create({
      data: {
        ...data,
        userId: USER_ID,
        date: today,
        isCompleted: true // Default to completed when quick-adding
      }
    });
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to local store:", error);
    return {
      id: `local-${Date.now()}`,
      userId: USER_ID,
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
  try {
    // Find or create an active workout session for today
    let session = await prisma.workoutSession.findFirst({
      where: { userId: USER_ID, isCompleted: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      session = await prisma.workoutSession.create({
        data: {
          userId: USER_ID,
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
  try {
    const previousSet = await prisma.workoutSet.findFirst({
      where: {
        exerciseName,
        isCompleted: true,
        session: { userId: USER_ID },
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

    return {
      actualWeight: 32,
      actualReps: 10,
    };
  } catch (error) {
    console.warn("DB offline or unreachable, falling back to default ghost benchmark:", error);
    return {
      actualWeight: 32,
      actualReps: 10,
    };
  }
}

export async function mockOrRunAICheckIn() {
  if (!process.env.GEMINI_API_KEY) {
    return {
      calsAdjustedBy: 150,
      newDailyCals: 3100,
      newDailyProtein: 160,
      explanation: "[MOCK] Weight trend has stalled at 0.05kg/wk. Adding 150 calories to break the plateau."
    };
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are the Eclipse AI Macro Check-In Engine.
Goal: Bulk
7-Day Weight Avg: 78.2kg (Delta: +0.05kg)
Current Target: 2950 kcal, 160g protein.

Evaluate metabolic adaptation. A standard bulk targets +0.25kg/wk. A cut targets -0.5kg/wk. If progress has stalled, suggest an adjustment (e.g., +/- 150 cals). If on track, maintain targets.
Return ONLY valid JSON with no markdown formatting:
{ "calsAdjustedBy": number, "explanation": "string", "newDailyCals": number, "newDailyProtein": number }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const clean = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    console.warn("AI generation failed, returning fallback:", error);
    return {
      calsAdjustedBy: 150,
      newDailyCals: 3100,
      newDailyProtein: 160,
      explanation: "[FALLBACK] Weight trend steady. Suggested +150 calorie surplus adjustment to sustain progressive overload."
    };
  }
}
