/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@plugspace/shared', '@plugspace/ui', '@plugspace/trpc-client'],
  images: {
    domains: ['localhost', 'projects.plugspace.io'],
  },
};

module.exports = nextConfig;
