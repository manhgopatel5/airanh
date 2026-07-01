/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'qr.sepay.vn' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'image.thum.io' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'maps.wikimedia.org' },
      { protocol: 'https', hostname: 'staticmap.openstreetmap.de' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      [
        'script-src',
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'https://apis.google.com',
        'https://www.gstatic.com',
        'https://www.googleapis.com',
        'https://*.firebaseapp.com',
        'https://*.firebaseio.com',
        'https://*.firebasedatabase.app',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ].join(' '),
      "style-src 'self' 'unsafe-inline'",
      [
        'img-src',
        "'self'",
        'data:',
        'blob:',
        'https://qr.sepay.vn',
        'https://firebasestorage.googleapis.com',
        'https://storage.googleapis.com',
        'https://lh3.googleusercontent.com',
        'https://ui-avatars.com',
        'https://images.unsplash.com',
        'https://image.thum.io',
        'https://api.mapbox.com',
        'https://maps.wikimedia.org',
        'https://staticmap.openstreetmap.de',
        'https://api.dicebear.com',
      ].join(' '),
      "font-src 'self' data:",
      [
        'connect-src',
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'wss://*.firebaseio.com',
        'https://*.firebasedatabase.app',
        'wss://*.firebasedatabase.app',
        'https://*.googleusercontent.com',
        'https://fcm.googleapis.com',
        'https://*.cloudfunctions.net',
        'https://asia-southeast1-airanh-ba64c.cloudfunctions.net',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://api.mapbox.com',
      ].join(' '),
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      [
        'frame-src',
        "'self'",
        'https://*.firebaseapp.com',
        'https://accounts.google.com',
      ].join(' '),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/animations/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  serverExternalPackages: ['firebase-admin', 'sharp'],

    experimental: {
    optimizePackageImports: [
      'date-fns',
      'lucide-react',
      'framer-motion',
      'zustand',
      'swr',
      'react-intersection-observer',
      'react-icons/fi',
      'react-icons/hi2',
      'react-markdown',
    ],
    serverActions: { bodySizeLimit: '2mb' },
    staleTimes: { dynamic: 30, static: 180 },
  },

  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    if (isServer) config.output.globalObject = 'self';
    return config;
  },
};

export default nextConfig;