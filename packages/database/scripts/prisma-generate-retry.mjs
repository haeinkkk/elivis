/**
 * Prisma generate with retries. Windows often hits EPERM when renaming the query
 * engine DLL under pnpm’s isolated node_modules (.pnpm). See root .npmrc (hoisted linker).
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(pkgRoot, "../..");

/** pnpm: `@prisma+client@…/node_modules/.prisma/client` or hoisted `node_modules/.prisma/client` */
function prismaGeneratedIndexExists() {
  const flat = join(workspaceRoot, "node_modules/.prisma/client/index.js");
  if (existsSync(flat)) return true;

  const pnpmDir = join(workspaceRoot, "node_modules/.pnpm");
  if (!existsSync(pnpmDir)) return false;

  try {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith("@prisma+client@")) continue;
      const candidate = join(
        pnpmDir,
        entry,
        "node_modules/.prisma/client/index.js",
      );
      if (existsSync(candidate)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function main() {
  const win = process.platform === "win32";
  const max = win ? 12 : 6;
  const baseDelay = win ? 1200 : 400;

  for (let attempt = 0; attempt < max; attempt++) {
    try {
      execSync("npx prisma generate", {
        cwd: pkgRoot,
        stdio: "inherit",
        env: process.env,
      });
      process.exit(0);
    } catch {
      if (attempt < max - 1) {
        await delay(baseDelay + attempt * 400);
      }
    }
  }

  if (prismaGeneratedIndexExists()) {
    console.warn(
      "[@repo/database] prisma generate failed but an existing client was found; continuing. If you changed the schema, run: pnpm --filter @repo/database db:generate",
    );
    process.exit(0);
  }

  console.error(
    "[@repo/database] prisma generate failed (e.g. EPERM on Windows: exclude the repo from antivirus / avoid OneDrive-synced folders, then delete node_modules and run pnpm install again).",
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
