import React, { useRef, useEffect } from 'react';
import { noiseGenerator } from '../../utils/noise';
import { PlantSettings } from '../../types/garden';

interface RootSystemProps {
  x: number; // 水平位置（像素）
  baselineY: number; // 基线Y位置（像素）
  dna: PlantSettings; // 植物DNA
  containerHeight: number; // 容器高度（用于计算根系最大长度）
  animationProgress?: number; // 动画进度 0-1，用于从无到有的生长效果
}

interface RootGrower {
  x: number;
  y: number;
  angle: number; // in radians
  life: number;
  maxLife: number;
  width: number;
  speed: number;
  generation: number; // 0 for main root, 1 for branch
  noiseOffset: number;
}

/**
 * 根系生成组件
 * 根据DNA和位置生成从基线向下生长的根系
 */
const RootSystem: React.FC<RootSystemProps> = ({
  x,
  baselineY,
  dna,
  containerHeight,
  animationProgress = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 根据DNA计算根系参数
    // 根系长度：基于maxLife，转换为像素长度，增加三倍
    const maxRootLength = Math.min(
      containerHeight - baselineY, // 不能超过容器底部
      dna.maxLife * 2.5 * 3 // 基于maxLife，长三倍
    );

    // 根系粗细：基于baseWidth，更粗一点
    const rootBaseWidth = dna.baseWidth;

    // 分支概率：基于DNA，但更少（艺术一点）
    // 使用leafFrequency作为参考，但降低
    let branchChance = dna.leafFrequency * 0.3; // 比叶子频率低很多
    if (branchChance < 0.01) branchChance = 0.01; // 最小1%
    if (branchChance > 0.02) branchChance = 0.02; // 最大2%（更艺术，枝杈少）

    // 分支角度偏移：类似BERRY
    const branchAngleOffset = 0.9;

    // 使用x坐标作为噪声种子，确保同一位置生成相同根系
    const noiseSeed = x * 0.01 + dna.maxLife * 0.1;

    // 创建根系生长器（类似Grower）
    const createRootGrower = (
      startX: number,
      startY: number,
      generation: number,
      initialAngle?: number
    ): RootGrower => {
      const baseAngle = Math.PI / 2; // 向下
      const startAngle = initialAngle ?? (baseAngle + (Math.random() * 0.2 - 0.1));
      
      return {
        x: startX,
        y: startY,
        angle: startAngle,
        life: 0,
        maxLife: dna.maxLife * 0.8, // 根系生命稍短
        width: rootBaseWidth * Math.pow(0.75, generation), // 分支变细
        speed: dna.growthSpeed * 0.8, // 根系生长稍慢
        generation,
        noiseOffset: noiseSeed + generation * 100, // 不同generation用不同噪声偏移
      };
    };

    // 存储所有根系生长器和已绘制的段
    const rootGrowers: RootGrower[] = [];
    const rootSegments: Array<{ x: number; y: number; nextX: number; nextY: number; width: number; generation: number }> = [];
    let animationFrameId: number | null = null;

    // 初始化：创建主根（往右偏移一点对齐）
    rootGrowers.push(createRootGrower(x - 4, baselineY, 0));

    // 解析颜色函数
    const parseColor = (color: string) => {
      const hex = color.replace('#', '');
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    };

    // 绘制根系
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 按generation排序，先画主根，再画分支
      const sortedSegments = [...rootSegments].sort((a, b) => a.generation - b.generation);

      sortedSegments.forEach((segment) => {
        // 计算透明度：从基线向下逐渐变淡（调整渐变，让根系在更深的地方才消失）
        const depth = (segment.y - baselineY) / maxRootLength;
        const baseAlpha = Math.max(0, 1 - depth * 0.5); // 在更深的地方才完全透明
        
        // 应用动画进度
        const alpha = baseAlpha * animationProgress;
        
        if (alpha <= 0) return;

        // 根系颜色：使用茎的颜色，但稍微调暗
        const rootColor = segment.generation === 0 
          ? dna.stemColorStart 
          : dna.stemColorEnd;

        const color = parseColor(rootColor);
        // 调暗：减少亮度
        const darkened = {
          r: Math.max(0, color.r * 0.6),
          g: Math.max(0, color.g * 0.5),
          b: Math.max(0, color.b * 0.4),
        };

        ctx.beginPath();
        ctx.moveTo(segment.x, segment.y);
        ctx.lineTo(segment.nextX, segment.nextY);
        ctx.lineWidth = segment.width;
        ctx.strokeStyle = `rgba(${darkened.r}, ${darkened.g}, ${darkened.b}, ${alpha})`;
        ctx.stroke();
      });
    };

    // 更新函数：逐步生长
    const update = () => {
      // 处理每个生长器
      rootGrowers.forEach((grower) => {
        if (grower.life >= grower.maxLife || grower.width < 0.3) {
          return; // 停止生长
        }

        // 检查是否超出范围
        if (grower.y > containerHeight || grower.y - baselineY > maxRootLength) {
          return;
        }

        const progress = grower.life / grower.maxLife;

        // 使用BERRY的噪声逻辑（转180度向下）
        const n = noiseGenerator.noise(
          grower.x * 0.02,
          grower.y * 0.02,
          grower.noiseOffset + grower.life * 0.05
        );
        let angleChange = n * (dna.curlFactor * 2);
        grower.angle += angleChange;

        // 目标角度：向下（Math.PI / 2，转180度）
        const targetAngle = Math.PI / 2;
        grower.angle += (targetAngle - grower.angle) * 0.02; // 修正强度0.02

        // 计算下一位置
        const nextX = grower.x + Math.cos(grower.angle) * grower.speed;
        const nextY = grower.y + Math.sin(grower.angle) * grower.speed;

        // 记录段
        const currentWidth = grower.width * (1 - progress * 0.2); // 逐渐变细，但保留更多宽度
        rootSegments.push({
          x: grower.x,
          y: grower.y,
          nextX,
          nextY,
          width: Math.max(0.5, currentWidth),
          generation: grower.generation,
        });

        // 更新位置
        grower.x = nextX;
        grower.y = nextY;
        grower.life++;

        // 生成分支（类似BERRY逻辑）
        if (grower.generation < 2 && Math.random() < branchChance) {
          const branchAngle = grower.angle + (Math.random() > 0.5 ? branchAngleOffset : -branchAngleOffset);
          const branch = createRootGrower(grower.x, grower.y, grower.generation + 1, branchAngle);
          rootGrowers.push(branch);
        }
      });

      // 移除已完成的生长器（在forEach中直接修改数组会有问题，所以用filter）
      const activeGrowers = rootGrowers.filter(
        (g) => g.life < g.maxLife && g.width >= 0.3 && g.y <= containerHeight && (g.y - baselineY) <= maxRootLength
      );
      
      // 清空并重新填充
      rootGrowers.length = 0;
      rootGrowers.push(...activeGrowers);

      // 绘制
      draw();

      // 如果还有生长器，继续动画
      if (rootGrowers.length > 0) {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    // 开始动画
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [x, baselineY, dna, containerHeight, animationProgress]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2, // 在背景上方，但在植物下方（植物zIndex是10）
      }}
    />
  );
};

export default RootSystem;

