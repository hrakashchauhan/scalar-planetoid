import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function SessionTimer() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md shadow-sm">
            <Clock size={16} className="text-indigo-400" />
            <span className="font-mono text-slate-200 font-bold tracking-widest">{formatTime(elapsed)}</span>
        </div>
    );
}
