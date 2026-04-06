/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8020/api/:path*',
      },
      {
        source: '/metrics',
        destination: 'http://backend:8020/metrics',
      },
    ]
  },
  images: {
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig
