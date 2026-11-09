/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const rawBackendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;
    if (!rawBackendUrl) {
      return [];
    }
    const backendUrl = rawBackendUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
