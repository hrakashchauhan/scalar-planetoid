'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Clock, Users, Award } from 'lucide-react';

type Log = {
    id: number;
    student_name: string;
    event_type: string;
    timestamp: string;
};

type StudentSummary = {
    name: string;
    focusScore: number; // 0-100
    distractions: number;
    lastActive: string;
};

export default function ReportPage({ params }: { params: { sessionCode: string } }) {
    // In a real app we use params.sessionCode. For demo we default to math-101
    const sessionCode = "math-101";
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<StudentSummary[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch logs for this session
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('session_code', sessionCode)
                .order('timestamp', { ascending: true });

            if (data) {
                processLogs(data);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const processLogs = (logs: Log[]) => {
        const students: Record<string, StudentSummary> = {};

        // Simple algorithm:
        // Start with 100 score.
        // Every distraction -> -5 points (just for demo logic).
        // OR Calculate time difference. 
        // Let's do a simple count-based score for robustness if timestamps are messy.
        // "Focus Score = 100 - (Distractions * 5)" (Max min 0)

        logs.forEach(log => {
            if (!students[log.student_name]) {
                students[log.student_name] = {
                    name: log.student_name,
                    focusScore: 100,
                    distractions: 0,
                    lastActive: log.timestamp
                };
            }

            if (log.event_type === 'FOCUS_LOST') {
                students[log.student_name].distractions += 1;
                students[log.student_name].focusScore = Math.max(0, students[log.student_name].focusScore - 10);
            }
            students[log.student_name].lastActive = log.timestamp;
        });

        setSummary(Object.values(students));
    };

    if (loading) return <div className="p-10 text-white">Loading Report...</div>;

    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8">
            <header className="mb-10 border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Class Report: {sessionCode}
                </h1>
                <p className="text-gray-400 mt-2">Engagement Analytics & Focus Scores</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card title="Average Focus" value={`${Math.round(summary.reduce((acc, s) => acc + s.focusScore, 0) / (summary.length || 1))}%`} icon={<BarChart className="text-green-400" />} />
                <Card title="Total Students" value={summary.length} icon={<Users className="text-blue-400" />} />
                <Card title="Active Duration" value="45m" icon={<Clock className="text-purple-400" />} />
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-6">Student Name</th>
                            <th className="p-6">Focus Score</th>
                            <th className="p-6">Distractions</th>
                            <th className="p-6">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {summary.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No activity recorded for this session yet.
                                </td>
                            </tr>
                        ) : (
                            summary.map((student) => (
                                <tr key={student.name} className="hover:bg-white/5 transition-colors">
                                    <td className="p-6 font-medium">{student.name}</td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${student.focusScore > 80 ? 'bg-green-500' : student.focusScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${student.focusScore}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-bold">{student.focusScore}%</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-gray-300">{student.distractions} times</td>
                                    <td className="p-6">
                                        {student.focusScore > 80 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs font-bold"><Award className="size-3" /> Top Student</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Card({ title, value, icon }: { title: string; value: any; icon: any }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm mb-1">{title}</p>
                <h3 className="text-3xl font-bold">{value}</h3>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
                {icon}
            </div>
        </div>
    );
}
