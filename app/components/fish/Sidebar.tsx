import React from 'react';

export interface FishConfig {
  colors: {
    body: string;
    tail: string;
    dorsal: string;
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

  return (
    <div className="w-80 h-full bg-white/90 backdrop-blur-sm border-l border-stone-200 shadow-xl overflow-y-auto p-6 flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold text-stone-800 mb-1">Lab Settings</h2>
        <p className="text-xs text-stone-500">Design your specimen</p>
      </div>

      {/* Colors Section */}
      <section>
        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">Pigmentation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Body</label>
            <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.colors.body}
                onChange={(e) => updateColor('body', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
              />
              <span className="text-xs text-stone-400 font-mono">{config.colors.body}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Tail</label>
             <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.colors.tail}
                onChange={(e) => updateColor('tail', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
              />
               <span className="text-xs text-stone-400 font-mono">{config.colors.tail}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Dorsal</label>
             <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.colors.dorsal}
                onChange={(e) => updateColor('dorsal', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
              />
               <span className="text-xs text-stone-400 font-mono">{config.colors.dorsal}</span>
            </div>
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Eye</label>
             <div className="flex items-center gap-2">
              <input 
                type="color" 
                value={config.colors.eye}
                onChange={(e) => updateColor('eye', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
              />
               <span className="text-xs text-stone-400 font-mono">{config.colors.eye}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Behavior Section */}
      <section>
        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">Behavior</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-stone-600">Agility (Spring)</label>
              <span className="text-xs text-stone-400">{Math.round(config.behavior.agility * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01"
              value={config.behavior.agility}
              onChange={(e) => updateBehavior('agility', parseFloat(e.target.value))}
              className="w-full accent-red-600 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-stone-600">Energy (Sway)</label>
              <span className="text-xs text-stone-400">{Math.round(config.behavior.energy * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01"
              value={config.behavior.energy}
              onChange={(e) => updateBehavior('energy', parseFloat(e.target.value))}
              className="w-full accent-red-600 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-stone-600">Scale</label>
              <span className="text-xs text-stone-400">x{config.behavior.scale}</span>
            </div>
            <input 
              type="range" min="0.5" max="2" step="0.1"
              value={config.behavior.scale}
              onChange={(e) => updateBehavior('scale', parseFloat(e.target.value))}
              className="w-full accent-red-600 h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sidebar;