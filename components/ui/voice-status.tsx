import { Mic, MicOff } from 'lucide-react';
import { cn } from "@/lib/utils";

interface VoiceStatusProps {
    isListening: boolean;
    onClick: () => void;
}

export function VoiceStatus({ isListening, onClick }: VoiceStatusProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all",
                isListening
                    ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            )}
        >
            {isListening ? (
                <>
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">Listening</span>
                </>
            ) : (
                <>
                    <MicOff size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Voice Off</span>
                </>
            )}
        </button>
    );
}
