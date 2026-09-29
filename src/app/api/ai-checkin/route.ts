import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { goalType, weeklyAvgWeight, weightDelta, currentCals, currentProtein } = await req.json();

    const prompt = `You are the Eclipse AI Macro Check-In Engine.
Goal: ${goalType}
7-Day Weight Avg: ${weeklyAvgWeight}kg (Delta: ${weightDelta}kg)
Current Target: ${currentCals} kcal, ${currentProtein}g protein.

Evaluate metabolic adaptation. A standard bulk targets +0.25kg/wk. A cut targets -0.5kg/wk. If progress has stalled, suggest an adjustment (e.g., +/- 150 cals). If on track, maintain targets. 
Return ONLY valid JSON with no markdown formatting: { "calsAdjustedBy": number, "explanation": "string", "newDailyCals": number, "newDailyProtein": number }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return NextResponse.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    return NextResponse.json({ error: "AI evaluation failed" }, { status: 500 });
  }
}
