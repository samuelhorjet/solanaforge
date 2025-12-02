// FILE: components/DebugConsole.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";

export function DebugConsole() {
  const [logs, setLogs] = useState<{ type: string; msg: string; time: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Intercept console.log
    const originalLog = console.log;
    console.log = (...args) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      setLogs(prev => [{ type: 'info', msg, time: new Date().toLocaleTimeString() }, ...prev]);
      originalLog.apply(console, args);
    };

    // 2. Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      setLogs(prev => [{ type: 'error', msg, time: new Date().toLocaleTimeString() }, ...prev]);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-9999 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-mono shadow-lg opacity-80"
      >
        Show Debug Logs
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 h-[300px] z-9999 bg-black/90 text-white font-mono text-xs flex flex-col border-t border-gray-700">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
        <span className="font-bold text-yellow-400">System Logs</span>
        <div className="flex gap-4">
          <button onClick={() => setLogs([])}><Trash2 className="h-4 w-4" /></button>
          <button onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 && <div className="text-gray-500 italic">No logs yet...</div>}
        {logs.map((log, i) => (
          <div key={i} className={`border-b border-white/10 pb-1 ${log.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            <span className="text-gray-500 mr-2">[{log.time}]</span>
            <span className="break-all whitespace-pre-wrap">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}