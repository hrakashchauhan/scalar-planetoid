import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { session_code, student_name, question, answer_given, is_correct } = body;

        const { error } = await supabase
            .from('quiz_responses')
            .insert({
                session_code,
                student_name,
                question,
                answer_given,
                is_correct
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e }, { status: 500 });
    }
}
