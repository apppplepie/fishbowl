import React, { useState, useEffect } from 'react';
import { Card, Avatar, Spin } from 'antd';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';

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
}

const ImageCardModal: React.FC<ImageCardModalProps> = ({
  visible,
  imageUrl,
  onClose,
  title = 'Image Title',
  description = 'This is the description',
}) => {
  const [loading, setLoading] = useState(true);
  const [percent, setPercent] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setPercent(0);

      // 模拟加载进度
      let ptg = -10;
      const interval = setInterval(() => {
        ptg += 5;
        setPercent(ptg);

        if (ptg > 120) {
          clearInterval(interval);
        }
      }, 100);

      // 加载图片
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setTimeout(() => {
          setLoading(false);
          setPercent(0);
          clearInterval(interval);
        }, 500);
      };

      return () => clearInterval(interval);
    }
  }, [visible, imageUrl]);

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
        {/* 加载状态 */}
        {loading && <Spin spinning={loading} percent={percent} fullscreen />}

        {/* 卡片 */}
        {!loading && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease',
            }}
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

