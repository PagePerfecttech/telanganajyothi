import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space-z.ai',
    'localhost',
  ],
};

export default nextConfig;
