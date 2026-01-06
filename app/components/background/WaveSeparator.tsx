import React, { useEffect, useRef } from 'react';
import { WaveSeparatorProps } from '@/app/types/background';

const WaveSeparator: React.FC<WaveSeparatorProps> = ({ colors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Configuration: Use passed colors
    const lines = [
      // Base layer
      { amplitude: 12, frequency: 0.005, speed: 0.02, color: colors[0], yOffset: 0 },
      // Mid layer
      { amplitude: 18, frequency: 0.008, speed: 0.015, color: colors[1], yOffset: 2 },
      // Top layer (Highlights)
      { amplitude: 8, frequency: 0.012, speed: 0.03, color: colors[2], yOffset: -2 },
      // Deep layer (Volume)
      { amplitude: 22, frequency: 0.004, speed: 0.01, color: colors[3], yOffset: 5 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.8;

      const centerY = canvas.height / 2;

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2.5; 
        ctx.lineCap = 'round';

        for (let x = 0; x < canvas.width; x++) {
          const y = centerY + line.yOffset + 
                    Math.sin(x * line.frequency + time * line.speed) * line.amplitude +
                    Math.sin(x * line.frequency * 0.5 + time * line.speed * 0.5) * (line.amplitude * 0.4); 
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors]); // Re-run effect when colors change

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full mix-blend-screen"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default WaveSeparator;