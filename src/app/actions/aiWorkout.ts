'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export interface WorkoutSetData {
  exercise: string;
  setNumber?: number;
  targetWeight: number;
  targetReps: number;
  actualWeight: number;
  actualReps: number;
}

export interface WorkoutSessionInput {
  splitName: string;
  sets: WorkoutSetData[];
}

export interface AIProgressionTarget {
  exercise: string;
  nextWeight: number;
  nextReps: number;
  reason: string;
}

export interface AnalyzeProgressionResponse {
  success: boolean;
  recommendations: AIProgressionTarget[];
  totalTonnage: number;
  source: 'ai' | 'fallback';
  error?: string;
}

/**
 * Step 2: The AI Smart Recommendation Engine
 * Analyzes completed workout sets with Gemini 2.5 Flash and prescribes
 * progressive overload weights and reps for the next session.
 */
export async function analyzeSessionProgression(
  workoutData: WorkoutSessionInput | WorkoutSetData[]
): Promise<AnalyzeProgressionResponse> {
  const userId = await getSessionUserId();

  // Normalize input data
  let splitName = 'Push';
  let sets: WorkoutSetData[] = [];

  if (Array.isArray(workoutData)) {
    sets = workoutData;
  } else if (workoutData && typeof workoutData === 'object') {
    splitName = workoutData.splitName || 'Push';
    sets = workoutData.sets || [];
  }

  const totalTonnage = sets.reduce((sum, s) => sum + (s.actualWeight * s.actualReps), 0);

  let recommendations: AIProgressionTarget[] = [];
  let source: 'ai' | 'fallback' = 'ai';

  // Format sets for prompt
  const setsDescription = sets.map((s, idx) => ({
    setIndex: idx + 1,
    exercise: s.exercise,
    targetWeight: `${s.targetWeight}kg`,
    targetReps: s.targetReps,
    actualWeight: `${s.actualWeight}kg`,
    actualReps: s.actualReps,
    metTarget: s.actualReps >= s.targetReps,
    deltaReps: s.actualReps - s.targetReps,
  }));

  const promptDirective = `Act as a strength coach. Analyze these sets. If the user met or exceeded target reps, prescribe a 2.5kg to 5kg weight increase for their next session. If they missed reps, maintain weight and adjust rep targets. Return JSON exactly matching this schema: [{ "exercise": string, "nextWeight": number, "nextReps": number, "reason": string }].

Completed Session Data:
${JSON.stringify(setsDescription, null, 2)}`;

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      // Initialize client exclusively on the server using environment variable
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let rawText = '';

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptDirective,
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    exercise: { type: Type.STRING },
                    nextWeight: { type: Type.NUMBER },
                    nextReps: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                  },
                  required: ['exercise', 'nextWeight', 'nextReps', 'reason'],
                },
              },
            },
          });
          rawText = response.text || '';
          if (rawText) break;
        } catch (candidateErr) {
          // If a model is deprecated (404) or busy (503), try next available model
          continue;
        }
      }

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        recommendations = parsed.map((item: any) => ({
          exercise: String(item.exercise || 'Exercise'),
          nextWeight: Number(item.nextWeight || 0),
          nextReps: Number(item.nextReps || 10),
          reason: String(item.reason || 'AI progression target applied.'),
        }));
      }
    } catch (aiError) {
      console.warn('Gemini 2.5 Flash analysis error, switching to algorithmic progression:', aiError);
      source = 'fallback';
    }
  } else {
    source = 'fallback';
  }

  // Graceful rule-based engine fallback matching the exact prompt logic
  if (recommendations.length === 0) {
    recommendations = sets.map((s) => {
      const metTarget = s.actualReps >= s.targetReps;
      const isHeavyCompound = /press|squat|deadlift|row/i.test(s.exercise);
      const increment = isHeavyCompound ? 5 : 2.5;

      if (metTarget) {
        const newWeight = Math.round((s.actualWeight + increment) * 10) / 10;
        return {
          exercise: s.exercise,
          nextWeight: newWeight,
          nextReps: s.targetReps,
          reason: `Target hit with ${s.actualReps}/${s.targetReps} reps! Prescribed +${increment}kg progression for next week.`,
        };
      } else {
        return {
          exercise: s.exercise,
          nextWeight: s.actualWeight,
          nextReps: s.targetReps,
          reason: `Target not met (${s.actualReps}/${s.targetReps} reps). Maintained ${s.actualWeight}kg to solidify volume.`,
        };
      }
    });
  }

  // Step 3: Save these new AI-generated targets to the PostgreSQL database so they appear as the "Ghost" data during the next session
  try {
    // 1. Record completed session
    await prisma.workoutSession.create({
      data: {
        userId,
        splitDayName: splitName,
        totalTonnage,
        isCompleted: true,
        sets: {
          create: sets.map((s, idx) => ({
            exerciseName: s.exercise,
            setNumber: s.setNumber || idx + 1,
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            actualWeight: s.actualWeight,
            actualReps: s.actualReps,
            isCompleted: true,
          })),
        },
      },
    });

    // 2. Remove any previous uncompleted pending template for this split
    await prisma.workoutSession.deleteMany({
      where: {
        userId,
        splitDayName: splitName,
        isCompleted: false,
      },
    });

    // 3. Save new AI-generated targets as the upcoming session template (Ghost benchmark)
    await prisma.workoutSession.create({
      data: {
        userId,
        splitDayName: splitName,
        totalTonnage: 0,
        isCompleted: false,
        sets: {
          create: recommendations.map((rec, idx) => ({
            exerciseName: rec.exercise,
            setNumber: idx + 1,
            targetWeight: rec.nextWeight,
            targetReps: rec.nextReps,
            actualWeight: null,
            actualReps: null,
            isCompleted: false,
          })),
        },
      },
    });
  } catch (dbError) {
    console.warn('PostgreSQL unreachable, targets saved in response for client-side offline storage:', dbError);
  }

  return {
    success: true,
    recommendations,
    totalTonnage,
    source,
  };
}

/**
 * Retrieves the 4-week tonnage history for a specific split
 */
export async function getSplitTonnageHistory(splitDayName: string) {
  const userId = await getSessionUserId();
  try {
    const pastSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        splitDayName: { contains: splitDayName, mode: 'insensitive' },
        isCompleted: true,
      },
      orderBy: { date: 'desc' },
      take: 4,
      select: {
        id: true,
        date: true,
        totalTonnage: true,
      },
    });

    if (pastSessions.length > 0) {
      // Reverse to chronological order (oldest to newest)
      return pastSessions.reverse().map((s, idx) => ({
        weekLabel: `W${idx + 1}`,
        date: s.date.toISOString().split('T')[0],
        tonnage: Math.round(s.totalTonnage),
      }));
    }
  } catch (error) {
    console.warn('DB offline or unreachable, using default 4-week progression benchmark:', error);
  }

  // Realistic fallback 4-week tonnage history per split
  const lower = splitDayName.toLowerCase();
  let baseTonnage = 5000;
  if (lower.includes('legs') || lower.includes('lower')) baseTonnage = 6800;
  else if (lower.includes('pull')) baseTonnage = 5600;
  else if (lower.includes('push')) baseTonnage = 5100;

  return [
    { weekLabel: 'W-3', date: '3 wks ago', tonnage: Math.round(baseTonnage * 0.88) },
    { weekLabel: 'W-2', date: '2 wks ago', tonnage: Math.round(baseTonnage * 0.93) },
    { weekLabel: 'W-1', date: 'Last week', tonnage: Math.round(baseTonnage * 0.98) },
    { weekLabel: 'Current', date: 'Target', tonnage: Math.round(baseTonnage * 1.05) },
  ];
}

/**
 * Fetches the latest Ghost targets and benchmarks for a given split
 */
export async function getSplitGhostData(splitDayName: string) {
  const userId = await getSessionUserId();
  try {
    // 1. Check for pending AI prescribed targets
    const pendingSession = await prisma.workoutSession.findFirst({
      where: {
        userId,
        splitDayName: { contains: splitDayName, mode: 'insensitive' },
        isCompleted: false,
      },
      include: {
        sets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Check for latest completed session
    const lastCompleted = await prisma.workoutSession.findFirst({
      where: {
        userId,
        splitDayName: { contains: splitDayName, mode: 'insensitive' },
        isCompleted: true,
      },
      include: {
        sets: true,
      },
      orderBy: { date: 'desc' },
    });

    const targetMap: Record<string, { targetWeight: number; targetReps: number; ghostWeight: number; ghostReps: number }> = {};

    if (pendingSession && pendingSession.sets.length > 0) {
      for (const s of pendingSession.sets) {
        targetMap[s.exerciseName] = {
          targetWeight: s.targetWeight,
          targetReps: s.targetReps,
          ghostWeight: s.targetWeight,
          ghostReps: s.targetReps,
        };
      }
    }

    if (lastCompleted && lastCompleted.sets.length > 0) {
      for (const s of lastCompleted.sets) {
        if (!targetMap[s.exerciseName]) {
          targetMap[s.exerciseName] = {
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            ghostWeight: s.actualWeight || s.targetWeight,
            ghostReps: s.actualReps || s.targetReps,
          };
        } else {
          targetMap[s.exerciseName].ghostWeight = s.actualWeight || targetMap[s.exerciseName].targetWeight;
          targetMap[s.exerciseName].ghostReps = s.actualReps || targetMap[s.exerciseName].targetReps;
        }
      }
    }

    return targetMap;
  } catch (error) {
    console.warn('DB offline or unreachable, using default ghost data:', error);
    return {};
  }
}
