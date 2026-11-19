import type { NextConfig } from "next";

/*
 * Optional sub-path deployment, e.g. https://example.com/kingsol behind a reverse proxy.
 * It must be the same for `next build` (inlined into the bundles) and `next start` (which reads
 * this config again), so put it in .env.production.local:  NEXT_PUBLIC_BASE_PATH=/kingsol
 * Leave unset to serve from the root, as in local development.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  // Self-contained server for the Docker image (set by the Dockerfile); `npm start` is unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
