/** @type {import('next').NextConfig} */
const nextConfig = {
  // This backend is API-only (consumed by the Expo app), so we don't ship
  // React pages. Keeping the App Router around only for /app/api/** routes.
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Basic CORS so the Expo app (and Expo Go during dev) can call the API.
        // Lock `Access-Control-Allow-Origin` down once you know your app's
        // production origin(s); left open here since native apps don't send
        // a browser Origin header the same way.
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
