import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Output standalone for Docker deployment
  output: 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'pps.whatsapp.net',
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:4000/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://backend:4000/auth/:path*',
      },
      {
        source: '/webhook/:path*',
        destination: 'http://backend:4000/webhook/:path*',
      },
    ];
  },
}

export default nextConfig
