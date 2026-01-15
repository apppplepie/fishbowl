import React, { useState, useEffect } from 'react';

// 注入CSS动画样式
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
    if (visible && imageUrl) {
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
          if (!isLoaded) {
            setShowLoading(true);
          }
        }, 200);

        img.onload = () => {
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

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* 左箭头 */}
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
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
        >
          ‹
        </button>
      )}

      {/* 右箭头 */}
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
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
        >
          ›
        </button>
      )}

      {/* 加载状态 */}
      {showLoading && (
        <div style={{ color: '#fff', fontSize: '16px' }}>
          {/* 加载中... */}
        </div>
      )}

      {/* 图片和描述 */}
      {!loading && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'scaleIn 0.25s ease',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          key={animationKey}
        >
          <img
            draggable={false}
            alt="图片预览"
            src={imageUrl}
            style={{
              maxWidth: '90vw',
              maxHeight: description ? '80vh' : '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
          {/* 描述 - 仅在有内容时显示 */}
          {description && (
            <p style={{
              marginTop: '16px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              lineHeight: '1.6',
              textAlign: 'center',
              maxWidth: '600px',
              padding: '0 16px',
            }}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* 页码指示器 */}
      {totalCount > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
        }}>
          {currentIndex + 1} / {totalCount}
        </div>
      )}
    </div>
  );
};

export default ImageCardModal;

