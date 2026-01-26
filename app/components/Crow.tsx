import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CrowProps {
  className?: string;
}

type InteractionState = 'idle' | 'sleeping';
type ReactionType = 'none' | 'avoid-left' | 'avoid-right' | 'shake' | 'wing' | 'hop';

export const Crow: React.FC<CrowProps> = ({ className }) => {
  const [state, setState] = useState<InteractionState>('idle');
  const [reaction, setReaction] = useState<ReactionType>('none');
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isCawing, setIsCawing] = useState(false); // Legacy caw state for head clicks when awake

  const svgRef = useRef<SVGSVGElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Idle System ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    // Only set timer to go to sleep if currently idle/awake
    if (state === 'idle') {
      idleTimerRef.current = setTimeout(() => {
        setState('sleeping');
      }, 30000); // 30 seconds
    }
  }, [state]);

  // Reset idle timer on state change to ensure correct behavior
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // --- Mouse Tracking & Interaction Detection ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Any mouse movement resets the idle timer if we are awake
      if (state === 'idle') {
        resetIdleTimer();
      }

      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Eye tracking
      const maxDist = 10; 
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(distance, maxDist); 
      
      // If sleeping, eye doesn't track (pupil centers)
      if (state === 'sleeping') {
        setEyeOffset({ x: 0, y: 0 });
      } else {
        setEyeOffset({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [state, resetIdleTimer]);


  // --- Interaction Handlers ---

  const triggerReaction = (e: React.MouseEvent) => {
    // If already reacting, ignore
    if (reaction !== 'none') return;

    const rect = svgRef.current?.getBoundingClientRect();
    const isLeft = rect ? (e.clientX < (rect.left + rect.width / 2)) : true;

    // Random reaction
    const options: (ReactionType | 'avoid')[] = ['avoid', 'shake', 'wing', 'hop'];
    // Weight 'avoid' slightly to be direction aware
    const choice = options[Math.floor(Math.random() * options.length)];
    
    let finalReaction: ReactionType = 'none';

    if (choice === 'avoid') {
        finalReaction = isLeft ? 'avoid-right' : 'avoid-left';
    } else {
        finalReaction = choice as ReactionType;
    }

    setReaction(finalReaction);

    // Reset reaction after animation
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => {
        setReaction('none');
    }, 600); // slightly longer than longest animation
  };

  const handleHeadClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (state === 'sleeping') {
      // Wake up
      setState('idle');
      resetIdleTimer();
    } else {
      // Awake: Trigger caw (legacy) OR reaction? 
      // Prompt says "When the user clicks on it... Choose ONE reaction".
      // But we also have "Wake Up Interaction" specifically for head.
      // Let's combine: If awake, head click is just a regular interaction (maybe prefers Shake or Caw).
      // We'll treat it as a general interaction for now, but also trigger the 'caw' visual for flavor.
      setIsCawing(true);
      setTimeout(() => setIsCawing(false), 600);
      triggerReaction(e);
    }
  };

  const handleBodyClick = (e: React.MouseEvent) => {
    if (state === 'sleeping') {
      // Clicking body while sleeping does NOT wake it (per specific prompt instruction "clicks on the head")
      // Do nothing or subtle stir? We'll do nothing to enforce the mechanic.
      return;
    }
    triggerReaction(e);
  };

  return (
    <div className={`relative cursor-pointer group ${className || ''}`}>
      <style>{`
        /* --- Base Animations --- */
        
        @keyframes breathe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes wingFlap {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(2deg); }
        }

        @keyframes tailTremble {
          0%, 85% { transform: rotate(0deg); }
          86% { transform: rotate(20deg); }
          87% { transform: rotate(0deg); }
          88% { transform: rotate(10deg); }
          89% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes blink {
            0%, 96%, 100% { transform: scaleY(1); }
            98% { transform: scaleY(0.1); }
        }

        @keyframes cawHead {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes cawJaw {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
        }

        /* --- Reaction Animations --- */

        /* Hop: Moves entire bird */
        @keyframes reactionHop {
            0% { transform: translate(0,0); }
            40% { transform: translate(10px, -30px); }
            100% { transform: translate(0,0); }
        }

        /* Shake: Ruffles feathers (rotate torso) */
        @keyframes reactionShake {
            0% { transform: rotate(0deg); }
            20% { transform: rotate(3deg); }
            40% { transform: rotate(-3deg); }
            60% { transform: rotate(2deg); }
            80% { transform: rotate(-1deg); }
            100% { transform: rotate(0deg); }
        }

        /* Avoid: Leans away */
        @keyframes reactionAvoidLeft {
            0% { transform: translateX(0) rotate(0); }
            50% { transform: translateX(-20px) rotate(-5deg); }
            100% { transform: translateX(0) rotate(0); }
        }
        @keyframes reactionAvoidRight {
            0% { transform: translateX(0) rotate(0); }
            50% { transform: translateX(20px) rotate(5deg); }
            100% { transform: translateX(0) rotate(0); }
        }

        /* Wing: Excited spread */
        @keyframes reactionWing {
            0% { transform: rotate(-5deg); }
            30% { transform: rotate(15deg); }
            60% { transform: rotate(-10deg); }
            100% { transform: rotate(-5deg); }
        }

        /* --- Class Logic --- */

        /* IDLE / BREATHING */
        .anim-breathe {
          animation: breathe 6s ease-in-out infinite;
        }
        .anim-wing-idle {
          animation: wingFlap 7s ease-in-out infinite;
          transform-origin: 737px 296px;
        }
        .anim-tail {
          animation: tailTremble 8s ease-out infinite;
          transform-origin: 911px 743px;
        }
        .anim-blink {
          animation: blink 7s linear infinite;
          transform-origin: 450px 294px;
        }

        /* SLEEP STATE */
        /* Head tucks down and rotates slightly */
        .head-complex {
            transition: transform 1.5s ease-in-out;
            transform-origin: 500px 500px; /* Pivot around lower neck/body intersection area */
        }
        .state-sleeping .head-complex {
            transform: translateY(50px) rotate(15deg) translateX(-10px);
        }
        
        /* Eye closes (white part fades) */
        .eye-sclera {
            transition: opacity 1s ease-in-out;
        }
        .state-sleeping .eye-sclera {
            opacity: 0;
        }
        /* Stop blinking when sleeping (eye is closed) */
        .state-sleeping .anim-blink {
            animation: none;
        }
        /* Stop tail trembling when sleeping */
        .state-sleeping .anim-tail {
            animation: none;
        }

        /* CAWING (Awake Head Interaction) */
        .anim-head-group {
          transform-origin: 615px 374px;
          transition: transform 0.4s ease-in-out;
        }
        .cawing .anim-head-group {
          animation: cawHead 0.4s ease-in-out;
        }
        .anim-jaw {
          transform-origin: 617px 360px;
          transition: transform 0.4s ease-in-out;
        }
        .cawing .anim-jaw {
          animation: cawJaw 0.4s ease-in-out;
        }

        /* REACTIONS */
        
        /* Hop applied to Root */
        .react-hop {
            animation: reactionHop 0.4s ease-out;
        }

        /* Torso Reactions (Shake, Avoid) */
        .torso-group {
            transform-origin: 729px 832px; /* Pivot around legs */
            transition: transform 0.3s ease-out;
        }
        .react-shake .torso-group {
            animation: reactionShake 0.4s linear;
        }
        .react-avoid-left .torso-group {
            animation: reactionAvoidLeft 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .react-avoid-right .torso-group {
            animation: reactionAvoidRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* Wing Reaction */
        .react-wing .anim-wing-idle {
            animation: reactionWing 0.5s ease-out;
        }

      `}</style>

      <svg 
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 1300 1400" 
        width="100%" 
        height="100%"
        className={`drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02] ${state === 'sleeping' ? 'state-sleeping' : ''}`}
        onClick={handleBodyClick}
      >
        {/* 
            HIERARCHY RESTRUCTURED FOR ANIMATION:
            
            Root Group (Handles HOP reaction)
              -> Legs (Stationary base, only moves on Hop)
              -> Torso Group (Handles AVOID, SHAKE reactions)
                  -> Head Complex (Head, Eye, Jaw) - Handles SLEEP tuck
                  -> Body Group (Body, Wing) - Handles BREATHING
                  -> Tail - Handles TREMBLE
        */}

        <g className={`root-group ${reaction === 'hop' ? 'react-hop' : ''}`}>
            
            {/* LEGS: Drawn first (behind body) but geometrically low. 
                Original points: 729,832 ... 
            */}
            <polygon
                id="leg"
                fill="#1a1a1a"
                points="729,832 703,832 540,880 538,902 727,902"
            />

            {/* TORSO GROUP: Everything above the legs */}
            <g className={`torso-group ${reaction !== 'none' ? `react-${reaction}` : ''}`}>
                
                {/* HEAD COMPLEX: Moves together for sleep */}
                <g 
                    className={`head-complex ${isCawing ? 'cawing' : ''}`}
                    onClick={handleHeadClick}
                >
                    {/* Inner Head Group for Cawing rotation */}
                    <g className="anim-head-group">
                        <polygon
                            id="head"
                            fill="#1a1a1a"
                            points="225,333 225,374 615,374 615,206 362,206"
                        />
                        <g id="eye">
                            {/* Sclera: fades out on sleep */}
                            <circle 
                                className="anim-blink eye-sclera"
                                cx="450" cy="294" r="36" fill="#ffffff" 
                            />
                            {/* Pupil */}
                            <circle 
                                cx="450" 
                                cy="294" 
                                r="24" 
                                fill="#000000" 
                                style={{ 
                                transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                                transition: 'transform 0.1s ease-out'
                                }}
                            />
                        </g>
                    </g>
                    
                    {/* Jaw (part of head complex for sleep, separate for cawing) */}
                    <polygon
                        id="jaw"
                        className="anim-jaw"
                        fill="#1a1a1a"
                        points="227,360 227,393 617,393 617,360"
                    />
                </g>

                {/* BODY GROUP: Breathing Animation */}
                <g className="anim-breathe">
                    <polygon
                        id="body"
                        fill="#1a1a1a"
                        points="388,499 590,767 924,823 961,795 611,331"
                    />
                    {/* Wing */}
                    <polygon
                        id="wing"
                        className="anim-wing-idle transition-colors duration-300 hover:fill-gray-800"
                        fill="#1a1a1a"
                        points="737,296 652,338 895,857 980,817"
                    />
                </g>

                {/* TAIL */}
                <polygon
                    id="tail"
                    className="anim-tail"
                    fill="#1a1a1a"
                    points="911,743 838,779 1091,1297 1165,1261"
                />

            </g>
        </g>
      </svg>
    </div>
  );
};