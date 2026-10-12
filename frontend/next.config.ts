import type { NextConfig } from 'next';
const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
const parsed = new URL(apiOrigin);
if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
  throw new Error('API_INTERNAL_ORIGIN doit être une origine HTTP(S) sans identifiants.');
}
const config: NextConfig = {
  agentRules: false,
  images: { unoptimized: true },
  poweredByHeader: false,
  async rewrites() { return [{ source: '/api/v1/:path*', destination: `${parsed.origin}/api/v1/:path*` }]; },
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' }
  ] }]; }
};
export default config;
