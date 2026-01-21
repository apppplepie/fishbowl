/**
 * 鱼的SVG路径常量
 * 从前端Goldfish.tsx中提取，用于后端生成静态头像
 */

/**
 * 鱼身体的SVG路径
 */
export const PATH_BODY =
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

/**
 * 鱼尾巴的SVG路径
 */
export const PATH_TAIL = "M -80 -16 L -78 -16 -78 -14 L -78 -6 L -78 -4 -80 -4 L 8 -4 Q 10 -4 10 -6 L 10 -14 Q 10 -16 8 -16 L -78 -16 Z";

/**
 * 鱼背鳍的SVG路径
 */
export const PATH_DORSAL = "M -80 -5 L -78 -5 -78 -3 L -78 3 L -78 5 -80 5 L -2 5 Q 0 5 0 3 L 0 -3 Q 0 -5 -2 -5 L -78 -5 Z";

/**
 * 鱼眼睛位置常量
 */
export const EYE_POSITION = { x: 35, y: -8 };
export const EYE_RADIUS = 6;
