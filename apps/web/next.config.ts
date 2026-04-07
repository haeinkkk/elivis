import { config as dotenvConfig } from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const webAppRoot = path.dirname(fileURLToPath(import.meta.url));

/** `next-intl/package.json` 은 exports 에 없어 resolve 불가 → 진입 파일 기준으로 패키지 루트 탐색 */
function resolveNextIntlPackageDir(req: NodeJS.Require): string {
    const entry = req.resolve("next-intl");
    let dir = path.dirname(entry);
    for (;;) {
        const pkgJson = path.join(dir, "package.json");
        try {
            const name = (JSON.parse(fs.readFileSync(pkgJson, "utf8")) as { name?: string }).name;
            if (name === "next-intl") return dir;
        } catch {
            /* no package.json */
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    throw new Error(`Could not locate next-intl package root from: ${entry}`);
}

/**
 * 모노레포·transpilePackages 환경에서 `next-intl` 단일 인스턴스로 고정.
 * Turbopack(Windows)은 절대 경로 alias 미지원 → 앱 루트 기준 상대 경로만 사용.
 */
const requireFromConfig = createRequire(import.meta.url);
const nextIntlLinked = path.join(webAppRoot, "node_modules", "next-intl");
const nextIntlPackageDir = fs.existsSync(path.join(nextIntlLinked, "package.json"))
    ? nextIntlLinked
    : resolveNextIntlPackageDir(requireFromConfig);

const nextIntlWebpackAlias = path.resolve(nextIntlPackageDir);
const nextIntlRelativeToApp = path.relative(webAppRoot, nextIntlPackageDir).replace(/\\/g, "/");
const nextIntlTurbopackAlias =
    nextIntlRelativeToApp === ""
        ? "./node_modules/next-intl"
        : nextIntlRelativeToApp.startsWith(".")
          ? nextIntlRelativeToApp
          : `./${nextIntlRelativeToApp}`;

/**
 * `@repo/ui`는 기본적으로 `dist`를 가리킴. `src`만 수정하고 tsup을 돌리지 않으면
 * Next가 예전 번들을 물어 다국어·코드 변경이 브라우저에 반영되지 않음.
 * 개발·프로덕션 빌드 모두 소스 진입점을 쓰면 `transpilePackages`로 그대로 컴파일됨.
 */
const repoUiSrcAbs = path.join(webAppRoot, "../../packages/ui/src/index.tsx");
const repoUiSrcRelative = path
    .relative(webAppRoot, repoUiSrcAbs)
    .replace(/\\/g, "/");
const repoUiTurbopackAlias = repoUiSrcRelative.startsWith(".")
    ? repoUiSrcRelative
    : `./${repoUiSrcRelative}`;

function serverActionBodySizeLimit() {
  const mbRaw =
    process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT_MB ??
    process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB ??
    "2";
  const mb = Math.max(1, Number.parseInt(String(mbRaw), 10) || 2);
  return `${mb}mb` as const;
}

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "next-intl": nextIntlTurbopackAlias,
      "@repo/ui": repoUiTurbopackAlias,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[] | undefined>),
      "next-intl": nextIntlWebpackAlias,
      "@repo/ui": repoUiSrcAbs,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_UPLOADS_SAME_ORIGIN: "1",
  },
  transpilePackages: ["@repo/ui", "@repo/docs", "@repo/i18n"],
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit(),
    },
  },
  /**
   * 로컬 스토리지 프로필·배너 등 `/uploads/*` 를 API 서버로 넘겨
   * 브라우저가 같은 출처(예: localhost:3000)로만 요청하도록 함 — img 크로스 포트 이슈 완화
   */
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
    return [{ source: "/uploads/:path*", destination: `${apiBase}/uploads/:path*` }];
  },
};

export default withNextIntl(nextConfig);
