import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack root to this project — a stray lockfile in a parent dir
  // was confusing workspace detection.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
