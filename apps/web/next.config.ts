import { config as dotenvConfig } from "dotenv";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 모노레포 루트 .env 를 Next.js 빌드/실행 전에 명시적으로 로드합니다.
// apps/web/ 에서 2단계 위가 모노레포 루트입니다.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  ...(process.env.ELECTRON_STATIC === "1" && {
    output: "export" as const,
  }),
  transpilePackages: ["@repo/ui", "@repo/docs"],
  reactCompiler: true,
};

export default nextConfig;
