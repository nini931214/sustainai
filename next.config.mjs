// next.config.mjs
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config) {
    const r = (...p) => path.resolve(process.cwd(), ...p);
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@components': r('app/(root)/components'),
      '@root': r('app/(root)'),
      '@app': r('app'),
      '@lib': r('lib'),
      '@data': r('data'),
      '@src': r('src'),
    };
    return config;
  },

  env: {
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
};

export default nextConfig;