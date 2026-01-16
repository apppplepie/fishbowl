import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保静态文件服务正常
  // Next.js 默认会自动服务 public 文件夹，但可以显式配置
  // 如果需要自定义，可以添加以下配置：
  
  // 如果部署在子路径下，需要设置 basePath
  // basePath: '/your-subpath',
  
  // 如果需要使用 CDN，可以设置 assetPrefix
  // assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
  
  // Next.js Image 优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**', // 允许所有 HTTPS 域名（生产环境建议限制具体域名）
      },
    ],
    formats: ['image/avif', 'image/webp'], // 使用现代图片格式
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // 响应式图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 小图尺寸
  },
  
  // 重写规则：将 /uploads 请求转发到 API 路由
  // 这在 Docker 环境中特别有用，因为 volume 挂载的文件可能无法直接通过 public 目录访问
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
