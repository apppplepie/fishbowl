export interface Bubble {
    id: number;
    x: number;
    size: number;
    speed: number;
    delay: number;
  }
  
  export interface FishProps {
    type: 'orange' | 'blue' | 'purple';
    direction: 'left' | 'right';
    speed: number;
    depth: number;
    scale: number;
  }
  
  export interface CloudProps {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    delay: number;
  }
  
  export interface Theme {
    id: string;
    name: string;
    skyGradient: string; // Tailwind classes or CSS gradients
    waterGradient: string; // Tailwind classes or CSS gradients
    buttonGradient: string; // CSS gradient for theme selector buttons
    pageBg: string; // Tailwind class for the outer background
    orbColors: {
      sun: string; // Hex or RGBA
      atmosphere: string; // Hex or RGBA
      waterLight: string; // Hex or RGBA
      waterDeep: string; // Hex or RGBA
    };
    waveColors: string[]; // Array of RGBA strings for the 4 wave lines

    // PageLayout styles
    pageLayout: {
      box1Bg: string; // Background for box1 (sky section)
      box2Bg: string; // Background for box2 (water section)
      containerPaddingTop: string; // Container top padding
    };
  }

  // Component prop interfaces
  export interface SkySectionProps {
    theme: Theme;
    children?: React.ReactNode;
  }

  export interface WaterSectionProps {
    theme: Theme;
    children?: React.ReactNode;
  }

  export interface WaveSeparatorProps {
    colors: string[]; // waveColors from theme
  }