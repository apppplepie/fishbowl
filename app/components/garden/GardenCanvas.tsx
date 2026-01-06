import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { noiseGenerator } from '../../utils/noise';
import { Grower, PlantSettings, PlantType, GardenCanvasRef } from '../../types/garden';

interface GardenCanvasProps {
  settings: PlantSettings;
  clearTrigger: number;
  onSettingsCopied: (settings: PlantSettings) => void;
}

// Helper to interpolate between two hex colors
const lerpColor = (start: string, end: string, t: number) => {
    t = Math.max(0, Math.min(1, t));
    const parse = (c: string) => {
        const hex = c.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    };
    const s = parse(start);
    const e = parse(end);
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

// Track previously spawned plants for "Right Click to Copy"
interface PlantHistoryItem {
    x: number;
    y: number;
    settings: PlantSettings;
    timestamp: number;
}

const GardenCanvas = forwardRef<GardenCanvasRef, GardenCanvasProps>(({ settings, clearTrigger, onSettingsCopied }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const growersRef = useRef<Grower[]>([]);
  const requestRef = useRef<number>(0);
  const plantHistoryRef = useRef<PlantHistoryItem[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const uuid = () => Math.random().toString(36).substr(2, 9);

  const createGrower = (x: number, y: number, plantSettings: PlantSettings, generation = 0, initialAngle?: number): Grower => {
    const baseAngle = -Math.PI / 2;
    const startAngle = initialAngle ?? (baseAngle + (Math.random() * 0.2 - 0.1));

    return {
      id: uuid(),
      x,
      y,
      angle: startAngle,
      life: 0,
      maxLife: plantSettings.maxLife / (generation + 1), 
      width: plantSettings.baseWidth / (generation + 1),
      speed: plantSettings.growthSpeed,
      color: plantSettings.stemColorStart,
      settings: plantSettings,
      noiseOffset: Math.random() * 1000,
      generation,
    };
  };

  const spawnPlant = (x: number, y: number, overrideSettings?: PlantSettings) => {
    const s = overrideSettings || settings;
    // Save to history
    plantHistoryRef.current.push({
        x, y, settings: { ...s }, timestamp: Date.now()
    });
    // Keep history manageable
    if (plantHistoryRef.current.length > 50) {
        plantHistoryRef.current.shift();
    }

    growersRef.current.push(createGrower(x, y, s));
  };

  useImperativeHandle(ref, () => ({
    spawn: (x: number, y: number, overrideSettings?: PlantSettings) => {
      spawnPlant(x, y, overrideSettings);
    }
  }));

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ 
            width: containerRef.current.offsetWidth, 
            height: containerRef.current.offsetHeight 
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Transparent background so we can see CSS background if needed, 
        // but we'll fill with the paper color to ensure trails work properly
        ctx.fillStyle = '#fdfbf7'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    growersRef.current = [];
    plantHistoryRef.current = [];
  }, [dimensions, clearTrigger]);

  const drawLeaf = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, baseSize: number, color: string, type: PlantType) => {
    // Jitter Size: ±20% variation
    const size = baseSize * (0.8 + Math.random() * 0.4);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = "rgba(0,0,0,0.05)";
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    if (type === PlantType.PALM) {
      const spread = Math.PI / 1.5;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, size, -spread/2, spread/2);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.5;
      for(let i = -2; i <= 2; i++) {
         ctx.beginPath();
         ctx.moveTo(0,0);
         const a = (i * spread) / 6;
         ctx.lineTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
         ctx.stroke();
      }
    } else if (type === PlantType.GEOMETRIC) {
      ctx.moveTo(0, 0);
      ctx.lineTo(size, -size/3);
      ctx.lineTo(size * 1.5, 0);
      ctx.lineTo(size, size/3);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(size * 1.5, 0);
      ctx.stroke();
    } else if (type === PlantType.UMBRELLA) {
      ctx.rotate(-Math.PI / 2);
      const w = size;
      const h = size * 1.2;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-w/2, -h/4, -w, h/2, 0, h);
      ctx.bezierCurveTo(w, h/2, w/2, -h/4, 0, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h * 0.9);
      ctx.stroke();
    } else if (type === PlantType.BERRY) {
      ctx.ellipse(size/2, 0, size/2, size/4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size / 2, -size / 2, size, -size / 4, size, 0);
      ctx.bezierCurveTo(size, size / 4, size / 2, size / 2, 0, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(size * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, baseSize: number, startColor: string, endColor: string, petals: number, type: PlantType) => {
    // Size Jitter: ±15% variation
    const size = baseSize * (0.85 + Math.random() * 0.3);

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowOffsetY = 2;

    if (type === PlantType.GEOMETRIC) {
       ctx.fillStyle = lerpColor(startColor, endColor, 0.5);
       ctx.beginPath();
       for(let i=0; i<petals * 2; i++) {
          const r = (i % 2 === 0) ? size : size/3;
          const a = (i * Math.PI) / petals;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
       }
       ctx.closePath();
       ctx.fill();
    } else if (type === PlantType.BERRY) {
       const berryCount = Math.floor(petals) || 3;
       for(let i=0; i < berryCount; i++) {
          const bx = (Math.random() - 0.5) * size;
          const by = (Math.random() - 0.5) * size;
          const berrySize = size / 3.5;
          ctx.beginPath();
          // Mix start and end color randomly for each berry
          ctx.fillStyle = lerpColor(startColor, endColor, Math.random());
          ctx.arc(bx, by, berrySize, 0, Math.PI * 2);
          ctx.fill();
          // Shine
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.arc(bx - berrySize/3, by - berrySize/3, berrySize/4, 0, Math.PI * 2);
          ctx.fill();
       }
    } else if (type === PlantType.UMBRELLA) {
      ctx.rotate(Math.random() - 0.5);
      ctx.fillStyle = lerpColor(startColor, endColor, 0.2); 
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size/2, -size, -size*1.5, -size, 0, -size*2);
      ctx.bezierCurveTo(size*1.5, -size, size/2, -size, 0, 0);
      ctx.fill();
      ctx.strokeStyle = lerpColor(startColor, endColor, 0.9);
      ctx.lineWidth = size / 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 1.5);
      ctx.stroke();
    } else {
       // Standard VINE / PALM flower
       const angleStep = (Math.PI * 2) / petals;
       for (let i = 0; i < petals; i++) {
          // Petals gradient from start to end color based on index
          const petalColor = lerpColor(startColor, endColor, i / petals);
          ctx.fillStyle = petalColor;
          ctx.save();
          ctx.rotate(i * angleStep);
          ctx.beginPath();
          ctx.ellipse(size/1.5, 0, size/1.5, size/4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
       }
       // Center
       ctx.fillStyle = '#f59e0b'; // Amber
       ctx.beginPath();
       ctx.arc(0, 0, size/4, 0, Math.PI * 2);
       ctx.fill();
    }
    ctx.restore();
  };

  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over'; 

    const newGrowers: Grower[] = [];

    growersRef.current.forEach((grower) => {
      const { settings, life, maxLife } = grower;
      
      if (life >= maxLife || grower.width < 0.1) {
        if (grower.generation < 2 && Math.random() < settings.flowerProbability) {
             drawFlower(
                 ctx, 
                 grower.x, 
                 grower.y, 
                 settings.flowerSize, 
                 settings.flowerColorStart, 
                 settings.flowerColorEnd, 
                 settings.petalCount, 
                 settings.type
            );
        }
        return;
      }

      const progress = life / maxLife;
      let angleChange = 0;

      if (settings.type === PlantType.GEOMETRIC) {
         if (Math.random() < 0.05) { 
            grower.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 6); 
         }
         const targetAngle = -Math.PI / 2;
         grower.angle += (targetAngle - grower.angle) * 0.02;
      } else if (settings.type === PlantType.BERRY) {
        const n = noiseGenerator.noise(grower.x * 0.02, grower.y * 0.02, grower.noiseOffset + life * 0.05);
        angleChange = n * (settings.curlFactor * 2);
        grower.angle += angleChange;
        const targetAngle = -Math.PI / 2;
        grower.angle += (targetAngle - grower.angle) * 0.02;
      } else {
         if (progress < settings.straightness) {
           const targetAngle = -Math.PI / 2;
           const correction = (targetAngle - grower.angle) * 0.1;
           const wobble = (Math.random() - 0.5) * 0.05;
           grower.angle += correction + wobble;
         } else {
           const n = noiseGenerator.noise(grower.x * 0.01, grower.y * 0.01, grower.noiseOffset + life * 0.02);
           angleChange = n * settings.curlFactor;
           grower.angle += angleChange;
         }
      }

      const nextX = grower.x + Math.cos(grower.angle) * grower.speed;
      const nextY = grower.y + Math.sin(grower.angle) * grower.speed;

      const stemColor = lerpColor(settings.stemColorStart, settings.stemColorEnd, progress);

      ctx.beginPath();
      ctx.moveTo(grower.x, grower.y);
      ctx.lineTo(nextX, nextY);
      
      const currentWidth = grower.width * (1 - progress);
      ctx.lineWidth = Math.max(0.5, currentWidth);
      ctx.strokeStyle = stemColor;
      
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      if (Math.random() < settings.leafFrequency) {
        let leafAngle = grower.angle;

        if (settings.type === PlantType.PALM) {
            leafAngle += (Math.random() > 0.5 ? Math.PI/3 : -Math.PI/3);
        } else if (settings.type === PlantType.GEOMETRIC) {
             leafAngle += (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
        } else if (settings.type === PlantType.UMBRELLA) {
             leafAngle += (Math.random() - 0.5); 
        } else {
            leafAngle += (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2) + (Math.random() * 0.5 - 0.25);
        }

        const leafColor = lerpColor(settings.leafColorStart, settings.leafColorEnd, progress);
        drawLeaf(ctx, grower.x, grower.y, leafAngle, settings.leafSize, leafColor, settings.type);
      }

      let branchChance = 0.015;
      if (settings.type === PlantType.PALM) branchChance = 0.005; 
      if (settings.type === PlantType.GEOMETRIC) branchChance = 0.04; 
      if (settings.type === PlantType.UMBRELLA) branchChance = 0.002;
      if (settings.type === PlantType.BERRY) branchChance = 0.04;

      if (grower.generation < 2 && Math.random() < branchChance) {
         let branchAngleOffset = 0.6;
         if (settings.type === PlantType.GEOMETRIC) branchAngleOffset = 0.8; 
         if (settings.type === PlantType.BERRY) branchAngleOffset = 0.9;

         const branchAngle = grower.angle + (Math.random() > 0.5 ? branchAngleOffset : -branchAngleOffset);
         newGrowers.push(createGrower(grower.x, grower.y, settings, grower.generation + 1, branchAngle));
      }

      grower.x = nextX;
      grower.y = nextY;
      grower.life++;

      newGrowers.push(grower);
    });

    growersRef.current = newGrowers;
    requestRef.current = requestAnimationFrame(update);
  }, [settings]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click paints
    const { clientX, clientY } = e;
    // We need to adjust coordinates relative to the canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      spawnPlant(clientX - rect.left, clientY - rect.top);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 1) { 
        if (Math.random() > 0.6) {
           const rect = canvasRef.current?.getBoundingClientRect();
           if (rect) {
             spawnPlant(e.clientX - rect.left, e.clientY - rect.top);
           }
        }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Find closest plant in history
      let closest: PlantHistoryItem | null = null;
      let minDist = 100; // Pixel radius to 'hit' a plant base

      for (const item of plantHistoryRef.current) {
          const dx = item.x - clientX;
          const dy = item.y - clientY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) {
              minDist = dist;
              closest = item;
          }
      }

      if (closest) {
          onSettingsCopied(closest.settings);
      } else {
          // If clicked empty space, copy current settings
          onSettingsCopied(settings);
      }
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
        <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onContextMenu={handleContextMenu}
        className="w-full h-full cursor-crosshair touch-none"
        />
    </div>
  );
});

export default GardenCanvas;