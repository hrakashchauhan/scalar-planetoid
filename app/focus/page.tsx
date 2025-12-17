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
import { DeviceCheckModal } from "@/components/ui/device-check-modal";
import { FaceCalibration } from "@/components/ui/face-calibration";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionTimer } from "@/components/ui/session-timer";
import { VoiceStatus } from "@/components/ui/voice-status";
import { cn } from "@/lib/utils";

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

    // New Air Lock State
    const [stream, setStream] = useState<MediaStream | null>(null);

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                        <Eye className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-2">FocusAI</h1>
                    <p className="text-slate-500">Select your role to begin.</p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={() => { setRole('teacher'); setView('device-check'); }}
                        className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                        <Monitor size={22} className="mr-3" />
                        I am a Teacher
                    </Button>

                    <Button
                        onClick={() => { setRole('student'); setView('device-check'); }}
                        variant="outline"
                        className="w-full h-14 text-lg border-slate-200 text-slate-700 hover:bg-slate-50">
                        <Smartphone size={22} className="mr-3" />
                        I am a Student
                    </Button>
                </div>
            </div>
        </div>
    );

    // TEACHER SETUP
    const renderTeacherSetup = () => (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                    <div className="p-6 bg-indigo-600 flex justify-between items-center text-white">
                        <h2 className="text-xl font-bold">Classroom Setup</h2>
                        <Button variant="ghost" onClick={() => setView('landing')} className="text-white hover:text-white/80 hover:bg-indigo-700">Cancel</Button>
                    </div>
                    <div className="p-8 space-y-6">
                        {/* AI Input Section */}
                        <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-4">
                            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                                <Sparkles size={20} className="text-indigo-600" />
                                AI Question Generator
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-white border border-indigo-200 rounded-xl p-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter topic (e.g. React Hooks)"
                                    value={aiTopicInput}
                                    onChange={e => setAiTopicInput(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <Button
                                    onClick={handleGenerateQuestion}
                                    disabled={isGenerating || !aiTopicInput}
                                    className="bg-indigo-600">
                                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                    Generate
                                </Button>
                            </div>
                        </div>
                        <Button
                            onClick={handleStartSession}
                            size="lg"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 text-lg shadow-lg shadow-emerald-500/20">
                            <Video size={24} className="mr-2" />
                            Go Live
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    // STUDENT LOGIN
    const renderStudentLogin = () => (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Join Class</h2>
                <form onSubmit={handleJoinSession} className="space-y-4">
                    <input
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <input
                        required
                        readOnly
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-500 outline-none cursor-not-allowed"
                        value={roll || "Processing..."}
                    />
                    <input
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest font-mono text-center text-xl"
                        placeholder="CODE"
                        value={sessionCode}
                        onChange={e => setSessionCode(e.target.value.toUpperCase())}
                    />
                    <Button type="submit" className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700">
                        Join with Video
                    </Button>
                </form>
                <Button variant="ghost" onClick={() => setView('landing')} className="mt-4 w-full">Cancel</Button>
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
        case 'device-check': return (
            <DeviceCheckModal
                role={role as 'teacher' | 'student'}
                onComplete={(s) => {
                    setStream(s);
                    if (role === 'student') {
                        setView('face-calibration');
                    } else {
                        setView('teacher-setup');
                    }
                }}
            />
        );
        case 'face-calibration': return (
            <FaceCalibration
                stream={stream!}
                onVerified={(r) => {
                    setRoll(r);
                    setView('student-login');
                }}
            />
        );
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
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden font-sans">
            {/* TOP BAR / HEADER */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Monitor size={20} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">LectureSense <span className="text-indigo-400">Cockpit</span></span>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                    <SessionTimer />
                </div>

                <div className="flex items-center gap-4">
                    <VoiceStatus isListening={isListening} onClick={startListening} />
                    <Button variant="destructive" onClick={onEndSession} className="h-9 text-sm">
                        End Class
                    </Button>
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="flex-1 grid grid-cols-[280px_1fr_320px] overflow-hidden">

                {/* COL 1: MISSION CONTROL (LEFT) */}
                <div className="bg-slate-925 border-r border-slate-800 flex flex-col overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {/* Session Code */}
                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Session Code</p>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-black text-white tracking-widest">{sessionCode}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/focus?code=${sessionCode}`);
                                        alert("Link Copied!");
                                    }}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                    <FileText size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* Topics List */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase px-1">Lesson Plan</h3>
                            {topics.map((t: any) => (
                                <div key={t.id} className={`group p-3 rounded-xl border transition-all ${t.completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-indigo-500/30'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-bold text-slate-200">{t.name}</p>
                                        {t.completed && <CheckCircle size={14} className="text-emerald-500" />}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.question}</p>

                                    {!t.completed && (
                                        <Button
                                            onClick={() => triggerQuestion(t.id)}
                                            size="sm"
                                            className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-500 transition-colors">
                                            Broadcast Question
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* COL 2: STAGE (CENTER) */}
                <div className="bg-black relative flex flex-col">
                    <div className="flex-1 p-2">
                        {/* LiveKit Grids */}
                        <VideoConference />
                    </div>
                    {/* Floating Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-full px-6 py-2 shadow-2xl">
                        <div className="flex items-center gap-4">
                            <div className="w-px h-8 bg-slate-700 mx-2" />
                            <ControlBar variation="minimal" />
                            <RoomAudioRenderer />
                        </div>
                    </div>
                </div>

                {/* COL 3: CO-PILOT (RIGHT) */}
                <div className="bg-slate-925 border-l border-slate-800 flex flex-col text-slate-300">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={16} className="text-purple-400" />
                            <h3 className="font-bold text-slate-200">Co-Pilot Stream</h3>
                        </div>
                        <p className="text-xs text-slate-500">Real-time engagement insights</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                        {logs.length === 0 && (
                            <div className="text-center text-slate-600 italic mt-10">
                                Waiting for class activity...
                            </div>
                        )}
                        {logs.map((l, i) => (
                            <div key={i} className="flex gap-3 animate-in slide-in-from-right-2 duration-300">
                                <span className="text-slate-600 shrink-0">{l.time}</span>
                                <div>
                                    <span className={cn("font-bold", l.user === 'Teacher' ? 'text-indigo-400' : 'text-slate-200')}>{l.user}</span>
                                    <span className="text-slate-400"> {l.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Stats (Placeholder) */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-800 p-2 rounded-lg text-center border border-slate-700">
                                <span className="block text-2xl font-bold text-emerald-400">{logs.filter(l => l.user !== 'Teacher').length}</span>
                                <span className="text-[10px] uppercase text-slate-500 font-bold">Interactions</span>
                            </div>
                            <div className="bg-slate-800 p-2 rounded-lg text-center border border-slate-700">
                                <span className="block text-2xl font-bold text-indigo-400">100%</span>
                                <span className="text-[10px] uppercase text-slate-500 font-bold">Focus Score</span>
                            </div>
                        </div>
                    </div>
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
    const [isFocused, setIsFocused] = useState(true);
    const [handRaised, setHandRaised] = useState(false);

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
            setIsFocused(!isHidden);

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

    const toggleHand = async () => {
        setHandRaised(!handRaised);
        if (room) {
            // Notify teacher (mock data packet)
            const payload = JSON.stringify({
                type: 'HAND_RAISE',
                user: name,
                status: !handRaised
            });
            await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
        }
    };

    return (
        <div className="flex flex-col h-full bg-black relative overflow-hidden group">

            {/* Focus Guardian Overlay - Only visible when NOT focused (simulated by checking isFocused state for UI purposes, though typically this overlay wouldn't be seen if tab is hidden. We use it for 'returning' state or partial overlay if supported) 
                Actually, since visibility API hides the page content, we can show a 'Welcome Back' or warning if they were away. 
                For now, let's use it for 'Active Focus' indicator.
            */}
            {!isFocused && (
                <div className="absolute inset-0 z-[60] bg-orange-500/10 border-[10px] border-orange-500/50 pointer-events-none animate-pulse flex items-center justify-center">
                    <div className="bg-orange-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl">
                        ⚠️ Distraction Detected
                    </div>
                </div>
            )}

            {/* Video Stage */}
            <div className="flex-1 relative">
                <VideoConference />
            </div>

            {/* Immersive Floating Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
                <div className="flex items-center gap-3 px-4 py-2 border-r border-white/10">
                    <div className="bg-emerald-500 h-2 w-2 rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm tracking-wide">{name}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={toggleHand}
                        variant={handRaised ? "default" : "secondary"}
                        className={cn("h-10 w-10 p-0 rounded-xl transition-all", handRaised ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-white/10 hover:bg-white/20 text-white")}
                    >
                        <span className="text-lg">✋</span>
                    </Button>

                    <ControlBar variation="minimal" />

                    <Button variant="destructive" onClick={onLeave} className="h-10 px-4 rounded-xl">
                        Leave Class
                    </Button>
                </div>
            </div>

            <RoomAudioRenderer />

            {/* Quiz Overlay (Immersive) */}
            {quiz && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 p-8 rounded-3xl w-full max-w-lg text-center border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 transform transition-all scale-100">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-500/20 mb-6">
                            <Sparkles size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4">Pop Quiz!</h3>
                        <p className="text-xl text-indigo-200 mb-8 leading-relaxed">{quiz.question}</p>

                        {!feedback && (
                            <div className="space-y-4">
                                <input
                                    autoFocus
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 text-white text-xl placeholder-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/50 transition-all font-medium text-center"
                                    placeholder="Type your answer..."
                                    value={answer}
                                    onChange={e => setAnswer(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                                />
                                <Button onClick={submitAnswer} size="lg" className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-500 font-bold rounded-2xl shadow-lg shadow-indigo-600/25">
                                    Submit Answer
                                </Button>
                            </div>
                        )}

                        {feedback !== null && (
                            <div className="animate-in zoom-in duration-300">
                                {feedback ? (
                                    <div className="flex flex-col items-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                        <CheckCircle size={64} className="text-emerald-500 mb-4" />
                                        <p className="text-2xl font-bold text-emerald-400">Correct!</p>
                                        <p className="text-emerald-200/60 text-sm mt-2">Nice focus!</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center p-6 bg-red-500/10 rounded-2xl border border-red-500/20">
                                        <XCircle size={64} className="text-red-500 mb-4" />
                                        <p className="text-2xl font-bold text-red-400">Not quite.</p>
                                        <p className="text-red-200/60 text-sm mt-2">The answer was: <span className="font-mono">{quiz.answer}</span></p>
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
