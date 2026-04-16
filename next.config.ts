import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
  }
}

function resolveTurbopackRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, "node_modules", "next"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
    NEXT_PUBLIC_GIT_SHA: gitSha(),
  },
  turbopack: {
    root: resolveTurbopackRoot(import.meta.dirname),
  },
};

export default nextConfig;
