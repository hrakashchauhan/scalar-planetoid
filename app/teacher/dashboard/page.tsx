'use client';

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Mic, Video, Users, Activity, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
    const { user } = useUser();
    const [token, setToken] = useState<string>("");
    const roomName = "math-101"; // Hardcoded for demo, normally dynamic

    useEffect(() => {
        if (!user?.fullName) return;

        // Fetch token
        (async () => {
            try {
                const resp = await fetch(
                    `/api/livekit/token?room=${roomName}&username=${user.fullName}&role=teacher`
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
                <Loader2 className="animate-spin size-8 text-purple-500" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-900 text-white">
            {/* Sidebar Controls */}
            <aside className="w-64 border-r border-white/10 bg-black/50 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-8">
                    <Activity className="text-purple-500" />
                    <h1 className="font-bold">LectureSense</h1>
                </div>

                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Class Status</h2>
                    <div className="flex items-center gap-2 text-green-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-sm font-medium">Live Now</span>
                    </div>
                </div>

                <div className="mt-auto">
                    <UserButton showName />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-6">
                    <h2 className="text-lg font-medium">Mathematics 101</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            <a href="/teacher/report" className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors">
                                End Class
                            </a>
                            <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400">
                                Session Code: <span className="text-white font-mono">{roomName}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4">
                    <LiveKitRoom
                        video={true}
                        audio={true}
                        token={token}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                        data-lk-theme="default"
                        style={{ height: '100%' }}
                    >
                        <VideoConference />
                        <RoomEventsAdapter />
                        <VoiceCommandManager />
                    </LiveKitRoom>
                </div>
            </main>
        </div>
    );
}

function VoiceCommandManager() {
    const room = useRoomContext();
    const [isListening, setIsListening] = useState(false);
    const [lastTranscript, setLastTranscript] = useState("");

    useEffect(() => {
        // Start listening to the microphone for Deepgram
        // We need to get the media stream from the browser, duplicate it, and send to DG.
        // LiveKit already asks for the mic. We can leverage the same stream or request a new one.
        // For simplicity, let's request a separate stream for the "AI Ear" to avoid interfering with LiveKit.

        let mediaRecorder: MediaRecorder | null = null;
        let socket: WebSocket | null = null;

        const startDeepgram = async () => {
            try {
                const keyResp = await fetch('/api/deepgram/key');
                const { key } = await keyResp.json();

                if (!key) return;

                // Open Mic
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Connect to Deepgram
                socket = new WebSocket('wss://api.deepgram.com/v1/listen?tier=nova-2&language=en&smart_format=true', [
                    'token',
                    key,
                ]);

                socket.onopen = () => {
                    setIsListening(true);
                    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    mediaRecorder.addEventListener('dataavailable', event => {
                        if (event.data.size > 0 && socket?.readyState === 1) {
                            socket.send(event.data);
                        }
                    });
                    mediaRecorder.start(250); // Send chunks every 250ms
                };

                socket.onmessage = (message) => {
                    const received = JSON.parse(message.data);
                    const transcript = received.channel?.alternatives[0]?.transcript;
                    if (transcript && received.is_final) {
                        setLastTranscript(transcript);
                        console.log("Transcript:", transcript);

                        // COMMAND DETECTION LOGIC
                        const lower = transcript.toLowerCase();
                        if (lower.includes("topic finished") || lower.includes("ask question") || lower.includes("next question")) {
                            triggerQuiz(room);
                        }
                    }
                };
            } catch (e) {
                console.error("Deepgram Error", e);
            }
        };

        // Only start if we are in the room
        if (room?.state === 'connected') {
            startDeepgram();
        }

        return () => {
            if (mediaRecorder) mediaRecorder.stop();
            if (socket) socket.close();
            setIsListening(false);
        };
    }, [room, room?.state]);

    const triggerQuiz = async (room: any) => {
        if (!room) return;
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
            type: 'QUIZ_START',
            question: "What is the result of 2 + 2?",
            options: ["3", "4", "5", "Infinite"],
            correct: 1,
            timestamp: new Date().toISOString()
        }));

        await room.localParticipant.publishData(data, { reliable: true, topic: "quiz-events" });
        alert("🎤 Voice Command Detected: Sending Quiz to Students!");
    };

    return (
        <div className="absolute bottom-4 left-4 z-50">
            <div className={cn("px-4 py-2 rounded-full flex items-center gap-2 border transition-colors",
                isListening ? "bg-purple-500/20 border-purple-500/50 text-purple-200" : "bg-gray-800/80 border-gray-700 text-gray-500"
            )}>
                <Mic className={cn("size-4", isListening && "animate-pulse")} />
                <span className="text-sm font-medium">
                    {isListening ? "AI Listening..." : "AI Connecting..."}
                </span>
                {lastTranscript && (
                    <span className="text-xs text-purple-300 max-w-[200px] truncate ml-2 opacity-70">
                        "{lastTranscript}"
                    </span>
                )}
            </div>
        </div>
    );
}

function RoomEventsAdapter() {
    const room = useRoomContext();
    const [events, setEvents] = useState<{ identity: string; status: 'focused' | 'distracted' }[]>([]);

    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array, participant?: any) => {
            const decoder = new TextDecoder();
            const str = decoder.decode(payload);
            try {
                const data = JSON.parse(str);
                if (data.type === 'FOCUS_LOST' || data.type === 'FOCUS_GAINED') {
                    const identity = participant?.identity || "Unknown";
                    setEvents(prev => {
                        const others = prev.filter(e => e.identity !== identity);
                        return [...others, { identity, status: data.type === 'FOCUS_LOST' ? 'distracted' : 'focused' }];
                    });
                }
            } catch (e) {
                console.error("Failed to parse data", e);
            }
        };

        room.on('dataReceived', handleData);
        return () => {
            room.off('dataReceived', handleData);
        };
    }, [room]);

    return (
        <div className="absolute top-4 right-4 z-50 w-80">
            <div className="bg-black/80 backdrop-blur border border-white/10 rounded-xl p-4 shadow-xl">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 text-xs tracking-wider">Student Focus Live</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {events.length === 0 && <p className="text-xs text-gray-600">No active students...</p>}
                    {events.map((evt) => (
                        <div key={evt.identity} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-sm font-medium">{evt.identity}</span>
                            {evt.status === 'focused' ? (
                                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                    <Eye className="size-3" /> Focused
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 roundeded">
                                    <EyeOff className="size-3" /> Distracted
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
