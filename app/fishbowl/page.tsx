'use client';

import React, { useState } from 'react';
import { useAppTheme } from '@/app/contexts/AppThemeContext';
import PageLayout from '@/app/components/PageLayout';
import Goldfish from '@/app/components/fish/Goldfish';
import { FishConfig } from '@/app/components/fish/Sidebar';

const FishbowlPage: React.FC = () => {
  const { currentFishbowlTheme } = useAppTheme();

  const [config] = useState<FishConfig>({
    colors: {
      body: '#991b1b',
      tail: '#991b1b',
      dorsal: '#991b1b',
      eye: '#ffffff',
    },
    behavior: {
      agility: 0.35, // Maps to roughly 0.025 spring
      energy: 0.5,   // Moderate sway
      scale: 1.0,
    },
  });

  return (
    <PageLayout 
      theme={currentFishbowlTheme}
      box2Style={{ padding: 0, minHeight: '100vh' }}
    >
      {/* Main Canvas Area */}
      <div className="relative w-full h-screen overflow-hidden cursor-crosshair">
        <div className="absolute top-6 left-6 z-10 pointer-events-none opacity-50">
          <h1 className="text-2xl font-bold tracking-tighter text-white drop-shadow-lg">鱼缸</h1>
          <p className="text-sm text-white/80 drop-shadow">跟随鼠标游动的鱼</p>
        </div>
        
        <Goldfish config={config} />
        
        <div className="absolute bottom-6 w-full text-center z-10 pointer-events-none opacity-40">
          <p className="text-xs text-white/80 drop-shadow">移动鼠标引领鱼儿游动</p>
        </div>
      </div>
    </PageLayout>
  );
};

export default FishbowlPage;
