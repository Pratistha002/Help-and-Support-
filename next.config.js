/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  output: "standalone",
  // Preserve runtime env in Docker (do not inline SMTP/Twilio secrets at build time)
  experimental: {
    serverMinification: false,
  },
};

module.exports = nextConfig;
