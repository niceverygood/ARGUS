/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig

