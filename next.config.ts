import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// node_modules/next が存在する最上位ディレクトリを探す。
// 本体ディレクトリでは自身、git worktree 内では親の本体ディレクトリが root になる。
// これにより Next.js 16 の「複数 lockfile 検出」warning を抑制する。
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
  turbopack: {
    root: resolveTurbopackRoot(import.meta.dirname),
  },
};

export default nextConfig;
