/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SKIP_GOOGLE_FONTS: "true",
  },
};

module.exports = nextConfig;
