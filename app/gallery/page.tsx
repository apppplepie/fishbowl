'use client';

import React, { useState, useEffect } from 'react';
import { Masonry } from 'antd';
import PageLayout from '../components/PageLayout';
import Header from '../components/Header';
import ImageCardModal from '../components/ImageCardModal';

const imageList = [
  'https://images.unsplash.com/photo-1510001618818-4b4e3d86bf0f',
  'https://images.unsplash.com/photo-1507513319174-e556268bb244',
  'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2',
  'https://images.unsplash.com/photo-1492778297155-7be4c83960c7',
  'https://images.unsplash.com/photo-1508062878650-88b52897f298',
  'https://images.unsplash.com/photo-1506158278516-d720e72406fc',
  'https://images.unsplash.com/photo-1552203274-e3c7bd771d26',
  'https://images.unsplash.com/photo-1528163186890-de9b86b54b51',
  'https://images.unsplash.com/photo-1727423304224-6d2fd99b864c',
  'https://images.unsplash.com/photo-1675090391405-432434e23595',
  'https://images.unsplash.com/photo-1554196967-97a8602084d9',
  'https://images.unsplash.com/photo-1491961865842-98f7befd1a60',
  'https://images.unsplash.com/photo-1721728613411-d56d2ddda959',
  'https://images.unsplash.com/photo-1731901245099-20ac7f85dbaa',
  'https://images.unsplash.com/photo-1617694455303-59af55af7e58',
  'https://images.unsplash.com/photo-1709198165282-1dab551df890',

];

// 根据屏幕宽度计算列数
const calculateColumns = (width: number) => {
  if (width >= 1400) return 5;
  if (width >= 1200) return 4;
  if (width >= 768) return 3;
  if (width >= 480) return 2;
  return 1;
};

// 图片项组件
const GalleryImage: React.FC<{
  src: string;
  index: number;
  onClick: () => void;
}> = ({ src, index, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      {/* 占位图 */}
      {!imgLoaded && (
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Cpath d='M200 120 L200 180 M170 150 L230 150' stroke='%23d0d0d0' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E"
          alt="loading"
          style={{
            width: '100%',
            display: 'block',
          }}
        />
      )}
      
      {/* 真实图片 */}
      <img 
        src={`${src}?w=523&auto=format`} 
        alt="gallery"
        onLoad={() => setImgLoaded(true)}
        style={{ 
          width: '100%',
          display: imgLoaded ? 'block' : 'none',
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      />
    </div>
  );
};

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [columns, setColumns] = useState<number>(4);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setColumns(calculateColumns(window.innerWidth));
    };

    // 初始化列数
    handleResize();

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);

    // 清理监听器
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageClick = (imageUrl: string, index: number) => {
    setSelectedImage(imageUrl);
    setSelectedIndex(index);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedImage(imageList[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < imageList.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedImage(imageList[newIndex]);
    }
  };

  return (
    <PageLayout
      box1Content={<Header />}
      box1BgColor="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      box2BgColor="#f5f5f5"
      box2Style={{ padding: '40px 20px' }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        <Masonry
          columns={columns}
          gutter={16}
          items={imageList.map((img, index) => ({
            key: `item-${index}`,
            data: img,
            index: index,
          }))}
          itemRender={({ data, index }) => (
            <GalleryImage
              src={data}
              index={index}
              onClick={() => handleImageClick(data, index)}
            />
          )}
        />
      </div>

      {/* 图片卡片模态框 */}
      <ImageCardModal
        visible={!!selectedImage}
        imageUrl={selectedImage || ''}
        onClose={() => setSelectedImage(null)}
        title={`精美图片 ${selectedIndex + 1}/${imageList.length}`}
        description="这是一张来自 Unsplash 的精美图片"
        currentIndex={selectedIndex}
        totalCount={imageList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </PageLayout>
  );
}

