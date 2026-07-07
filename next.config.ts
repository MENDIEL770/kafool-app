import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    // modern formats + long cache; enables next/image optimization for our
    // Supabase-hosted media (banners, gallery, logos, plan designs).
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'dkvxbzxnqfqprkxuksqv.supabase.co' },
    ],
  },
};

export default nextConfig;
