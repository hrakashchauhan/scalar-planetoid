'use client';

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { LiveKitRoom, VideoConference, useRoomContext } from "@livekit/components-react";
import { RoomEvent, DataPacket_Kind } from "livekit-client";
import "@livekit/components-styles";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
    const { user } = useUser();
    const [token, setToken] = useState<string>("");
    const roomName = "math-101";

    useEffect(() => {
        if (!user?.fullName) return;

        (async () => {
            try {
                const resp = await fetch(
                    `/api/livekit/token?room=${roomName}&username=${user.fullName}&role=student`
                );
                const data = await resp.json();
                setToken(data.token);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [user]);

    if (!user || !token) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin size-8 text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-900 text-white">
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50">
                    <h2 className="text-lg font-medium">Classroom: Mathematics 101</h2>
                    <div className="flex items-center gap-4">
                        <UserButton showName />
                    </div>
                </header>

                <div className="flex-1 p-4 relative">
                    <LiveKitRoom
                        video={false} // Student enters with video off by default
                        audio={false} // Student enters with audio off by default
                        token={token}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                        data-lk-theme="default"
                        style={{ height: '100%' }}
                    >
                        {/* Student sees the conference */}
                        <VideoConference />
                        {/* Invisible Focus Tracker */}
                        <FocusTracker />
                        {/* Quiz Overlay */}
                        <QuizOverlay />
                    </LiveKitRoom>
                </div>
            </main>
        </div>
    );
}

function QuizOverlay() {
    const room = useRoomContext();
    const [quiz, setQuiz] = useState<any>(null);

    useEffect(() => {
        if (!room) return;
        const handleData = (payload: Uint8Array) => {
            const decoder = new TextDecoder();
            try {
                const msg = JSON.parse(decoder.decode(payload));
                if (msg.type === 'QUIZ_START') {
                    setQuiz(msg);
                }
            } catch (e) { }
        };
        room.on('dataReceived', handleData);
        return () => { room.off('dataReceived', handleData); };
    }, [room]);

    if (!quiz) return null;

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-purple-500/50 p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-bold mb-4 text-white">Pop Quiz!</h3>
                <p className="text-lg mb-6 text-gray-300">{quiz.question}</p>
                <div className="space-y-3">
                    {quiz.options.map((opt: string, i: number) => (
                        <button
                            key={i}
                            onClick={() => {
                                setQuiz(null); // Close on answer
                                // In real app, send answer back using publishData
                            }}
                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-purple-600 hover:border-purple-500 transition-all text-left font-medium"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div className="mt-4 flex justify-between items-center text-xs text-gray-500 uppercase tracking-wider">
                    <span>Time: 30s</span>
                    <span>Topic Check</span>
                </div>
            </div>
        </div>
    );
}

function FocusTracker() {
    const room = useRoomContext();
    const [isFocused, setIsFocused] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            const isVisible = document.visibilityState === 'visible';
            setIsFocused(isVisible);

            if (room) {
                const encoder = new TextEncoder();
                const data = encoder.encode(JSON.stringify({
                    type: isVisible ? 'FOCUS_GAINED' : 'FOCUS_LOST',
                    timestamp: new Date().toISOString()
                }));

                try {
                    // 1. Publish to LiveKit (Real-time for Teacher)
                    await room.localParticipant.publishData(data, {
                        reliable: true,
                        topic: "focus-events"
                    });

                    // 2. Log to Database (Persistent for Report)
                    // We fire and forget this request to not block
                    fetch('/api/activity/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_code: 'math-101', // Should be dynamic
                            student_name: room.localParticipant.identity,
                            event_type: isVisible ? 'FOCUS_GAINED' : 'FOCUS_LOST'
                        })
                    });

                } catch (error) {
                    console.error("Failed to send focus data", error);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [room]);

    return (
        <>
            {!isFocused && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
                    <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                        <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <EyeOff className="size-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-red-500">Distraction Detected</h3>
                        <p className="text-gray-300 max-w-xs">
                            The teacher has been notified that you left the tab. Please return to the class immediately.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
