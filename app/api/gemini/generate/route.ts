import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { topic } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Prompt engineering for specific JSON format
        const prompt = `Generate a single multiple-choice question about "${topic}" for a classroom quiz. 
    Return strictly valid JSON with no markdown formatting.
    Format:
    {
      "question": "The actual question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The text of the correct option",
      "explanation": "Brief explanation"
    }`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up if model returns markdown code blocks
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(cleanJson);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Gemini Error:", error);
        return NextResponse.json({ error: "AI Generation Failed" }, { status: 500 });
    }
}
