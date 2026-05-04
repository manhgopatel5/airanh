/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
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
      ].join(' '),

      "style-src 'self' 'unsafe-inline'",

      [
        'img-src',
        "'self'",
        'data:',
        'blob:',
        'https://firebasestorage.googleapis.com',
        'https://lh3.googleusercontent.com',
        'https://ui-avatars.com',
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
      ].join(' '),

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
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value:
              'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
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
    ],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    if (isServer) {
      config.output.globalObject = 'self';
    }

    return config;
  },
};

export default nextConfig;