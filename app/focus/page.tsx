'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Users,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
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
    MicOff
} from 'lucide-react';

// --- CONFIGURATION ---
const DEFAULT_TOPICS = [
    { id: 1, name: "Intro to DOM", question: "What object represents the webpage?", answer: "document", completed: false },
    { id: 2, name: "Events", question: "Which method listens for user actions?", answer: "addeventlistener", completed: false },
    { id: 3, name: "Async JS", question: "What object represents a future value?", answer: "promise", completed: false }
];

const MOCK_STUDENTS = [
    { roll: "101", name: "Alice", status: "Online", focusScore: 100, joinTime: "10:00 AM" },
    { roll: "102", name: "Bob", status: "Offline", focusScore: 40, joinTime: "10:02 AM" },
    { roll: "103", name: "Charlie", status: "Online", focusScore: 85, joinTime: "10:05 AM" },
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

    // Teacher State
    const [topics, setTopics] = useState(DEFAULT_TOPICS);
    const [students, setStudents] = useState<any[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

    // AI State
    const [aiTopicInput, setAiTopicInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Student State
    const [studentInfo, setStudentInfo] = useState({ name: '', roll: '' });
    const [studentStatus, setStudentStatus] = useState('Online');
    const [answerInput, setAnswerInput] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);

    // Voice Recognition State
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // --- HELPERS ---
    const generateSession = () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionCode(code);
        setView('teacher-live');
        setStudents(MOCK_STUDENTS);
        addLog("System", "Session Started. Waiting for students...");
    };

    const addLog = (user: string, action: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [{ time: timestamp, user, action }, ...prev]);
    };

    const getNextTopicId = useCallback(() => {
        const nextTopic = topics.find(t => !t.completed);
        return nextTopic ? nextTopic.id : null;
    }, [topics]);

    // --- TEACHER ACTIONS ---
    const triggerQuestion = (topicId: number) => {
        const topic = topics.find(t => t.id === topicId);
        if (!topic) return;

        setActiveQuestion({ ...topic, endTime: Date.now() + 30000 });
        addLog("Teacher", `Started Topic: ${topic.name}`);
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, completed: true } : t));

        // Reset student feedback for new question
        setFeedback(null);
        setAnswerInput('');
    };

    const handleTriggerNextQuestion = useCallback(() => {
        if (activeQuestion) return;

        const nextId = getNextTopicId();
        if (nextId) {
            triggerQuestion(nextId);
        } else {
            addLog("System", "No pending questions to trigger.");
        }
    }, [activeQuestion, getNextTopicId]);

    const closeQuestion = () => {
        setActiveQuestion(null);
        addLog("System", "Question time ended.");
    };

    const endSession = () => {
        if (isListening) stopListening();
        setView('teacher-report');
    };

    // --- VOICE RECOGNITION ---
    const setupRecognition = useCallback(() => {
        if (!SpeechRecognition) {
            setVoiceError("Web Speech API not supported in this browser.");
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            addLog("Voice System", `Heard: "${transcript}"`);

            if (transcript.includes(TRIGGER_PHRASE)) {
                addLog("Voice System", `✅ Trigger Phrase Detected!`);
                handleTriggerNextQuestion();
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                setVoiceError("Microphone access blocked.");
            } else if (event.error !== 'no-speech') {
                setVoiceError(`Error: ${event.error}`);
            }
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        return recognition;
    }, [handleTriggerNextQuestion]);

    const startListening = useCallback(() => {
        if (!SpeechRecognition || isListening) return;

        let recognition = recognitionRef.current;
        if (!recognition) recognition = setupRecognition();
        if (!recognition) return;

        try {
            recognition.start();
            setIsListening(true);
            setVoiceError(null);
            addLog("Voice System", "Listening started...");
        } catch (e: any) {
            if (!e.message.includes('already started')) {
                setVoiceError("Could not start microphone.");
                setIsListening(false);
            }
        }
    }, [isListening, setupRecognition]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            addLog("Voice System", "Listening stopped.");
        }
    }, [isListening]);

    // Auto-restart listening
    useEffect(() => {
        if (view === 'teacher-live' && !isListening && !voiceError) {
            const timer = setTimeout(startListening, 1000);
            return () => clearTimeout(timer);
        }
    }, [view, isListening, voiceError, startListening]);

    // --- STUDENT ACTIONS ---
    const joinSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionCode) {
            addLog("Error", "Please generate a session first.");
            return;
        }
        const newStudent = {
            roll: studentInfo.roll,
            name: studentInfo.name,
            status: "Online",
            focusScore: 100,
            joinTime: new Date().toLocaleTimeString()
        };
        setStudents(prev => [...prev, newStudent]);
        addLog(studentInfo.name, "Joined the session");
        setView('student-live');
    };

    const submitAnswer = async () => {
        if (!activeQuestion) return;

        const isCorrect = answerInput.toLowerCase().trim() === activeQuestion.answer.toLowerCase();
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        addLog(studentInfo.name, `Submitted: ${answerInput} (${isCorrect ? '✓' : '✗'})`);

        setStudents(prev => prev.map(s =>
            s.roll === studentInfo.roll
                ? { ...s, focusScore: isCorrect ? s.focusScore : Math.max(0, s.focusScore - 10) }
                : s
        ));

        // Persist to database
        try {
            await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_code: sessionCode,
                    student_name: studentInfo.name,
                    question: activeQuestion.question,
                    answer_given: answerInput,
                    is_correct: isCorrect
                })
            });
        } catch (e) {
            console.error("Failed to save quiz response", e);
        }
    };

    // Focus Detection
    useEffect(() => {
        if (view !== 'student-live') return;

        const handleVisibilityChange = async () => {
            const isDistracted = document.hidden;
            setStudentStatus(isDistracted ? 'Distracted' : 'Online');
            addLog(studentInfo.name, isDistracted ? "Lost focus" : "Regained focus");

            setStudents(prev => prev.map(s =>
                s.roll === studentInfo.roll
                    ? { ...s, status: isDistracted ? "Distracted" : "Online", focusScore: isDistracted ? Math.max(0, s.focusScore - 5) : s.focusScore }
                    : s
            ));

            // Persist to database
            try {
                await fetch('/api/activity/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_code: sessionCode,
                        student_name: studentInfo.name,
                        event_type: isDistracted ? 'FOCUS_LOST' : 'FOCUS_GAINED'
                    })
                });
            } catch (e) {
                console.error("Failed to log activity", e);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [view, studentInfo.name, studentInfo.roll, sessionCode]);

    // --- VIEWS ---
    const renderLanding = () => (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <Eye className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2">FocusTracker</h1>
                    <p className="text-purple-200">Real-time Lecture Engagement System</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => setView('teacher-setup')}
                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/25">
                        <Monitor size={22} />
                        Start as Teacher
                    </button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/20"></span>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-purple-300">or</span>
                        </div>
                    </div>

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

    const renderTeacherSetup = () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Session Setup</h2>
                        <button onClick={() => setView('landing')} className="text-white/70 hover:text-white">Cancel</button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="border border-purple-500/30 p-6 rounded-2xl bg-purple-500/10 space-y-4">
                            <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                                <Sparkles size={20} className="text-purple-400" />
                                AI Question Generator
                            </h3>
                            <p className="text-sm text-purple-200/70">Enter a topic name and AI will generate a quick-check question.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500 transition"
                                    placeholder="E.g., CSS Grid Layout"
                                    value={aiTopicInput}
                                    onChange={e => setAiTopicInput(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={() => {
                                        if (!aiTopicInput) return;
                                        setTopics(prev => [...prev, {
                                            id: Date.now(),
                                            name: aiTopicInput,
                                            question: `What is the key concept of ${aiTopicInput}?`,
                                            answer: aiTopicInput.toLowerCase().split(' ')[0],
                                            completed: false
                                        }]);
                                        setAiTopicInput('');
                                        addLog("System", `Added topic: ${aiTopicInput}`);
                                    }}
                                    disabled={!aiTopicInput || isGenerating}
                                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-500 disabled:bg-gray-600 transition flex items-center justify-center gap-2 shrink-0"
                                >
                                    <Sparkles size={20} /> Add Topic
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-purple-300 mb-3">Prepared Topics</label>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {topics.map((t, idx) => (
                                    <div key={t.id} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <span className="bg-purple-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">{t.name}</p>
                                            <p className="text-sm text-purple-200/70">Q: {t.question}</p>
                                            <p className="text-xs text-green-400 font-mono mt-1">Ans: {t.answer}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={generateSession}
                            disabled={topics.length === 0}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:from-gray-600 disabled:to-gray-700 shadow-lg shadow-green-500/25 transition-all">
                            <Play size={20} />
                            Generate Session & Start
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTeacherLive = () => (
        <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
            {/* Sidebar */}
            <div className="w-full lg:w-80 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
                <div className="mb-6">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl">
                        <p className="text-xs text-purple-200 font-semibold uppercase tracking-wider">Class Code</p>
                        <p className="text-4xl font-black text-white tracking-widest">{sessionCode}</p>
                    </div>
                </div>

                {/* Voice Status */}
                <div className="mb-6">
                    <div className={`p-4 rounded-2xl flex items-center gap-3 ${isListening ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                        {isListening ? <Mic className="text-green-400" size={24} /> : <MicOff className="text-red-400" size={24} />}
                        <div>
                            <p className="font-bold text-sm text-white">Voice Commands</p>
                            <p className="text-xs text-slate-400">
                                {isListening ? `Say: "${TRIGGER_PHRASE}"` : voiceError || 'Mic OFF'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Live Attendance */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Attendance</h2>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{students.length} Online</span>
                    </div>
                    <div className="space-y-2">
                        {students.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${s.status === 'Online' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{s.name}</p>
                                        <p className="text-xs text-slate-400">Roll: {s.roll}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {s.status === 'Distracted' && <span className="text-xs text-red-400 flex items-center gap-1"><EyeOff size={12} /> Lost</span>}
                                    {s.status === 'Online' && <span className="text-xs text-green-400 flex items-center gap-1"><Eye size={12} /> Focus</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Log */}
                <div>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Activity Log</h2>
                    <div className="bg-black rounded-xl p-3 text-xs font-mono h-48 overflow-y-auto border border-slate-700">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-green-400">
                                <span className="opacity-50">[{log.time}]</span> <span className="font-bold text-purple-400">{log.user}:</span> {log.action}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
                        <p className="text-slate-400">Manage topics and monitor engagement</p>
                    </div>
                    <button onClick={endSession} className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl hover:bg-red-500/30 flex items-center gap-2 font-bold">
                        <LogOut size={18} /> End Class
                    </button>
                </header>

                {activeQuestion ? (
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 shadow-2xl text-center animate-pulse">
                        <h2 className="text-3xl font-bold text-white mb-2">Question Active!</h2>
                        <p className="text-purple-100 text-xl mb-6">{activeQuestion.question}</p>
                        <button onClick={closeQuestion} className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full hover:bg-purple-100 transition">
                            Close & Continue
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-300">Lecture Roadmap</h3>
                        {topics.map((topic) => (
                            <div key={topic.id} className={`p-6 rounded-2xl border transition-all ${topic.completed ? 'border-green-500/30 bg-green-500/10' : 'border-slate-700 bg-slate-800 hover:border-purple-500/50'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${topic.completed ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {topic.completed ? 'Done' : 'Pending'}
                                            </span>
                                            <h4 className="text-xl font-bold text-white">{topic.name}</h4>
                                        </div>
                                        <p className="text-slate-400">Q: {topic.question}</p>
                                    </div>

                                    {!topic.completed && (
                                        <button
                                            onClick={() => triggerQuestion(topic.id)}
                                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2">
                                            <CheckCircle size={20} />
                                            Ask Now
                                        </button>
                                    )}
                                    {topic.completed && <CheckCircle className="text-green-500" size={32} />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Debug Toggle */}
            <div className="fixed bottom-4 right-4">
                <button onClick={() => setView('student-login')} className="bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-lg hover:text-white transition">
                    → Student View
                </button>
            </div>
        </div>
    );

    const renderTeacherReport = () => (
        <div className="min-h-screen bg-slate-900 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Post-Lecture Report</h1>
                    <button onClick={() => setView('landing')} className="text-purple-400 hover:text-purple-300">← Back to Home</button>
                </div>

                <div className="bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
                    <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-700 flex justify-between">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <BarChart size={18} /> Engagement Analytics
                        </h2>
                        <span className="text-sm text-slate-400">Session: {sessionCode}</span>
                    </div>

                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-700/30 text-slate-400 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Roll No</th>
                                <th className="px-6 py-4">Join Time</th>
                                <th className="px-6 py-4">Focus Score</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {students.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-700/30">
                                    <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                                    <td className="px-6 py-4 text-slate-400">{s.roll}</td>
                                    <td className="px-6 py-4 text-slate-400">{s.joinTime}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 bg-slate-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full ${s.focusScore > 80 ? 'bg-green-500' : s.focusScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.focusScore}%` }}></div>
                                            </div>
                                            <span className="text-sm font-bold text-white">{s.focusScore}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.focusScore > 75 ? (
                                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold">High Focus</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-bold">Needs Attention</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {students.length === 0 && <div className="p-8 text-center text-slate-500">No student data recorded.</div>}
                </div>
            </div>
        </div>
    );

    const renderStudentLogin = () => (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Join Classroom</h2>
                <form onSubmit={joinSession} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-1">Your Name</label>
                        <input
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500"
                            placeholder="e.g. John Doe"
                            value={studentInfo.name}
                            onChange={e => setStudentInfo({ ...studentInfo, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-1">Roll Number</label>
                        <input
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500"
                            placeholder="e.g. 101"
                            value={studentInfo.roll}
                            onChange={e => setStudentInfo({ ...studentInfo, roll: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-1">Session Code</label>
                        <input
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder-white/50 outline-none focus:border-purple-500 uppercase tracking-widest font-mono text-center text-xl"
                            placeholder="ABC123"
                            value={sessionCode}
                            onChange={e => setSessionCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-500/25">
                        Enter Class
                    </button>
                </form>
                <button onClick={() => setView('landing')} className="mt-4 w-full text-sm text-purple-300 hover:text-white">Cancel</button>
            </div>
        </div>
    );

    const renderStudentLive = () => {
        const showQuestion = activeQuestion && !feedback;
        const showFeedback = activeQuestion && feedback;
        const isIdle = !activeQuestion;

        return (
            <div className="min-h-screen bg-slate-900 flex flex-col">
                {/* Header */}
                <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-white">{studentInfo.name}</h1>
                        <p className="text-xs text-slate-400">{studentInfo.roll} • {sessionCode}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${studentStatus === 'Online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${studentStatus === 'Online' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        {studentStatus === 'Online' ? 'Focused' : 'Distracted'}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center p-6 relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                        <FileText size={200} className="text-white" />
                    </div>

                    {isIdle && (
                        <div className="text-center">
                            <div className="animate-pulse mb-6">
                                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <Monitor size={48} className="text-purple-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-semibold text-white">Listening to Lecture...</h2>
                            <p className="text-slate-400 mt-2 max-w-sm mx-auto">Stay on this tab. Leaving will affect your engagement score.</p>
                        </div>
                    )}

                    {showQuestion && (
                        <div className="bg-slate-800 w-full max-w-md p-8 rounded-3xl shadow-2xl border-t-4 border-purple-500">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Quick Check</span>
                                <div className="flex items-center text-red-400 gap-1 text-sm font-mono">
                                    <Clock size={16} /> 00:30
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-6">{activeQuestion.question}</h3>

                            <input
                                autoFocus
                                className="w-full text-lg p-4 bg-slate-700 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 mb-4 focus:border-purple-500 outline-none transition"
                                placeholder="Type one word answer..."
                                value={answerInput}
                                onChange={e => setAnswerInput(e.target.value)}
                            />

                            <button
                                onClick={submitAnswer}
                                disabled={!answerInput}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white text-lg font-bold py-4 rounded-xl hover:from-purple-500 hover:to-blue-500 transition shadow-lg">
                                Submit Answer
                            </button>
                        </div>
                    )}

                    {showFeedback && (
                        <div className="text-center">
                            {feedback === 'correct' ? (
                                <div className="bg-green-500/20 p-10 rounded-full inline-block mb-4">
                                    <CheckCircle size={80} className="text-green-500" />
                                </div>
                            ) : (
                                <div className="bg-red-500/20 p-10 rounded-full inline-block mb-4">
                                    <XCircle size={80} className="text-red-500" />
                                </div>
                            )}
                            <h2 className="text-3xl font-bold text-white">
                                {feedback === 'correct' ? 'Excellent!' : 'Keep Listening!'}
                            </h2>
                            <p className="text-slate-400 mt-2">Waiting for next topic...</p>
                        </div>
                    )}
                </div>

                {/* Debug Toggle */}
                <div className="fixed bottom-4 right-4">
                    <button onClick={() => setView('teacher-live')} className="bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-lg hover:text-white transition">
                        ← Teacher View
                    </button>
                </div>
            </div>
        );
    };

    // --- ROUTER ---
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
