export interface GradientConfig {
    background: string;
    textColor: string;
    borderColor: string;
    shadowColor: string;
    pillBg: string;
  }
  
  /**
   * 改进的哈希函数，使用多种哈希策略确保更好的分布
   * Returns a deterministic integer for any given string.
   */
  function hashString(str: string): number {
    let hash1 = 5381;
    let hash2 = 52711;
    
    // 交替使用前后字符，最大化差异
    const len = str.length;
    for (let i = 0; i < len; i++) {
      // 从后面开始，间隔取字符
      const frontIndex = i;
      const backIndex = len - 1 - i;
      
      if (frontIndex < len) {
        const frontChar = str.charCodeAt(frontIndex);
        hash1 = ((hash1 << 5) + hash1) ^ frontChar;
      }
      
      if (backIndex >= 0 && backIndex !== frontIndex) {
        const backChar = str.charCodeAt(backIndex);
        hash2 = ((hash2 << 7) + hash2) ^ backChar;
      }
    }
    
    return Math.abs((hash1 ^ (hash2 >>> 16)));
  }
  
  /**
   * 生成多个独立的哈希值用于不同的颜色参数
   */
  function generateHashSeeds(id: string): number[] {
    const seeds: number[] = [];
    // 为不同部分生成不同的种子
    seeds.push(hashString(id));
    seeds.push(hashString(id + '_hue'));
    seeds.push(hashString(id + '_sat'));
    seeds.push(hashString(id + '_light'));
    seeds.push(hashString(id + '_angle'));
    return seeds;
  }
  
  /**
   * Maps a number to a range [min, max]
   */
  function mapRange(value: number, min: number, max: number): number {
    return min + (value % (max - min + 1));
  }
  
  /**
   * Generates a deterministic gradient configuration based on an ID.
   * 改进版：确保渐变更明显
   */
  export function generateVisualsFromId(id: string): GradientConfig {
    const seeds = generateHashSeeds(id);
    const [mainSeed, hueSeed, satSeed, lightSeed, angleSeed] = seeds;
  
    // Strategy Selector
    const strategy = mainSeed % 100;
    
    // 使用独立的种子生成不同的参数，增加变化
    const baseHue = mapRange(hueSeed, 0, 360);
    const angle = mapRange(angleSeed, 0, 360);
  
    let h1, s1, l1, h2, s2, l2;
  
    if (strategy < 40) {
      // 鲜艳渐变：高饱和度，中等明度
      h1 = baseHue;
      s1 = mapRange(satSeed, 75, 95); 
      l1 = mapRange(lightSeed, 65, 75); 
      
      // 增加色相偏移，让渐变更明显
      const hueShift = mapRange(mainSeed >> 4, 30, 80);
      h2 = (baseHue + hueShift) % 360;
      s2 = mapRange(satSeed >> 2, 70, 90);
      l2 = mapRange(lightSeed >> 2, 75, 85);
  
    } else if (strategy < 80) {
      // 柔和渐变：中等饱和度，高明度
      h1 = baseHue;
      s1 = mapRange(satSeed, 55, 75);
      l1 = mapRange(lightSeed, 85, 93);
  
      const hueShift = mapRange(mainSeed >> 4, 40, 120); 
      h2 = (baseHue + hueShift) % 360;
      s2 = mapRange(satSeed >> 2, 60, 80);
      l2 = mapRange(lightSeed >> 2, 80, 90);
  
    } else {
      // 活力渐变：高饱和度，明度差异大
      h1 = baseHue;
      s1 = mapRange(satSeed, 80, 100); 
      l1 = mapRange(lightSeed, 70, 80);  
  
      const hueShift = mapRange(mainSeed >> 4, 60, 150); 
      h2 = (baseHue + hueShift) % 360;
      s2 = mapRange(satSeed >> 2, 75, 95);
      l2 = mapRange(lightSeed >> 2, 82, 92);
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
  