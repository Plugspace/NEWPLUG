/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@plugspace/shared'],
  images: {
    domains: ['localhost', 'projects.plugspace.io'],
  },
};

module.exports = nextConfig;
