import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next the workspace/monorepo root (one level up from /src)
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
