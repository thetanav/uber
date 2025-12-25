/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/eden"],
  typescript: {
    // Skip type checking during build to avoid checking server code
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build - run separately
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
