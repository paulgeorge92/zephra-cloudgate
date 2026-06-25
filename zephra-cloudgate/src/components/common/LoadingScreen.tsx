import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl transition-all duration-700">
      <div className="relative">
        {/* Outer pulsing glow */}
        <div className="absolute inset-[-40px] rounded-full bg-cf-orange/10 blur-3xl animate-pulse" />
        
        {/* Decorative rings */}
        <div className="absolute inset-[-10px] rounded-full border border-cf-orange/20 animate-[ping_3s_linear_infinite]" />
        <div className="absolute inset-[-20px] rounded-full border border-cf-orange/10 animate-[ping_3s_linear_infinite_1s]" />
        
        {/* Main Spinning border */}
        <div className="w-28 h-28 rounded-full border-[3px] border-cf-orange/20 border-t-cf-orange animate-[spin_1.5s_linear_infinite]" />
        
        {/* Central Logo Area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cf-orange to-[#f59648] shadow-[0_0_40px_rgba(243,128,32,0.4)] flex items-center justify-center transform rotate-12 animate-pulse">
            <span className="text-4xl font-black text-black select-none -rotate-12">Z</span>
          </div>
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-white tracking-[0.2em] uppercase">
            Zephra
          </h2>
          <span className="text-2xl font-light text-cf-orange tracking-[0.2em] uppercase">Cloud</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-cf-orange animate-bounce" />
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">
          Establishing Secure Tunnel
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
