import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Video, VideoOff, MicOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DeviceCheckModalProps {
    onComplete: (stream: MediaStream) => void;
    role: 'teacher' | 'student';
}

export function DeviceCheckModal({ onComplete, role }: DeviceCheckModalProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [audioLevel, setAudioLevel] = useState(0);

    useEffect(() => {
        // Determine constraints based on role - students might need lower res to save bandwidth?
        // meaningful difference: maybe later.
        const constraints = {
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(s => {
                setStream(s);
                setHasPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }

                // Simple Audio Meter
                const audioContext = new AudioContext();
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(s);
                const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

                analyser.smoothingTimeConstant = 0.8;
                analyser.fftSize = 1024;

                microphone.connect(analyser);
                analyser.connect(javascriptNode);
                javascriptNode.connect(audioContext.destination);

                javascriptNode.onaudioprocess = () => {
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    let values = 0;
                    const length = array.length;
                    for (let i = 0; i < length; i++) {
                        values += array[i];
                    }
                    const average = values / length;
                    setAudioLevel(average);
                }
            })
            .catch((err) => {
                console.error("Permission denied", err);
                setHasPermission(false);
            });

        return () => {
            // Don't stop tracks here if we are passing them up!
            // Only stop if we unmount without passing? 
            // Actually, if we pass it, the parent manages it.
            // But if we fail/close, we should stop it.
            // For now, let's NOT stop it here on unmount if we successfully passed it?
            // It's tricky. Let's remove the cleanup here and let the parent handle cleanup or garbage collection.
            // OR, better: The parent mounts this, gets the stream, then unmounts this. 
            // If we stop tracks on unmount, the stream dies. 
            // So we MUST remove the cleanup of tracks here.
        }
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg border-slate-800 bg-slate-900 text-white shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        {role === 'teacher' ? '🎙️ Command Center Check' : '📸 Classroom Entry Check'}
                    </CardTitle>
                    <p className="text-slate-400">
                        {hasPermission === false
                            ? "We need camera access to join the class."
                            : "Verify your camera and microphone before joining."}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {hasPermission === false ? (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-500">Access Denied</h4>
                                <p className="text-sm text-red-200 mt-1">
                                    Please enable camera and microphone permissions in your browser settings (look for the lock icon in the address bar).
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="mt-3 bg-red-950/30 border-red-500/30 hover:bg-red-950/50 text-red-200">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Camera Preview */}
                            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
                                />
                                {!hasPermission && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                        <span className="animate-pulse">Waiting for camera...</span>
                                    </div>
                                )}
                                {/* Status Icons Overlay */}
                                <div className="absolute bottom-3 right-3 flex gap-2">
                                    <div className={`p-2 rounded-full ${stream?.getVideoTracks()[0].enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {stream?.getVideoTracks()[0].enabled ? <Video size={16} /> : <VideoOff size={16} />}
                                    </div>
                                    <div className={`p-2 rounded-full ${audioLevel > 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                        {audioLevel > 10 ? <Mic size={16} /> : <MicOff size={16} />}
                                    </div>
                                </div>
                            </div>

                            {/* Mic Meter */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                                    <span>Microphone Level</span>
                                    <span className={audioLevel > 10 ? "text-emerald-400" : "text-amber-400"}>
                                        {audioLevel > 10 ? "Good" : "Quiet"}
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-75 ease-out"
                                        style={{ width: `${Math.min(audioLevel * 2, 100)}%` }} // Amplify visual
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-slate-800 pt-6">
                    {hasPermission && (
                        <Button
                            onClick={() => stream && onComplete(stream)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 shadow-lg shadow-indigo-500/20">
                            <CheckCircle2 className="mr-2" size={20} />
                            I Look Good, Enter
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
