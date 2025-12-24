
import React from 'react';
import { LogEntry } from '../types';

interface StatusPanelProps {
  logs: LogEntry[];
  title: string;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ logs, title }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/40 border-l border-sky-500/20 p-4 overflow-hidden">
      <h3 className="orbitron text-xs font-bold mb-4 tracking-widest text-sky-400 flex items-center gap-2">
        <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
        {title}
      </h3>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
        {logs.map((log) => (
          <div key={log.id} className="text-[11px] font-mono border-l-2 border-sky-500/30 pl-2 py-1">
            <div className="flex justify-between opacity-50 mb-0.5">
              <span>[{log.source}]</span>
              <span>{log.timestamp}</span>
            </div>
            <div className={`${log.source === 'JARVIS' ? 'text-sky-300' : log.source === 'USER' ? 'text-slate-300' : 'text-yellow-500'}`}>
              {log.message}
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-[11px] opacity-30 italic">No activity recorded...</div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-sky-500/10">
        <div className="grid grid-cols-2 gap-2 text-[10px] orbitron opacity-60">
          <div>CPU_LOAD: 12.4%</div>
          <div>NET_STABLE: 99.8%</div>
          <div>MEM_USE: 4.2GB</div>
          <div>ENCRYPTION: AES-256</div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
