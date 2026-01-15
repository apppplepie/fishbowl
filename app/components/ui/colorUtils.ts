export interface GradientConfig {
    background: string;
    textColor: string;
    borderColor: string;
    shadowColor: string;
    pillBg: string;
  }
  
  /**
   * A simple, fast hashing function (djb2 implementation)
   * Returns a deterministic integer for any given string.
   */
  function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }
  
  /**
   * Maps a number to a range [min, max]
   */
  function mapRange(value: number, min: number, max: number): number {
    return min + (value % (max - min));
  }
  
  /**
   * Generates a deterministic gradient configuration based on an ID.
   */
  export function generateVisualsFromId(id: string): GradientConfig {
    const seed = hashString(id);
  
    // Strategy Selector
    const strategy = seed % 100;
    
    const baseHue = mapRange(seed, 0, 360);
    const angle = mapRange(seed >> 5, 0, 360);
  
    let h1, s1, l1, h2, s2, l2;
  
    if (strategy < 40) {
      h1 = baseHue;
      s1 = mapRange(seed >> 2, 85, 100); 
      l1 = mapRange(seed >> 3, 68, 78); 
      
      const hueShift = mapRange(seed >> 4, 15, 45);
      h2 = (baseHue + hueShift) % 360;
      s2 = s1 - 5;
      l2 = l1 + 10;
  
    } else if (strategy < 80) {
      h1 = baseHue;
      s1 = mapRange(seed >> 2, 60, 90);
      l1 = mapRange(seed >> 3, 88, 96);
  
      const hueShift = mapRange(seed >> 4, 30, 80); 
      h2 = (baseHue + hueShift) % 360;
      s2 = s1 + 5;
      l2 = l1 - 6;
  
    } else {
      h1 = baseHue;
      s1 = mapRange(seed >> 2, 90, 100); 
      l1 = mapRange(seed >> 3, 76, 86);  
  
      const hueShift = mapRange(seed >> 4, 40, 100); 
      h2 = (baseHue + hueShift) % 360;
      s2 = s1;
      l2 = l1 + 8;
    }
  
    const background = `linear-gradient(${angle}deg, hsl(${h1}, ${s1}%, ${l1}%), hsl(${h2}, ${s2}%, ${l2}%))`;
    const textColor = `hsl(${h1}, 60%, 12%)`;
    const borderColor = `hsla(${h1}, ${s1}%, 35%, 0.15)`;
    const shadowColor = `hsla(${h1}, 90%, 55%, 0.25)`;
    const pillBg = `hsla(${h1}, 40%, 10%, 0.06)`;
  
    return { background, textColor, borderColor, shadowColor, pillBg };
  }
  
  export function formatId(id: string): string {
    if (id.length < 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  }
  