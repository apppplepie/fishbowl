import React, { useEffect, useRef } from 'react';
import { FishConfig } from './Sidebar';

/**
 * Math Helpers
 */
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

// Interpolates angles correctly
const lerpAngle = (start: number, end: number, factor: number) => {
  const diff = end - start;
  const da = (diff + Math.PI) % (2 * Math.PI) - Math.PI;
  return start + ((da + Math.PI) % (2 * Math.PI) - Math.PI) * factor;
};

const clamp = (val: number, min: number, max: number) => {
  return Math.min(Math.max(val, min), max);
};

// Ensures an angle doesn't deviate too far from a base angle
const constrainAngle = (base: number, target: number, maxDelta: number) => {
  let delta = target - base;
  // Normalize delta to -PI to PI
  delta = (delta + Math.PI) % (2 * Math.PI) - Math.PI;
  // Clamp delta
  const clampedDelta = clamp(delta, -maxDelta, maxDelta);
  return base + clampedDelta;
};

/**
 * 鱼的身体形状定义 (SVG 路径)
 * 坐标系：中心点为(0,0)，向右为正X，向下为正Y
 * M = moveto, L = lineto, Z = closepath
 */

// 鱼身体：几何形状，头部较宽，尾部收窄
// M -50 -20: 从左上角(-50,-20)开始
// L 50 -20: 画线到右上角(50,-20)
// L 50 0: 画线到右侧中间(50,0)
// L 35 20: 画线到右下角收窄处(25,20)
// L -50 20: 画线到左下角(-50,20)
// Z: 闭合路径
// 微调说明：调整这些坐标点可以改变鱼的身体形状和比例
const PATH_BODY =
  "M -45 -20 \
   L 45 -20 \
   Q 50 -20 50 -15 \
   L 50 -5 \
   Q 50 0 45 5 \
   L 30 18 \
   Q 25 20 20 20 \
   L -45 20 \
   Q -50 20 -50 15 \
   L -50 -15 \
   Q -50 -20 -45 -20 \
   Z";


// 鱼尾巴：圆角矩形形状，旋转中心在右端中间(0,0)
// 使用二次曲线(Q)创建圆角效果
// M -80 -16: 从尾巴左上角开始(-80,-16)
// Q -78 -16 -78 -14: 圆角到左下角
// L -78 -6: 画线到左下角(-78,-6)
// Q -78 -4 -80 -4: 圆角到右下角
// L 8 -4: 画线到右下角(8,-4)
// Q 10 -4 10 -6: 圆角到右上角
// L 10 -14: 画线到右上角(10,-14)
// Q 10 -16 8 -16: 圆角到左上角
// L -78 -16: 回到起点
// Z: 闭合路径
// 微调说明：改变宽度(-80)和高度(±16)可以调整尾巴大小，圆角半径为2
const PATH_TAIL = "M -80 -16 L -78 -16 -78 -14 L -78 -6 L -78 -4 -80 -4 L 8 -4 Q 10 -4 10 -6 L 10 -14 Q 10 -16 8 -16 L -78 -16 Z";

// 鱼背鳍：圆角矩形，旋转中心在右侧中间(0,0)
// 使用二次曲线(Q)创建圆角效果
// M -80 -5: 从背鳍左上角开始(-80,-5)
// Q -78 -5 -78 -3: 圆角到左下角
// L -78 3: 画线到左下角(-78,3)
// Q -78 5 -80 5: 圆角到右下角
// L -2 5: 画线到右下角(-2,5)
// Q 0 5 0 3: 圆角到右上角
// L 0 -3: 画线到右上角(0,-3)
// Q 0 -5 -2 -5: 圆角到左上角
// L -78 -5: 回到起点
// Z: 闭合路径
// 微调说明：调整长度(-80)和高度(±5)可以改变背鳍外观，圆角半径为2
const PATH_DORSAL = "M -80 -5 L -78 -5 -78 -3 L -78 3 L -78 5 -80 5 L -2 5 Q 0 5 0 3 L 0 -3 Q 0 -5 -2 -5 L -78 -5 Z";

// 眼睛与瞳孔基准位置（相对于鱼身体中心）
// 只需修改这里即可同步到 SVG 和跟随逻辑
const EYE_BASE = { x: 30, y: -3 };
const EYE_RADIUS = 7;
const PUPIL_RADIUS = 5;


interface GoldfishProps {
  config: FishConfig;
}

const Goldfish: React.FC<GoldfishProps> = ({ config }) => {
  const bodyRef = useRef<SVGGElement>(null);
  const dorsalRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGGElement>(null);
  const pupilRef = useRef<SVGCircleElement>(null);

  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const physics = useRef({
    time: 0,
    swayPhase: 0,
    mouse: { x: 0, y: 0 }, // Will be initialized in useEffect
    body: {
      x: 0, // Will be initialized in useEffect
      y: 0, // Will be initialized in useEffect
      pitch: 0,
      facing: 1,
      flipScale: 1,
    },
    tail: { x: 0, y: 0, angle: 0, droop: 0 }, // Will be initialized in useEffect
    dorsal: { x: 0, y: 0, angle: 0 }, // Will be initialized in useEffect
  });

  useEffect(() => {
    // Initialize positions after component mounts (client-side only)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    physics.current.mouse = { x: centerX, y: centerY };
    physics.current.body.x = centerX;
    physics.current.body.y = centerY;
    physics.current.tail.x = centerX;
    physics.current.tail.y = centerY;
    physics.current.dorsal.x = centerX;
    physics.current.dorsal.y = centerY;

    const handleMouseMove = (e: MouseEvent) => {
      physics.current.mouse.x = e.clientX;
      physics.current.mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let rAF = 0;

    const animate = () => {
      const state = physics.current;
      const cfg = configRef.current;
      
      state.time += 16; 

      const agility = cfg.behavior.agility;
      const springBody = 0.005 + (agility * 0.075);
      const springRotation = 0.01 + (agility * 0.08);
      const springTail = 0.2 + (agility * 0.6);

      const energy = cfg.behavior.energy;
      const swaySpeedMove = 0.005 + (energy * 0.03); 
      const swaySpeedIdle = 0.001 + (energy * 0.005);
      const swayAmp = 0.05 + (energy * 0.05);

      const targetX = state.mouse.x;
      const targetY = state.mouse.y;

      // 1. Body Movement
      state.body.x = lerp(state.body.x, targetX, springBody);
      state.body.y = lerp(state.body.y, targetY, springBody);

      const dx = targetX - state.body.x;
      const dy = targetY - state.body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const isMoving = dist > 15;

      // 2. Facing Direction
      if (Math.abs(dx) > 10) {
        state.body.facing = dx > 0 ? 1 : -1;
      }
      state.body.flipScale = lerp(state.body.flipScale, state.body.facing, 0.12);

      // 3. Pitch
      let targetPitch = 0;
      if (dist > 5) {
        targetPitch = Math.atan2(dy, Math.abs(dx));
      }
      state.body.pitch = lerpAngle(state.body.pitch, targetPitch, springRotation);

      // 4. Bobbing
      const bobY = Math.sin(state.time * 0.003) * 6;

      // --- Sway Logic ---
      const targetSwaySpeed = isMoving ? swaySpeedMove : swaySpeedIdle;
      state.swayPhase += targetSwaySpeed * 16;
      const sway = Math.sin(state.swayPhase) * swayAmp;

      // --- Attachments ---
      const flip = state.body.flipScale;
      const cos = Math.cos(state.body.pitch);
      const sin = Math.sin(state.body.pitch);
      
      const scaleMult = cfg.behavior.scale;

      const getAttachedPos = (lx: number, ly: number) => {
        const slx = lx * scaleMult;
        const sly = ly * scaleMult;
        const rx = slx * cos - sly * sin;
        const ry = slx * sin + sly * cos;
        const sx = rx * flip;
        const sy = ry;
        return { x: state.body.x + sx, y: state.body.y + sy };
      };

      // Tail Socket: Back edge (-50) -> Gap (attach at -54)
      const tailPos = getAttachedPos(-54, 0);
      state.tail.x = lerp(state.tail.x, tailPos.x, springTail);
      state.tail.y = lerp(state.tail.y, tailPos.y, springTail);

      // Dorsal Socket: Top edge (-20) -> Gap (bottom at -24) -> Half-height(5) = Pivot Y at -29
      // X shifted to 15 to balance larger fin length
      const dorsalPos = getAttachedPos(15, -29);
      state.dorsal.x = lerp(state.dorsal.x, dorsalPos.x, springTail * 0.9);
      state.dorsal.y = lerp(state.dorsal.y, dorsalPos.y, springTail * 0.9);

      // --- Rotation Physics & Constraints ---
      const sign = state.body.flipScale >= 0 ? 1 : -1;

      // Tail
      state.tail.angle = lerpAngle(state.tail.angle, state.body.pitch, springTail);
      const targetDroop = isMoving ? 0 : 0.5;
      state.tail.droop = lerp(state.tail.droop, targetDroop, 0.03);
      
      // Drag & Sway
      const drag = clamp((state.body.pitch - state.tail.angle) * 2.0, -0.35, 0.35); 
      
      let tailBaseRot = (state.tail.angle + drag + sway) * sign;
      let finalTailRot = tailBaseRot - state.tail.droop;
      
      // CRITICAL: Constrain tail rotation to body pitch to prevent "fracture"
      // Max deviation: ~0.45 radians
      finalTailRot = constrainAngle(state.body.pitch, finalTailRot, 0.45);


      // Dorsal
      state.dorsal.angle = lerpAngle(state.dorsal.angle, state.body.pitch, springTail * 0.9);
      const dorsalSway = Math.sin(state.swayPhase + 1) * (swayAmp * 0.5);
      let finalDorsalRot = (state.dorsal.angle + dorsalSway) * sign; 
      
      // Constrain dorsal rotation
      finalDorsalRot = constrainAngle(state.body.pitch, finalDorsalRot, 0.3);

      // --- Eye Tracking ---
      // 眼睛基准位置：相对于鱼身体中心的坐标
      // 修改 EYE_BASE 即可同步
      const eyePos = getAttachedPos(EYE_BASE.x, EYE_BASE.y);
      const eyeWorldX = eyePos.x;
      const eyeWorldY = eyePos.y + bobY;
      const lookDx = state.mouse.x - eyeWorldX;
      const lookDy = state.mouse.y - eyeWorldY;
      
      const safeFlip = Math.abs(flip) < 0.1 ? (flip >= 0 ? 0.1 : -0.1) : flip;
      const unscaledX = lookDx / safeFlip;
      const unscaledY = lookDy; 
      
      const invCos = Math.cos(-state.body.pitch);
      const invSin = Math.sin(-state.body.pitch);
      const localLookX = unscaledX * invCos - unscaledY * invSin;
      const localLookY = unscaledX * invSin + unscaledY * invCos;
      
      const pupilDist = Math.min(3 * scaleMult, Math.sqrt(localLookX * localLookX + localLookY * localLookY));
      const pupilAngle = Math.atan2(localLookY, localLookX);
      let finalPupilX = Math.cos(pupilAngle) * pupilDist;
      let finalPupilY = Math.sin(pupilAngle) * pupilDist;

      // 处于悬浮不动时，瞳孔回到中心位置
      if (!isMoving) {
        finalPupilX = 2;
        finalPupilY = 0;
      }


      // --- Apply DOM Updates ---
      if (bodyRef.current) {
        bodyRef.current.style.transform = 
          `translate(${state.body.x}px, ${state.body.y + bobY}px) scale(${state.body.flipScale * scaleMult}, ${scaleMult}) rotate(${state.body.pitch}rad)`;
      }

      if (tailRef.current) {
        tailRef.current.style.transform = 
          `translate(${state.tail.x}px, ${state.tail.y + bobY}px) scale(${state.body.flipScale * scaleMult}, ${scaleMult}) rotate(${finalTailRot}rad)`;
      }

      if (dorsalRef.current) {
        dorsalRef.current.style.transform = 
          `translate(${state.dorsal.x}px, ${state.dorsal.y + bobY}px) scale(${state.body.flipScale * scaleMult}, ${scaleMult}) rotate(${finalDorsalRot}rad)`;
      }

      if (pupilRef.current) {
        // 瞳孔基准位置需要与 SVG 中的眼睛位置保持一致
        pupilRef.current.setAttribute('cx', (EYE_BASE.x + finalPupilX).toString());
        pupilRef.current.setAttribute('cy', (EYE_BASE.y + finalPupilY).toString());
      }

      rAF = requestAnimationFrame(animate);
    };

    rAF = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rAF);
    };
  }, []);

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none drop-shadow-xl z-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
      <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.colors.body} stopOpacity="1" />
          <stop offset="50%" stopColor={config.colors.body} stopOpacity="0.8" />
          <stop offset="100%" stopColor={config.colors.body} stopOpacity="0.6" />
        </linearGradient>

        <linearGradient id="tailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={config.colors.tail} stopOpacity="0.4" />
          <stop offset="100%" stopColor={config.colors.tail} stopOpacity="1" />
        </linearGradient>
        <linearGradient id="dorsalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={config.colors.dorsal} stopOpacity="0.4" />
          <stop offset="100%" stopColor={config.colors.dorsal} stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* 鱼尾巴 - 会根据游动状态进行旋转和摆动 */}
      <g ref={tailRef} style={{ willChange: 'transform' }}>
        <path d={PATH_TAIL} fill="url(#tailGradient)" />
      </g>

      {/* 鱼背鳍 - 会根据游动状态进行轻微摆动 */}
      <g ref={dorsalRef} style={{ willChange: 'transform' }}>
         <path d={PATH_DORSAL} fill="url(#dorsalGradient)" />
      </g>

      {/* 鱼身体及其眼睛 */}
      <g ref={bodyRef} style={{ willChange: 'transform' }}>
        {/* 鱼身体主体 */}
        <path d={PATH_BODY} fill="url(#bodyGradient)" />

        {/* 眼睛 - 位置与大小基于 EYE_BASE / EYE_RADIUS */}
        <circle cx={EYE_BASE.x} cy={EYE_BASE.y} r={EYE_RADIUS} fill={config.colors.eye} />

        {/* 瞳孔 - 基准位置与大小基于 EYE_BASE / PUPIL_RADIUS
            运行时会通过 JavaScript 动态计算偏移来跟踪鼠标 */}
        <circle ref={pupilRef} cx={EYE_BASE.x} cy={EYE_BASE.y} r={PUPIL_RADIUS} fill="#171717" />
      </g>
    </svg>
  );
};

export default Goldfish;