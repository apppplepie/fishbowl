import React, { useEffect, useState } from 'react';

// 注入CSS动画样式（保留动画）
if (typeof document !== 'undefined') {
  const styleId = 'image-card-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

interface ImageCardModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  title?: string;
  description?: string;
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const ImageCardModal: React.FC<ImageCardModalProps> = ({
  visible,
  imageUrl,
  onClose,
  description,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
}) => {
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // 切换图片时重置动画
  const handleSwitch = (callback?: () => void) => {
    if (callback) {
      setAnimationKey(prev => prev + 1);
      callback();
    }
  };

  useEffect(() => {
    if (!visible) return;

    // 预加载图片
    if (imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      let isLoaded = false;

      if (img.complete) {
        setLoading(false);
        setShowLoading(false);
      } else {
        setLoading(true);
        setShowLoading(false);

        const showLoadingTimer = setTimeout(() => {
          if (!isLoaded) setShowLoading(true);
        }, 200);

        img.onload = () => {
          isLoaded = true;
          clearTimeout(showLoadingTimer);
          setLoading(false);
          setShowLoading(false);
        };

        img.onerror = () => {
          isLoaded = true;
          clearTimeout(showLoadingTimer);
          setLoading(false);
          setShowLoading(false);
        };

        return () => {
          clearTimeout(showLoadingTimer);
        };
      }
    }
  }, [visible, imageUrl, animationKey]);

  // 键盘事件：Esc 关闭，左右切图
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious && currentIndex > 0) {
        handleSwitch(onPrevious);
      } else if (e.key === 'ArrowRight' && onNext && currentIndex < (totalCount - 1)) {
        handleSwitch(onNext);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose, onPrevious, onNext, currentIndex, totalCount]);

  if (!visible) return null;

  return (
    // 外层不再吃点击（无遮罩背景）
    // pointerEvents: 'none' 让页面背景仍可交互；交互的子元素需设置 pointerEvents: 'auto'
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.18s ease',
        pointerEvents: 'none', // 允许页面背景不被遮挡
      }}
    >
      {/* 左箭头（显示并可点击） */}
      {!loading && currentIndex > 0 && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSwitch(onPrevious);
          }}
          style={{
            position: 'absolute',
            left: '20px',
            zIndex: 1001,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.45)',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
            pointerEvents: 'auto', // 关键：使按钮可点击
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)')}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {/* 右箭头（显示并可点击） */}
      {!loading && currentIndex < totalCount - 1 && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSwitch(onNext);
          }}
          style={{
            position: 'absolute',
            right: '20px',
            zIndex: 1001,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.45)',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)')}
          aria-label="Next image"
        >
          ›
        </button>
      )}

      {/* 加载状态提示（可点击样式默认不可点） */}
      {showLoading && (
        <div style={{ position: 'absolute', top: '20px', zIndex: 1001, pointerEvents: 'auto' }}>
          <span style={{ color: '#000', fontSize: '14px' }}>加载中…</span>
        </div>
      )}

      {/* 图片容器 — 这是唯一会拦截点击的区域 */}
      {!loading && (
        <div
          // 使此容器可接收点击（阻止穿透到页面）
          style={{
            animation: 'scaleIn 0.22s ease',
            maxWidth: '95vw',
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'auto', // 关键：容器可交互
            gap: description ? 12 : 0,
          }}
          key={animationKey}
        >
          <img
            draggable={false}
            alt={description ?? '图片预览'}
            src={imageUrl}
            // 点击图片直接关闭（符合你的需求：再点一次缩回去）
            onClick={() => {
              onClose();
            }}
            style={{
              maxWidth: '95vw',
              maxHeight: description ? '95vh' : '95vh',
              objectFit: 'contain',
              borderRadius: '8px',
              cursor: 'zoom-out',
              userSelect: 'none',
              // @ts-ignore
              WebkitUserDrag: 'none',
            }}
          />

          {/* 描述 - 仅在有内容时显示 */}
          {description && (
            <p
              style={{
                marginTop: 12,
                color: 'rgba(0,0,0,0.85)',
                fontSize: 14,
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: 600,
                padding: '0 12px',
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 6,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* 页码指示器（可点击以防穿透） */}
      {totalCount > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            zIndex: 1001,
            fontSize: 14,
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.9)',
            color: '#000',
            padding: '6px 10px',
            borderRadius: 999,
          }}
        >
          {currentIndex + 1} / {totalCount}
        </div>
      )}
    </div>
  );
};

export default ImageCardModal;
