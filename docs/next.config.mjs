import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  serverExternalPackages: ['typescript', 'twoslash'],
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
      // Keep the legacy Slack app URLs working, now served by the fumadocs pages.
      {
        source: '/privacy',
        destination: '/docs/privacy',
      },
      {
        source: '/support',
        destination: '/docs/support',
      },
    ];
  },
};

export default withMDX(config);
