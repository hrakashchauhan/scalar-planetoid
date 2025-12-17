'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    LiveKitRoom,
    VideoConference,
    useRoomContext,
    ControlBar,
    RoomAudioRenderer,
    LayoutContextProvider,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent, RemoteParticipant, DataPacket_Kind } from "livekit-client";
import {
    Users,
    Clock,
    CheckCircle,
    XCircle,
    Play,
    FileText,
    LogOut,
    Eye,
    EyeOff,
    BarChart,
    Monitor,
    Smartphone,
    Sparkles,
    Loader2,
    Mic,
    MicOff,
    Video,
    VideoOff
} from 'lucide-react';

// --- CONFIGURATION ---
const DEFAULT_TOPICS = [
    { id: 1, name: "Intro to DOM", question: "What object represents the webpage?", answer: "document", completed: false },
    { id: 2, name: "Events", question: "Which method listens for user actions?", answer: "addeventlistener", completed: false },
    { id: 3, name: "Async JS", question: "What object represents a future value?", answer: "promise", completed: false }
];

const TRIGGER_PHRASE = "ask the question";

// Browser Speech Recognition API (with type safety)
const SpeechRecognition = typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

// --- MAIN COMPONENT ---
export default function FocusTrackerPage() {
    // App State
    const [view, setView] = useState('landing');
    const [sessionCode, setSessionCode] = useState('');
    const [token, setToken] = useState('');
    const [role, setRole] = useState<'teacher' | 'student' | null>(null);
    const [name, setName] = useState('');
    const [roll, setRoll] = useState('');

    // Teacher State
    const [topics, setTopics] = useState(DEFAULT_TOPICS);

    // AI State
    const [aiTopicInput, setAiTopicInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // --- HELPERS ---

    // 1. Get Token
    const fetchToken = async (username: string, sessionRoom: string, userRole: 'teacher' | 'student') => {
        try {
            const resp = await fetch(
                `/api/livekit/token?room=${sessionRoom}&username=${username}&role=${userRole}`
            );
            const data = await resp.json();
            return data.token;
        } catch (e) {
            console.error("Token fetch failed", e);
            return null;
        }
    };

    // 2. Start Session (Teacher)
    const handleStartSession = async () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionCode(code);
        const t = await fetchToken("Teacher", code, 'teacher');
        if (t) {
            setToken(t);
            setRole('teacher');
            setName("Teacher");
            setView('teacher-live');
        } else {
            alert("Failed to connect to video server.");
        }
    };

    // 3. Join Session (Student)
    const handleJoinSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !roll || !sessionCode) return;

        // Append Roll to Name for unique ID if needed, or just use name
        const displayName = `${name} (${roll})`;
        const t = await fetchToken(displayName, sessionCode, 'student');

        if (t) {
            setToken(t);
            setRole('student');
            setView('student-live');
        } else {
            alert("Failed to join session. Check code.");
        }
    };

    const handleEndSession = () => {
        setToken('');
        setRole(null);
        setView('teacher-report');
    };

    // Auto-Join from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const codeParam = params.get('code');
        if (codeParam) {
            setSessionCode(codeParam);
            setView('student-login');
        }
    }, []);

    // AI Generation Logic
    const handleGenerateQuestion = async () => {
        if (!aiTopicInput) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/groq/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: aiTopicInput })
            });
            const data = await res.json();
            if (data.question) {
                setTopics(prev => [...prev, {
                    id: Date.now(),
                    name: aiTopicInput,
                    question: data.question,
                    answer: data.answer,
                    completed: false
                }]);
                setAiTopicInput('');
            }
        } catch (error) {
            console.error(error);
            alert("AI Generation Failed. Check API Key.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- VIEWS ---

    // LANDING
    const renderLanding = () => (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <Eye className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2">LectureSense</h1>
                    <p className="text-purple-200">50-Student Real-Time Proctoring</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => setView('teacher-setup')}
                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/25">
                        <Monitor size={22} />
                        Start as Teacher
                    </button>

                    <button
                        onClick={() => setView('student-login')}
                        className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all">
                        <Smartphone size={22} />
                        Join as Student
                    </button>
                </div>
            </div>
        </div>
    );

    // TEACHER SETUP
    const renderTeacherSetup = () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Classroom Setup</h2>
                        <button onClick={() => setView('landing')} className="text-white/70 hover:text-white">Cancel</button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* AI Input */}
                        <div className="border border-purple-500/30 p-6 rounded-2xl bg-purple-500/10 space-y-4">
                            <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                                <Sparkles size={20} className="text-purple-400" />
                                AI Question Generator
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500"
                                    placeholder="Enter topic (e.g. React Hooks)"
                                    value={aiTopicInput}
                                    onChange={e => setAiTopicInput(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleGenerateQuestion}
                                    disabled={isGenerating || !aiTopicInput}
                                    className="bg-purple-600 px-4 rounded-xl font-bold text-white disabled:opacity-50 flex items-center gap-2">
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                    Generate
                                </button>
                            </div>
                        </div>

                        {/* Review Topics */}
                        <div className="border border-purple-500/30 p-6 rounded-2xl bg-purple-500/10 space-y-4">
                            <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                                <Sparkles size={20} className="text-purple-400" />
                                Review Topics
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {topics.map((t, idx) => (
                                    <div key={t.id} className="text-sm text-white/80 border-b border-white/10 pb-2">
                                        {idx + 1}. {t.name} (Q: {t.question})
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleStartSession}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 transition-all">
                            <Video size={20} />
                            Go Live (Video & Audio)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // STUDENT LOGIN
    const renderStudentLogin = () => (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Join Class</h2>
                <form onSubmit={handleJoinSession} className="space-y-4">
                    <input
                        required
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500"
                        placeholder="Your Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <input
                        required
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500"
                        placeholder="Roll Number"
                        value={roll}
                        onChange={e => setRoll(e.target.value)}
                    />
                    <input
                        required
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500 uppercase tracking-widest font-mono text-center text-xl"
                        placeholder="CODE"
                        value={sessionCode}
                        onChange={e => setSessionCode(e.target.value.toUpperCase())}
                    />
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-500/25">
                        Join with Video
                    </button>
                </form>
                <button onClick={() => setView('landing')} className="mt-4 w-full text-sm text-purple-300 hover:text-white">Cancel</button>
            </div>
        </div>
    );

    // TEACHER LIVE (WITH LIVEKIT)
    const renderTeacherLive = () => (
        <div className="h-screen bg-slate-950 flex flex-col">
            {token && (
                <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                    data-lk-theme="default"
                    style={{ height: '100%' }}
                >
                    <TeacherRoomInner
                        sessionCode={sessionCode}
                        topics={topics}
                        setTopics={setTopics}
                        onEndSession={handleEndSession}
                    />
                </LiveKitRoom>
            )}
        </div>
    );

    // STUDENT LIVE (WITH LIVEKIT)
    const renderStudentLive = () => (
        <div className="h-screen bg-slate-950 flex flex-col">
            {token && (
                <LiveKitRoom
                    video={true}  // Students can send video
                    audio={false} // Students start mute usually
                    token={token}
                    serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                    data-lk-theme="default"
                    style={{ height: '100%' }}
                >
                    <StudentRoomInner
                        name={name}
                        roll={roll}
                        sessionCode={sessionCode}
                        onLeave={handleEndSession}
                    />
                </LiveKitRoom>
            )}
        </div>
    );

    // REPORT
    const renderTeacherReport = () => (
        <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-4">Class Ended</h1>
                <p className="text-slate-400 mb-8">Go to the main dashboard to view the full analytics.</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => setView('landing')} className="text-purple-400 hover:underline">Return Home</button>
                    <a href={`/teacher/report?code=${sessionCode}`} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-500">
                        View Full Report
                    </a>
                </div>
            </div>
        </div>
    );

    // ROUTER
    switch (view) {
        case 'landing': return renderLanding();
        case 'teacher-setup': return renderTeacherSetup();
        case 'teacher-live': return renderTeacherLive();
        case 'teacher-report': return renderTeacherReport();
        case 'student-login': return renderStudentLogin();
        case 'student-live': return renderStudentLive();
        default: return renderLanding();
    }
}

// --- INNER COMPONENTS (WITH LIVEKIT CONTEXT) ---

function TeacherRoomInner({ sessionCode, topics, setTopics, onEndSession }: any) {
    const room = useRoomContext();
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // Voice Recognition Logic
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const addLog = (user: string, action: string) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), user, action }, ...prev]);
    };

    // --- BROADCAST HELPERS ---
    const broadcastQuiz = useCallback(async (question: any) => {
        if (!room) return;
        const encoder = new TextEncoder();
        const payload = JSON.stringify({
            type: 'QUIZ_START',
            question: question.question,
            answer: question.answer, // sending answer for optimistic client check (in secure app, keep on server)
            timestamp: Date.now()
        });
        await room.localParticipant.publishData(encoder.encode(payload), { reliable: true });
        addLog("Teacher", `Sent Question: ${question.question}`);
    }, [room]);

    const triggerQuestion = (topicId: number) => {
        const topic = topics.find((t: any) => t.id === topicId);
        if (topic) {
            setActiveQuestion(topic);
            broadcastQuiz(topic);
            setTopics((prev: any) => prev.map((t: any) => t.id === topicId ? { ...t, completed: true } : t));
        }
    };

    // Voice Trigger
    const startListening = () => {
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            if (transcript.includes(TRIGGER_PHRASE)) {
                // Find next pending
                const next = topics.find((t: any) => !t.completed);
                if (next) triggerQuestion(next.id);
            }
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
        setIsListening(true);
    };

    return (
        <div className="flex h-full text-white">
            {/* Sidebar */}
            <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <div className="bg-purple-600/20 text-purple-200 p-3 rounded-xl border border-purple-600/30 text-center">
                        <p className="text-xs uppercase font-bold">Code</p>
                        <p className="text-3xl font-black">{sessionCode}</p>
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/focus?code=${sessionCode}`;
                                navigator.clipboard.writeText(url);
                                alert("Link Copied!");
                            }}
                            className="mt-2 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-full font-bold transition-all w-full">
                            Copy Join Link
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase">Topics</h3>
                        {topics.map((t: any) => (
                            <div key={t.id} className={`p-3 rounded-lg border ${t.completed ? 'border-green-500/30 bg-green-900/20' : 'border-slate-700 bg-slate-800'}`}>
                                <p className="text-sm font-bold">{t.name}</p>
                                <p className="text-xs text-slate-400 mb-2 truncate">{t.question}</p>
                                {!t.completed && (
                                    <button
                                        onClick={() => triggerQuestion(t.id)}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 rounded font-bold">
                                        Ask Now
                                    </button>
                                )}
                                {t.completed && <p className="text-xs text-green-400 font-mono">Completed</p>}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={startListening}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        {isListening ? "Listening..." : "Enable Voice Command"}
                    </button>

                    <div className="bg-black p-2 rounded text-xs font-mono h-32 overflow-y-auto text-green-400">
                        {logs.map((l, i) => <div key={i}>[{l.time}] {l.action}</div>)}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700">
                    <button onClick={onEndSession} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold">End Class</button>
                </div>
            </div>

            {/* Main Video Grid */}
            <div className="flex-1 bg-slate-950 relative flex flex-col">
                <div className="flex-1 p-4">
                    <VideoConference />
                </div>
                <div className="h-16 bg-slate-900/50 backdrop-blur border-t border-slate-700 flex items-center justify-center p-2">
                    <ControlBar variation="minimal" />
                    <RoomAudioRenderer />
                </div>
            </div>

            {/* Student Focus Tracker (Hidden overlay logic) */}
            <TeacherFocusListener onEvent={(e) => addLog(e.user, e.status)} />
        </div>
    );
}


function StudentRoomInner({ name, roll, sessionCode, onLeave }: any) {
    const room = useRoomContext();
    const [quiz, setQuiz] = useState<any>(null);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState<any>(null);

    // 1. Listen for Quizzes
    useEffect(() => {
        if (!room) return;
        const handleData = (payload: Uint8Array) => {
            try {
                const str = new TextDecoder().decode(payload);
                const msg = JSON.parse(str);
                if (msg.type === 'QUIZ_START') {
                    setQuiz(msg);
                    setFeedback(null);
                    setAnswer('');
                }
            } catch (e) { }
        };
        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);

    // 2. Focus Tracking
    useEffect(() => {
        const handleVisChange = () => {
            const isHidden = document.hidden;
            // Send to Teacher
            if (room) {
                const payload = JSON.stringify({
                    type: isHidden ? 'FOCUS_LOST' : 'FOCUS_GAINED',
                    user: name
                });
                room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
            }
            // Send to DB
            fetch('/api/activity/log', {
                method: 'POST',
                body: JSON.stringify({
                    session_code: sessionCode,
                    student_name: name,
                    event_type: isHidden ? 'FOCUS_LOST' : 'FOCUS_GAINED'
                })
            });
        };
        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [room, name, sessionCode]);

    const submitAnswer = async () => {
        if (!quiz) return;
        const isCorrect = answer.toLowerCase().trim() === quiz.answer.toLowerCase();
        setFeedback(isCorrect);

        await fetch('/api/quiz/submit', {
            method: 'POST',
            body: JSON.stringify({
                session_code: sessionCode,
                student_name: name,
                question: quiz.question,
                answer_given: answer,
                is_correct: isCorrect
            })
        });

        setTimeout(() => setQuiz(null), 3000); // Close after 3s
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 relative">
            <div className="flex-1 p-4">
                <VideoConference />
            </div>
            <div className="h-16 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-6">
                <div className="text-white font-bold">{name} ({roll})</div>
                <ControlBar variation="minimal" />
                <button onClick={onLeave} className="bg-red-500/20 text-red-500 px-4 py-2 rounded font-bold">Leave</button>
            </div>
            <RoomAudioRenderer />

            {/* Quiz Overlay */}
            {quiz && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
                    <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-md text-center border border-purple-500 shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-4">Quick Check!</h3>
                        <p className="text-lg text-purple-200 mb-6">{quiz.question}</p>

                        {!feedback && (
                            <>
                                <input
                                    autoFocus
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-lg mb-4"
                                    placeholder="Type answer..."
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                />
                                <button onClick={submitAnswer} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl">
                                    Submit
                                </button>
                            </>
                        )}

                        {feedback !== null && (
                            <div className="animate-in zoom-in">
                                {feedback ? (
                                    <div className="text-green-500 flex flex-col items-center">
                                        <CheckCircle size={64} />
                                        <p className="text-xl font-bold mt-2">Correct!</p>
                                    </div>
                                ) : (
                                    <div className="text-red-500 flex flex-col items-center">
                                        <XCircle size={64} />
                                        <p className="text-xl font-bold mt-2">Incorrect!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface FocusEvent {
    user: string;
    status: string;
}

function TeacherFocusListener({ onEvent }: { onEvent: (event: FocusEvent) => void }) {
    const room = useRoomContext();
    useEffect(() => {
        if (!room) return;
        const handle = (payload: Uint8Array) => {
            try {
                const msg = JSON.parse(new TextDecoder().decode(payload));
                if (msg.type === 'FOCUS_LOST' || msg.type === 'FOCUS_GAINED') {
                    onEvent({ user: msg.user, status: msg.type === 'FOCUS_LOST' ? 'Lost Focus' : 'Regained Focus' });
                }
            } catch (e) { }
        };
        room.on(RoomEvent.DataReceived, handle);
        return () => { room.off(RoomEvent.DataReceived, handle); };
    }, [room, onEvent]);
    return null;
}
