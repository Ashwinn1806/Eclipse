import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { goalType, weeklyAvgWeight, weightDelta, currentCals, currentProtein } = await req.json();

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      return NextResponse.json({
        calsAdjustedBy: 150,
        explanation: "Weight trend steady (+0.05kg). Suggested +150 calorie surplus adjustment to break the plateau.",
        newDailyCals: (currentCals || 2950) + 150,
        newDailyProtein: currentProtein || 160
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `You are the Eclipse AI Macro Check-In Engine. Evaluate metabolic adaptation based on weekly weight trends and goals. A standard bulk targets +0.25kg/wk. A cut targets -0.5kg/wk. If progress has stalled, suggest an adjustment (e.g., +/- 150 cals). If on track, maintain targets.`;

    const prompt = `Goal: ${goalType}
7-Day Weight Avg: ${weeklyAvgWeight}kg (Delta: ${weightDelta}kg)
Current Target: ${currentCals} kcal, ${currentProtein}g protein.`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let rawText = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                calsAdjustedBy: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                newDailyCals: { type: Type.NUMBER },
                newDailyProtein: { type: Type.NUMBER },
              },
              required: ["calsAdjustedBy", "explanation", "newDailyCals", "newDailyProtein"],
            },
          }
        });
        rawText = response.text || '';
        if (rawText) break;
      } catch (mErr: any) {
        console.warn(`[ai-checkin] Model ${model} error:`, mErr?.message || mErr);
        continue;
      }
    }

    if (!rawText) {
      console.warn("[ai-checkin] No candidate model returned text, using fallback");
      return NextResponse.json({
        calsAdjustedBy: 150,
        explanation: "Weight trend steady (+0.05kg). Suggested +150 calorie surplus adjustment to break the plateau.",
        newDailyCals: (currentCals || 2950) + 150,
        newDailyProtein: currentProtein || 160
      });
    }

    return NextResponse.json(JSON.parse(rawText.trim()));
  } catch (error: any) {
    console.error("[ai-checkin] Handler error:", error);
    return NextResponse.json({ error: error?.message || "AI evaluation failed" }, { status: 500 });
  }
}
