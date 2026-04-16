import type { NextConfig } from "next";
import { execSync } from "child_process";

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
    NEXT_PUBLIC_GIT_SHA: gitSha(),
  },
};

export default nextConfig;
