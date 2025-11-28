import React, { useState, useEffect } from 'react';
import { Card, Avatar, Spin, Button } from 'antd';
import { EditOutlined, EllipsisOutlined, SettingOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Meta } = Card;

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
        from { transform: scale(0.8); opacity: 0; }
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
  title = 'Image Title',
  description = 'This is the description',
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext,
}) => {
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
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
      // 加载图片
      const img = new Image();
      img.src = imageUrl;
      let isLoaded = false;

      // 检查图片是否已经缓存（立即加载完成）
      if (img.complete) {
        // 图片已缓存，直接显示，不显示加载动画
        setImageSize({ width: img.width, height: img.height });
        setLoading(false);
        setShowLoading(false);
      } else {
        // 图片需要加载
        setLoading(true);
        setShowLoading(false);

        // 200ms 后如果还在加载，才显示加载动画
        const showLoadingTimer = setTimeout(() => {
          if (!isLoaded) {
            setShowLoading(true);
          }
        }, 200);

        img.onload = () => {
          isLoaded = true;
          setImageSize({ width: img.width, height: img.height });
          // 加载完成后立即显示
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

  // 计算图片的缩放尺寸，最大 70vh
  const calculateSize = () => {
    const maxSize = window.innerHeight * 0.7;
    const ratio = imageSize.width / imageSize.height;

    let width = maxSize * ratio;
    let height = maxSize;

    if (width > maxSize * ratio && ratio > 1) {
      width = maxSize;
      height = maxSize / ratio;
    } else if (height > maxSize) {
      height = maxSize;
      width = maxSize * ratio;
    }

    return { width, height };
  };

  const cardSize = imageSize.width > 0 ? calculateSize() : { width: 300, height: 300 };

  return (
    <>
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* 左箭头按钮 */}
        {!loading && currentIndex > 0 && onPrevious && (
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<LeftOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleSwitch(onPrevious);
            }}
            style={{
              position: 'absolute',
              left: '20px',
              zIndex: 1001,
            }}
          />
        )}

        {/* 右箭头按钮 */}
        {!loading && currentIndex < totalCount - 1 && onNext && (
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<RightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleSwitch(onNext);
            }}
            style={{
              position: 'absolute',
              right: '20px',
              zIndex: 1001,
            }}
          />
        )}

        {/* 加载状态 */}
        {showLoading && <Spin spinning={showLoading} fullscreen />}

        {/* 卡片 */}
        {!loading && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease',
            }}
            key={animationKey}
          >
            <Card
              style={{
                width: cardSize.width,
                maxWidth: '90vw',
              }}
              cover={
                <img
                  draggable={false}
                  alt="example"
                  src={imageUrl}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              }
              actions={[
                <SettingOutlined key="setting" />,
                <EditOutlined key="edit" />,
                <EllipsisOutlined key="ellipsis" />,
              ]}
            >
              <Meta
                avatar={<Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=8" />}
                title={title}
                description={description}
              />
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default ImageCardModal;

