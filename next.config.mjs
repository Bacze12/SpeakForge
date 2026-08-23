/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
      ],
    }];
  },
  experimental: {
    serverComponentsExternalPackages: ["yt-search", "cheerio", "msedge-tts", "ws", "bufferutil", "utf-8-validate"],
  },
};

export default nextConfig;