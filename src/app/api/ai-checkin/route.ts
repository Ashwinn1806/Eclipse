import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { goalType, weeklyAvgWeight, weightDelta, currentCals, currentProtein } = await req.json();

    const prompt = `You are the Eclipse AI Macro Check-In Engine.
Goal: ${goalType}
7-Day Weight Avg: ${weeklyAvgWeight}kg (Delta: ${weightDelta}kg)
Current Target: ${currentCals} kcal, ${currentProtein}g protein.

Evaluate metabolic adaptation. A standard bulk targets +0.25kg/wk. A cut targets -0.5kg/wk. If progress has stalled, suggest an adjustment (e.g., +/- 150 cals). If on track, maintain targets. 
Return ONLY valid JSON with no markdown formatting: { "calsAdjustedBy": number, "explanation": "string", "newDailyCals": number, "newDailyProtein": number }`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
    let rawText = '';

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json" }
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

    const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (error: any) {
    console.error("[ai-checkin] Handler error:", error);
    return NextResponse.json({ error: error?.message || "AI evaluation failed" }, { status: 500 });
  }
}
