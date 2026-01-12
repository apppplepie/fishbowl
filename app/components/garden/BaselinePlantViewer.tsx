import React, { useRef, useEffect, useState } from 'react';
import { BaselinePlant } from '../../types/garden';

interface BaselinePlantViewerProps {
  plants: BaselinePlant[];
  width: number;
  height: number;
}

const BaselinePlantViewer: React.FC<BaselinePlantViewerProps> = ({
  plants,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [plantsState, setPlantsState] = useState<BaselinePlant[]>(plants);

  // 更新植物高度的动画
  const growPlants = (currentPlants: BaselinePlant[]): BaselinePlant[] => {
    return currentPlants.map((plant) => {
      const currentHeight = plant.height ?? 0; // 提供默认值
      if (currentHeight < 150) {  // 最大高度150px
        // 控制植物生长的速度
        return { ...plant, height: Math.min(currentHeight + 0.5, 150) }; // 每帧生长0.5px
      }
      return plant;
    });
  };

  // 合成显示植物
  const compositePlants = (plantsToDraw: BaselinePlant[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制每个基线植物
    plantsToDraw.forEach(plant => {
      // 计算植物的当前高度
      const currentHeight = plant.height || 0;

      // 计算植物在主canvas上的绘制位置
      let drawX, drawY;

      if (plant.canvas.width < width || plant.canvas.height < height) {
        // 小canvas模式：植物canvas的底部对齐基线，中央对齐当前位置
        // 根据当前高度调整绘制位置
        drawX = plant.currentX - plant.canvas.width / 2;
        drawY = plant.y - currentHeight; // 以当前高度绘制植物
      } else {
        // 全尺寸canvas模式：直接在当前位置绘制（考虑拖拽偏移）
        const dx = plant.currentX - plant.originX;
        drawX = dx;
        drawY = 0;
      }

      // 将植物的canvas绘制到主画布上，但只绘制当前高度部分
      if (currentHeight > 0) {
        // 从植物canvas的底部向上绘制当前高度部分
        // 源图像：从植物canvas底部向上取currentHeight高度的部分
        const sourceY = plant.canvas.height - currentHeight;
        
        ctx.drawImage(
          plant.canvas,
          0, // 源x
          sourceY, // 源y（从底部向上）
          plant.canvas.width, // 源宽度
          currentHeight, // 源高度
          drawX, // 目标x
          drawY, // 目标y
          plant.canvas.width, // 目标宽度
          currentHeight // 目标高度
        );
      }
    });
  };

  useEffect(() => {
    // 当外部plants变化时，更新内部状态
    setPlantsState(plants);
  }, [plants]);

  useEffect(() => {
    // 开始动画循环
    const animate = () => {
      // 更新植物高度
      setPlantsState(prevPlants => {
        const updatedPlants = growPlants(prevPlants);
        // 绘制更新后的植物
        compositePlants(updatedPlants);
        return updatedPlants;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 清理函数
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  // 当plantsState变化时立即重新合成
  useEffect(() => {
    compositePlants(plantsState);
  }, [plantsState]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="baseline-plant-viewer"
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};

export default BaselinePlantViewer;
