import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space-z.ai',
    'preview-chat-d4f5a0ff-ad66-4829-ad96-87b858ee6bf0.space-z.ai',
    'localhost',
  ],
};

export default nextConfig;
