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
 */
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

const PATH_TAIL = "M -80 -16 L -78 -16 -78 -14 L -78 -6 L -78 -4 -80 -4 L 8 -4 Q 10 -4 10 -6 L 10 -14 Q 10 -16 8 -16 L -78 -16 Z";
const PATH_DORSAL = "M -80 -5 L -78 -5 -78 -3 L -78 3 L -78 5 -80 5 L -2 5 Q 0 5 0 3 L 0 -3 Q 0 -5 -2 -5 L -78 -5 Z";

const EYE_BASE = { x: 30, y: -3 };
const EYE_RADIUS = 7;
const PUPIL_RADIUS = 5;
const BODY_HALF_WIDTH = 60;
const BODY_HALF_HEIGHT = 35;

/**
 * Feeding / Food constants (tweak if needed)
 */
const MAX_FOOD = 10;
const FOOD_SENSING_RADIUS = 300;
const EAT_RADIUS = 20;
const MAX_EATEN = 8; // threshold to "die"

/** Types **/
type FoodItem = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
};

export interface FishBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface GoldfishProps {
  config: FishConfig;
  bounds?: FishBounds;
}

const Goldfish: React.FC<GoldfishProps> = ({ config, bounds }) => {
  const bodyRef = useRef<SVGGElement | null>(null);
  const dorsalRef = useRef<SVGGElement | null>(null);
  const tailRef = useRef<SVGGElement | null>(null);
  const pupilRef = useRef<SVGCircleElement | null>(null);

  // food DOM refs pool
  const foodRefs = useRef<(SVGGElement | null)[]>([]);

  const configRef = useRef(config);
  const boundsRef = useRef<FishBounds | null>(bounds || null);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    boundsRef.current = bounds || null;
  }, [bounds]);

  // Physics + gameplay state (mutable ref used by rAF loop)
  const physics = useRef<any>({
    time: 0,
    swayPhase: 0,
    mouse: { x: 0, y: 0 },
    body: {
      x: 0,
      y: 0,
      pitch: 0,
      facing: 1,
      flipScale: 1,
    },
    tail: { x: 0, y: 0, angle: 0, droop: 0 },
    dorsal: { x: 0, y: 0, angle: 0 },
    // Feeding/gameplay fields
    eatenCount: 0,
    growthModifier: 0,
    isDead: false,
    food: Array.from({ length: MAX_FOOD }).map(() => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
    })) as FoodItem[],
  });

  useEffect(() => {
    const getBounds = () => {
      if (boundsRef.current) return boundsRef.current;
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    };
    const clampToBounds = (bounds: FishBounds, x: number, y: number, scale: number) => {
      const paddingX = BODY_HALF_WIDTH * scale;
      const paddingY = BODY_HALF_HEIGHT * scale;
      return {
        x: clamp(x, paddingX, Math.max(paddingX, bounds.width - paddingX)),
        y: clamp(y, paddingY, Math.max(paddingY, bounds.height - paddingY)),
      };
    };

    // Initialize positions after component mounts (client-side only)
    const initialBounds = getBounds();
    const centerX = initialBounds.width / 2;
    const centerY = initialBounds.height / 2;
    physics.current.mouse = { x: centerX, y: centerY };
    physics.current.body.x = centerX;
    physics.current.body.y = centerY;
    physics.current.tail.x = centerX;
    physics.current.tail.y = centerY;
    physics.current.dorsal.x = centerX;
    physics.current.dorsal.y = centerY;

    // --- Interaction handlers ---
    const handleMouseMove = (e: MouseEvent) => {
      const currentBounds = getBounds();
      const localX = e.clientX - currentBounds.left;
      const localY = e.clientY - currentBounds.top;
      const safe = clampToBounds(currentBounds, localX, localY, configRef.current.behavior.scale);
      physics.current.mouse.x = safe.x;
      physics.current.mouse.y = safe.y;
    };

    // Use global click for feeding so we don't change svg pointer-events/style
    const handleGlobalClick = (e: MouseEvent) => {
      // If dead, cannot feed
      if (physics.current.isDead) return;
      const currentBounds = getBounds();
      const localX = e.clientX - currentBounds.left;
      const localY = e.clientY - currentBounds.top;
      if (localX < 0 || localX > currentBounds.width || localY < 0 || localY > currentBounds.height) {
        return;
      }
      // find inactive food
      const flake = physics.current.food.find((f: FoodItem) => !f.active);
      if (!flake) return;
      flake.active = true;
      const safe = clampToBounds(currentBounds, localX, localY, configRef.current.behavior.scale);
      flake.x = safe.x;
      flake.y = safe.y;
      flake.vx = (Math.random() - 0.5) * 1;
      flake.vy = 2 + Math.random() * 2;
      flake.rot = Math.random() * 360;
      // show corresponding DOM if exists
      const idx = physics.current.food.indexOf(flake);
      const el = foodRefs.current[idx];
      if (el) {
        el.style.display = 'block';
        el.style.transform = `translate(${flake.x}px, ${flake.y}px) rotate(${flake.rot}deg)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleGlobalClick);

    let rAF = 0;

    const animate = () => {
      const state = physics.current;
      const cfg = configRef.current;
      const currentBounds = getBounds();

      state.time += 16;

      // scale multiplier used for movement transforms (kept as original so fish style not altered)
      const scaleMult = cfg.behavior.scale;

      // --- Feeding / Food updates ---
      let targetX = state.mouse.x;
      let targetY = state.mouse.y;
      const targetSafe = clampToBounds(currentBounds, targetX, targetY, scaleMult);
      targetX = targetSafe.x;
      targetY = targetSafe.y;
      let minDist = FOOD_SENSING_RADIUS;
      let foundFood = false;

      for (let i = 0; i < state.food.length; i++) {
        const f = state.food[i] as FoodItem;
        const el = foodRefs.current[i];
        if (!f.active) continue;

        // simple physics
        f.y += f.vy;
        f.x += Math.sin(state.time * 0.01 + f.rot) * 0.5;
        f.rot += 2;

        if (el) {
          el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.rot}deg)`;
          el.style.display = 'block';
        }

        // out of bounds cleanup
        if (f.y > currentBounds.height + 50 || f.x < -50 || f.x > currentBounds.width + 50) {
          f.active = false;
          if (el) el.style.display = 'none';
          continue;
        }

        if (state.isDead) continue; // dead fish don't eat

        // head approximate position (same estimate you used elsewhere)
        const headX = state.body.x + (Math.cos(state.body.pitch) * 40 * state.body.facing);
        const headY = state.body.y + (Math.sin(state.body.pitch) * 40);

        const dx = f.x - headX;
        const dy = f.y - headY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Eating check (use EAT_RADIUS scaled by growthModifier slightly)
        const effectiveEatRadius = EAT_RADIUS * (1 + (state.growthModifier || 0));
        if (dist < effectiveEatRadius) {
          f.active = false;
          if (el) el.style.display = 'none';

          state.eatenCount += 1;
          state.growthModifier = (state.growthModifier || 0) + 0.1; // grow a bit

          if (state.eatenCount >= MAX_EATEN) {
            state.isDead = true;
          }
        } else if (dist < minDist) {
          minDist = dist;
          targetX = f.x;
          targetY = f.y;
          foundFood = true;
        }
      }

      // --- Fish movement & physics (mostly your original logic) ---
      const agility = cfg.behavior.agility;
      const baseSpringBody = 0.005 + (agility * 0.075);
      const springBody = foundFood ? baseSpringBody * 3 : baseSpringBody; // Faster movement towards food
      const springRotation = 0.01 + (agility * 0.08);
      const springTail = 0.2 + (agility * 0.6);

      const energy = cfg.behavior.energy;
      const swaySpeedMove = 0.005 + (energy * 0.03);
      const swaySpeedIdle = 0.001 + (energy * 0.005);
      const swayAmp = 0.05 + (energy * 0.05);

      // If dead: simple float-to-surface + belly-up behavior
      if (state.isDead) {
        // float up slowly to y ~ 150
        const floatTargetX = state.body.x + Math.sin(state.time * 0.002) * 0.5;
        const floatTargetY = Math.min(150, currentBounds.height * 0.3);
        state.body.x = lerp(state.body.x, floatTargetX, 0.01);
        state.body.y = lerp(state.body.y, floatTargetY, 0.005);
        // belly up
        state.body.pitch = lerpAngle(state.body.pitch, Math.PI, 0.02);
        // pupil hide if exists
        if (pupilRef.current) pupilRef.current.style.opacity = '0';
      } else {
        // ALIVE behavior (targeting food if found)
        // 1. Body Movement
        state.body.x = lerp(state.body.x, targetX, springBody);
        state.body.y = lerp(state.body.y, targetY, springBody);
        const bodySafe = clampToBounds(currentBounds, state.body.x, state.body.y, scaleMult);
        state.body.x = bodySafe.x;
        state.body.y = bodySafe.y;

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
        } else if (!foundFood) {
          targetPitch = 0;
        }
        state.body.pitch = lerpAngle(state.body.pitch, targetPitch, springRotation);

        // 4. Bobbing
        const bobY = Math.sin(state.time * 0.003) * 6;

        // sway
        const targetSwaySpeed = isMoving ? swaySpeedMove : swaySpeedIdle;
        state.swayPhase += targetSwaySpeed * 16;
        const sway = Math.sin(state.swayPhase) * swayAmp;

        // attachments & transforms (same as original)
        const flip = state.body.flipScale;
        const cos = Math.cos(state.body.pitch);
        const sin = Math.sin(state.body.pitch);

        const getAttachedPos = (lx: number, ly: number) => {
          const slx = lx * scaleMult;
          const sly = ly * scaleMult;
          const rx = slx * cos - sly * sin;
          const ry = slx * sin + sly * cos;
          const sx = rx * flip;
          const sy = ry;
          return { x: state.body.x + sx, y: state.body.y + sy };
        };

        // Tail & dorsal positions
        const tailPos = getAttachedPos(-54, 0);
        state.tail.x = lerp(state.tail.x, tailPos.x, springTail);
        state.tail.y = lerp(state.tail.y, tailPos.y, springTail);

        const dorsalPos = getAttachedPos(15, -29);
        state.dorsal.x = lerp(state.dorsal.x, dorsalPos.x, springTail * 0.9);
        state.dorsal.y = lerp(state.dorsal.y, dorsalPos.y, springTail * 0.9);

        // Tail rotation
        state.tail.angle = lerpAngle(state.tail.angle, state.body.pitch, springTail);
        const targetDroop = isMoving ? 0 : 0.5;
        state.tail.droop = lerp(state.tail.droop, targetDroop, 0.03);
        const drag = clamp((state.body.pitch - state.tail.angle) * 2.0, -0.35, 0.35);
        let tailBaseRot = (state.tail.angle + drag + sway) * (state.body.flipScale >= 0 ? 1 : -1);
        let finalTailRot = tailBaseRot - state.tail.droop;
        finalTailRot = constrainAngle(state.body.pitch, finalTailRot, 0.45);

        // Dorsal rotation
        state.dorsal.angle = lerpAngle(state.dorsal.angle, state.body.pitch, springTail * 0.9);
        const dorsalSway = Math.sin(state.swayPhase + 1) * (swayAmp * 0.5);
        let finalDorsalRot = (state.dorsal.angle + dorsalSway) * (state.body.flipScale >= 0 ? 1 : -1);
        finalDorsalRot = constrainAngle(state.body.pitch, finalDorsalRot, 0.3);

        // Eye tracking -> pupil updates
        const eyePos = getAttachedPos(EYE_BASE.x, EYE_BASE.y);
        const eyeWorldX = eyePos.x;
        const eyeWorldY = eyePos.y + bobY;
        const lookDx = (foundFood ? targetX : state.mouse.x) - eyeWorldX;
        const lookDy = (foundFood ? targetY : state.mouse.y) - eyeWorldY;

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

        if (!isMoving) {
          finalPupilX = 2;
          finalPupilY = 0;
        }

        // Apply DOM updates (body/tail/dorsal/pupil)
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
          pupilRef.current.setAttribute('cx', (EYE_BASE.x + finalPupilX).toString());
          pupilRef.current.setAttribute('cy', (EYE_BASE.y + finalPupilY).toString());
          pupilRef.current.style.opacity = '1';
        }
      }

      // If dead, apply body/tail/dorsal transforms to reflect updated positions (so float looks correct)
      if (physics.current.isDead) {
        // compute bobY for dead still visually small
        const bobY = Math.sin(state.time * 0.003) * 2;

        // scale multiplier used for movement transforms
        const scaleMult = cfg.behavior.scale;

        // attachments & transforms for dead state
        const flip = state.body.flipScale;
        const cos = Math.cos(state.body.pitch);
        const sin = Math.sin(state.body.pitch);

        const getAttachedPos = (lx: number, ly: number) => {
          const slx = lx * scaleMult;
          const sly = ly * scaleMult;
          const rx = slx * cos - sly * sin;
          const ry = slx * sin + sly * cos;
          const sx = rx * flip;
          const sy = ry;
          return { x: state.body.x + sx, y: state.body.y + sy };
        };

        // Update tail and dorsal positions to follow floating body
        const tailPos = getAttachedPos(-54, 0);
        state.tail.x = tailPos.x;
        state.tail.y = tailPos.y;

        const dorsalPos = getAttachedPos(15, -29);
        state.dorsal.x = dorsalPos.x;
        state.dorsal.y = dorsalPos.y;

        if (bodyRef.current) {
          bodyRef.current.style.transform =
            `translate(${state.body.x}px, ${state.body.y + bobY}px) scale(${state.body.flipScale * cfg.behavior.scale}, ${cfg.behavior.scale}) rotate(${state.body.pitch}rad)`;
        }
        if (tailRef.current) {
          // tail droops more on death
          const tailDroop = (state.tail.droop || 0) + 0.2;
          tailRef.current.style.transform =
            `translate(${state.tail.x}px, ${state.tail.y + bobY}px) scale(${state.body.flipScale * cfg.behavior.scale}, ${cfg.behavior.scale}) rotate(${(state.tail.angle - tailDroop) }rad)`;
        }
        if (dorsalRef.current) {
          dorsalRef.current.style.transform =
            `translate(${state.dorsal.x}px, ${state.dorsal.y + bobY}px) scale(${state.body.flipScale * cfg.behavior.scale}, ${cfg.behavior.scale}) rotate(${state.dorsal.angle}rad)`;
        }
      }

      rAF = requestAnimationFrame(animate);
    };

    rAF = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleGlobalClick);
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

      {/* FOOD POOL (invisible by default; shown when active) */}
      {physics.current.food.map((_: FoodItem, i: number) => (
        <g
          key={`food-${i}`}
          ref={el => { foodRefs.current[i] = el; }}
          style={{ display: 'none', willChange: 'transform', pointerEvents: 'none' }}
        >
          {/* simple pellet */}
          <rect x={-4} y={-4} width={8} height={8} fill="#d97706" rx={2} />
        </g>
      ))}

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

        {/* 瞳孔 - 基准位置与大小基于 EYE_BASE / PUPIL_RADIUS */}
        <circle ref={pupilRef} cx={EYE_BASE.x} cy={EYE_BASE.y} r={PUPIL_RADIUS} fill="#171717" style={{ transition: 'opacity 0.2s' }} />
      </g>
    </svg>
  );
};

export default Goldfish;
