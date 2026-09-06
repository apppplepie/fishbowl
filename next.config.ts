import { NextConfig } from "next";
import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = withBundleAnalyzer({
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 旧地址统一收进书房；query 会被 Next 自动带过去，所以 ?category=xxx 不会丢
  async redirects() {
    return [
      { source: '/archive', destination: '/library?view=doc', permanent: false },
      { source: '/bookcase', destination: '/library?view=book', permanent: false },
      { source: '/gallery', destination: '/library?view=art', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: '/api/uploads/:path*' },
    ];
  },
});

export default nextConfig;
