const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  webpack: (config) => {
    // tldraw uses WebAssembly for some features
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Deduplicate Yjs — prevents "Yjs was already imported" warning
    // which breaks constructor checks across y-partykit, tldraw, etc.
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: path.resolve(__dirname, "node_modules/yjs"),
    };

    return config;
  },
};

module.exports = nextConfig;
