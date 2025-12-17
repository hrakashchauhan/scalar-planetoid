import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { topic } = await req.json();
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Missing Groq API Key" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        // Prompt engineering for JSON
        const prompt = `Generate a single multiple-choice question about "${topic}" for a classroom quiz. 
    Return strictly valid JSON with no markdown formatting.
    Format:
    {
      "question": "The actual question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The text of the correct option",
      "explanation": "Brief explanation"
    }`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192", // Fast & Good
            temperature: 0.5,
        });

        const text = completion.choices[0]?.message?.content || "";

        // Clean up if model returns markdown
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(cleanJson);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Groq Error:", error);
        return NextResponse.json({ error: "AI Generation Failed" }, { status: 500 });
    }
}
