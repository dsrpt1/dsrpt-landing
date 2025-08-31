/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  eslint: {
    // don’t fail Vercel builds on lint errors while you iterate
    ignoreDuringBuilds: true,
  },
  typescript: {
    // optional: unblock builds while types are WIP
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
