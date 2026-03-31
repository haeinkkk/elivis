import { config as dotenvConfig } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function serverActionBodySizeLimit() {
  const mbRaw =
    process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT_MB ??
    process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB ??
    "2";
  const mb = Math.max(1, Number.parseInt(String(mbRaw), 10) || 2);
  return `${mb}mb` as const;
}

const nextConfig: NextConfig = {
  ...(process.env.ELECTRON_STATIC === "1" && {
    output: "export" as const,
  }),
  transpilePackages: ["@repo/ui", "@repo/docs", "@repo/i18n"],
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit(),
    },
  },
};

export default withNextIntl(nextConfig);
