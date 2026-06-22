/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
    // disable google fonts fetching at build time
  env: {
    NEXT_PUBLIC_SKIP_GOOGLE_FONTS: "true",
  },
};

module.exports = nextConfig;
