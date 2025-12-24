
import React from 'react';
import { JarvisStatus } from '../types';

interface ArcReactorProps {
  status: JarvisStatus;
  audioLevel?: number;
}

const ArcReactor: React.FC<ArcReactorProps> = ({ status, audioLevel = 0 }) => {
  const isThinking = status === JarvisStatus.THINKING || status === JarvisStatus.RECONNECTING;
  const isSpeaking = status === JarvisStatus.SPEAKING;
  const isListening = status === JarvisStatus.LISTENING;

  // Faster reaction scaling
  const pulseScale = 1 + (audioLevel * 0.7);
  const opacityIntensity = 0.4 + (audioLevel * 0.6);

  return (
    <div className="relative w-48 h-48 xs:w-64 xs:h-64 md:w-[380px] md:h-[380px] flex items-center justify-center">
      {/* Background spin rings */}
      <div className="absolute w-[100%] h-[100%] rounded-full border border-sky-500/10 animate-[spin_40s_linear_infinite]"></div>
      
      {/* Pattern Overlay */}
      <div className="absolute w-[80%] h-[80%] opacity-20 pointer-events-none overflow-hidden rounded-full">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <pattern id="hexagons" width="10" height="17.32" patternUnits="userSpaceOnUse" patternTransform="scale(0.5) rotate(30)">
            <path d="M5 0 L10 2.88 L10 8.66 L5 11.54 L0 8.66 L0 2.88 Z" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-sky-400" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>

      {/* Main Outer Ring */}
      <div className={`absolute w-[90%] h-[90%] border-[1px] border-sky-400/20 rounded-full animate-[spin_20s_linear_infinite] transition-all duration-300`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 md:w-12 h-1 md:h-2 bg-sky-400/40 rounded-full"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 md:w-12 h-1 md:h-2 bg-sky-400/40 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 md:w-2 h-8 md:h-12 bg-sky-400/40 rounded-full"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 md:w-2 h-8 md:h-12 bg-sky-400/40 rounded-full"></div>
      </div>

      {/* Inner Glow Pulse */}
      <div 
        className={`absolute inset-0 rounded-full arc-reactor transition-all duration-150 pointer-events-none ${isThinking ? 'animate-pulse' : ''}`}
        style={{ transform: `scale(${pulseScale})`, opacity: isSpeaking || isListening ? opacityIntensity : 0.2 }}
      ></div>
      
      {/* Dashed Spin Ring */}
      <div className={`absolute w-[75%] h-[75%] rounded-full border-2 md:border-4 border-dashed border-sky-400/30 animate-[spin_10s_linear_infinite] ${isThinking ? 'animate-[spin_1.5s_linear_infinite] border-sky-300' : ''}`}></div>
      
      {/* Tick Marks Ring */}
      <div className={`absolute w-[65%] h-[65%] rounded-full border-[1px] border-sky-500/40 animate-[spin_8s_linear_infinite_reverse] ${isThinking ? 'animate-[spin_4s_linear_infinite_reverse]' : ''}`}>
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-2 md:h-3 bg-sky-400/50"
            style={{ transform: `rotate(${i * 30}deg) translateY(-50%)`, transformOrigin: 'center 50%' }}
          ></div>
        ))}
      </div>
      
      {/* Core Center */}
      <div className="relative w-32 h-32 xs:w-40 xs:h-40 md:w-56 md:h-56 rounded-full bg-slate-950/80 border-[1px] border-sky-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.3)] md:shadow-[0_0_40px_rgba(56,189,248,0.4)]">
        <div className={`relative w-[85%] h-[85%] rounded-full border-2 border-sky-300/30 flex items-center justify-center overflow-hidden bg-slate-900/50`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-sky-500/20" />
              {[...Array(24)].map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const baseHeight = 35;
                const mod = isSpeaking || isListening ? (audioLevel * 18 * Math.random()) : 0;
                const h = baseHeight + mod;
                return (
                  <line 
                    key={i} 
                    x1={50 + Math.cos(angle) * baseHeight} y1={50 + Math.sin(angle) * baseHeight} 
                    x2={50 + Math.cos(angle) * h} y2={50 + Math.sin(angle) * h} 
                    stroke="currentColor" strokeWidth="1.2" className="text-sky-400 transition-all duration-75"
                    style={{ opacity: 0.2 + (audioLevel * 0.8) }}
                  />
                );
              })}
            </svg>
          </div>
          <div className="z-10">
            <div className={`w-10 h-10 xs:w-12 xs:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 ${
              isListening ? 'border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
              isSpeaking ? 'border-green-400 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 
              isThinking ? 'border-yellow-400 text-yellow-400 animate-pulse' : 'border-sky-400 text-sky-400'
            } transition-colors duration-200`}>
               <span className="orbitron font-black text-[10px] md:text-sm">J.A.R.V</span>
            </div>
          </div>
        </div>
        
        <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
             <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 text-[5px] md:text-[7px] orbitron font-bold opacity-70">FAST_SYNC</div>
             <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 text-[5px] md:text-[7px] orbitron font-bold opacity-70">CORE_ACTIVE</div>
        </div>
      </div>
    </div>
  );
};

export default ArcReactor;
