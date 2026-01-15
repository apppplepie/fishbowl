import { useMemo } from 'react';
import { generateVisualsFromId, GradientConfig } from './colorUtils';

/**
 * 可复用的卡片背景颜色 Hook
 * 根据唯一 ID 生成确定性的渐变背景配置
 * 
 * @param id - 卡片的唯一标识符
 * @returns 包含背景、文字、边框等颜色的配置对象
 * 
 * @example
 * ```tsx
 * const CardComponent = ({ id, title }) => {
 *   const colors = useCardBackground(id);
 *   
 *   return (
 *     <div style={{
 *       background: colors.background,
 *       color: colors.textColor,
 *       border: `1px solid ${colors.borderColor}`,
 *       boxShadow: `0 4px 12px ${colors.shadowColor}`
 *     }}>
 *       {title}
 *     </div>
 *   );
 * };
 * ```
 */
export function useCardBackground(id: string): GradientConfig {
  // 使用 useMemo 确保只在 id 改变时重新计算
  const visualConfig = useMemo(() => {
    if (!id || id.trim() === '') {
      // 如果没有 ID，返回默认的浅色背景
      return {
        background: 'linear-gradient(135deg, hsl(210, 15%, 96%), hsl(210, 15%, 92%))',
        textColor: 'hsl(210, 10%, 20%)',
        borderColor: 'hsla(210, 10%, 50%, 0.15)',
        shadowColor: 'hsla(210, 20%, 50%, 0.15)',
        pillBg: 'hsla(210, 10%, 10%, 0.05)',
      };
    }
    
    return generateVisualsFromId(id);
  }, [id]);

  return visualConfig;
}

/**
 * 生成卡片样式对象的辅助函数
 * 可以直接应用到组件的 style 属性
 * 
 * @param id - 卡片的唯一标识符
 * @param options - 可选的样式配置
 * @returns React CSSProperties 对象
 */
export function getCardBackgroundStyle(
  id: string,
  options?: {
    withBorder?: boolean;
    withShadow?: boolean;
    shadowIntensity?: 'light' | 'medium' | 'heavy';
  }
) {
  const config = generateVisualsFromId(id);
  const { withBorder = true, withShadow = true, shadowIntensity = 'medium' } = options || {};

  const shadowMap = {
    light: `0 2px 8px -2px ${config.shadowColor}`,
    medium: `0 4px 16px -4px ${config.shadowColor}, 0 2px 8px -2px rgba(0,0,0,0.08)`,
    heavy: `0 8px 30px -6px ${config.shadowColor}, 0 4px 12px -4px rgba(0,0,0,0.1)`,
  };

  return {
    background: config.background,
    color: config.textColor,
    ...(withBorder && { border: `1px solid ${config.borderColor}` }),
    ...(withShadow && { boxShadow: shadowMap[shadowIntensity] }),
  };
}

