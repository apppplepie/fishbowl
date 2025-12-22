import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保静态文件服务正常
  // Next.js 默认会自动服务 public 文件夹，但可以显式配置
  // 如果需要自定义，可以添加以下配置：
  
  // 如果部署在子路径下，需要设置 basePath
  // basePath: '/your-subpath',
  
  // 如果需要使用 CDN，可以设置 assetPrefix
  // assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
};

export default nextConfig;
