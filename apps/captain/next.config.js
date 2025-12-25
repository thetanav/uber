/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  typescript: {
    // Skip type checking during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build - run separately
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
