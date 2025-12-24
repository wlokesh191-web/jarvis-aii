
import React from 'react';

interface HologramDisplayProps {
  image: string;
  onClear: () => void;
}

const HologramDisplay: React.FC<HologramDisplayProps> = ({ image, onClear }) => {
  return (
    <div className="relative group animate-in zoom-in-50 duration-500 ease-out landscape:scale-[0.8] landscape:md:scale-100">
      {/* Holographic Frame */}
      <div className="absolute -inset-1 border border-sky-400/30 rounded-xl blur-sm group-hover:border-sky-400/60 transition-all"></div>
      
      <div className="relative bg-slate-950/80 border border-sky-400/40 rounded-lg overflow-hidden flex flex-col items-center shadow-[0_0_30px_rgba(56,189,248,0.2)] md:shadow-[0_0_50px_rgba(56,189,248,0.2)]">
        {/* Tech Header */}
        <div className="w-full h-5 md:h-6 bg-sky-900/20 border-b border-sky-400/20 flex items-center justify-between px-2 md:px-3">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-sky-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-sky-400/40 rounded-full"></div>
          </div>
          <span className="text-[7px] md:text-[8px] orbitron font-bold tracking-tighter opacity-70">HOLODESK_LND_v1.2</span>
          <button 
            onClick={onClear}
            className="text-[9px] md:text-[10px] opacity-40 hover:opacity-100 hover:text-red-400 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* The Image Container */}
        <div className="relative p-1 md:p-4 overflow-hidden">
          <img 
            src={image} 
            alt="Holographic Projection" 
            className="max-w-[70vw] landscape:max-w-[40vw] md:max-w-md lg:max-w-xl max-h-[40vh] md:max-h-[50vh] object-contain mix-blend-screen opacity-90 brightness-110" 
          />
          
          {/* Overlay Tech Ticks */}
          <div className="absolute inset-0 pointer-events-none border border-sky-400/10">
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-sky-400/40"></div>
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-sky-400/40"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-sky-400/40"></div>
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-sky-400/40"></div>
          </div>

          {/* Floating Data Point (Hidden in landscape mobile to avoid clutter) */}
          <div className="hidden sm:flex absolute top-1/4 -right-4 md:-right-16 items-start gap-2 animate-bounce">
            <div className="w-px h-8 md:h-12 bg-sky-400/40 -rotate-45 origin-bottom"></div>
            <div className="bg-slate-900/90 border border-sky-400/40 p-1 text-[6px] md:text-[7px] orbitron backdrop-blur-md">
              <span className="block text-sky-300">SYNC_X9</span>
              <span className="block opacity-60">ACTV</span>
            </div>
          </div>
        </div>

        {/* Scanline / Hologram Ripple Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <div className="w-full h-px bg-sky-400 animate-[moveDown_4s_linear_infinite]"></div>
          <div className="w-full h-px bg-sky-400/40 animate-[moveDown_6s_linear_infinite_reverse]"></div>
        </div>
      </div>

      {/* Footer Label */}
      <div className="absolute -bottom-4 md:-bottom-6 left-0 right-0 text-center">
        <span className="text-[7px] md:text-[10px] orbitron text-sky-400/40 tracking-[0.4em] uppercase">Visual_Spatial_Render</span>
      </div>

      <style>{`
        @keyframes moveDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
      `}</style>
    </div>
  );
};

export default HologramDisplay;
