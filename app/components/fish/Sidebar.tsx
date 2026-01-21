import React, { useState } from 'react';

export interface FishConfig {
  colors: {
    body: string;
    bodyAccent: string;
    tail: string;
    tailAccent: string;
    dorsal: string;
    dorsalAccent: string;
    eye: string;
  };
  behavior: {
    agility: number; // 0 to 1
    energy: number;  // 0 to 1
    scale: number;   // 0.5 to 2
  };
}

interface SidebarProps {
  config: FishConfig;
  onChange: (newConfig: FishConfig) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const updateColor = (part: keyof FishConfig['colors'], value: string) => {
    onChange({
      ...config,
      colors: { ...config.colors, [part]: value },
    });
  };

  const updateBehavior = (param: keyof FishConfig['behavior'], value: number) => {
    onChange({
      ...config,
      behavior: { ...config.behavior, [param]: value },
    });
  };

  // Minimized State
  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="absolute top-6 right-6 w-10 h-10 bg-white/90 backdrop-blur shadow-xl rounded-full flex items-center justify-center text-stone-600 hover:scale-110 hover:text-orange-600 transition-all z-50 border border-stone-100"
        title="Open Controls"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      </button>
    );
  }

  const GradientRow = ({ label, startKey, endKey }: { label: string, startKey: keyof FishConfig['colors'], endKey: keyof FishConfig['colors'] }) => (
    <div className="flex items-center justify-between group">
      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider w-12">{label}</span>
      <div className="flex items-center flex-1 justify-end gap-2">
        <div className="relative group/picker">
          <input 
            type="color" 
            value={config.colors[startKey]}
            onChange={(e) => updateColor(startKey, e.target.value)}
            className="w-5 h-5 rounded-full overflow-hidden cursor-pointer border-0 p-0 opacity-0 absolute inset-0 z-10"
          />
           <div className="w-5 h-5 rounded-full border border-stone-200 shadow-sm transition-transform group-hover/picker:scale-110" style={{ backgroundColor: config.colors[startKey] }} />
        </div>
        
        <div className="flex-1 h-1 rounded-full bg-stone-100 overflow-hidden relative mx-1">
           <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${config.colors[startKey]}, ${config.colors[endKey]})` }} />
        </div>

        <div className="relative group/picker">
          <input 
            type="color" 
            value={config.colors[endKey]}
            onChange={(e) => updateColor(endKey, e.target.value)}
             className="w-5 h-5 rounded-full overflow-hidden cursor-pointer border-0 p-0 opacity-0 absolute inset-0 z-10"
          />
          <div className="w-5 h-5 rounded-full border border-stone-200 shadow-sm transition-transform group-hover/picker:scale-110" style={{ backgroundColor: config.colors[endKey] }} />
        </div>
      </div>
    </div>
  );

  const SliderRow = ({ label, value, onChange, min, max, step, displayValue }: any) => (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-stone-400">
          <span>{label}</span>
          <span className="font-mono text-stone-600">{displayValue}</span>
        </div>
        <input 
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-stone-100 rounded-full appearance-none cursor-pointer hover:bg-stone-200 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-800 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        />
     </div>
  );

  return (
    <div className="absolute top-6 right-6 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex flex-col z-50 transition-all duration-300 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-xs font-bold text-stone-800 tracking-widest">CONFIGURATION</span>
        </div>
        <button 
          onClick={() => setIsMinimized(true)}
          className="text-stone-300 hover:text-stone-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-7">
        
        {/* Section: Pigmentation */}
        <div className="space-y-4">
          <div className="space-y-3">
             <GradientRow label="Body" startKey="body" endKey="bodyAccent" />
             <GradientRow label="Tail" startKey="tail" endKey="tailAccent" />
             <GradientRow label="Fin" startKey="dorsal" endKey="dorsalAccent" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-stone-100 w-full" />

        {/* Section: Dynamics */}
        <div className="space-y-4">
           <SliderRow 
              label="Agility" 
              value={config.behavior.agility} 
              onChange={(v: number) => updateBehavior('agility', v)}
              min="0" max="1" step="0.01"
              displayValue={`${Math.round(config.behavior.agility * 100)}%`}
           />
           <SliderRow 
              label="Energy" 
              value={config.behavior.energy} 
              onChange={(v: number) => updateBehavior('energy', v)}
              min="0" max="1" step="0.01"
              displayValue={`${Math.round(config.behavior.energy * 100)}%`}
           />
           <SliderRow 
              label="Scale" 
              value={config.behavior.scale} 
              onChange={(v: number) => updateBehavior('scale', v)}
              min="0.5" max="2" step="0.1"
              displayValue={`x${config.behavior.scale}`}
           />
        </div>

      </div>
      
    </div>
  );
};

export default Sidebar;