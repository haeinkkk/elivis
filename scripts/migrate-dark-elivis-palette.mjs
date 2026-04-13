/**
 * stone/gray 기반 dark: 유틸을 Elivis 다크 팔레트(elivis-*)로 치환합니다.
 * 긴 패턴부터 치환합니다.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = [path.join(ROOT, "packages", "ui", "src"), path.join(ROOT, "apps", "web", "src")];

/** @type {readonly [string, string][]} */
const REPLACEMENTS = [
    ["dark:bg-stone-50/80", "dark:bg-elivis-surface/80"],
    ["dark:bg-stone-50/90", "dark:bg-elivis-surface/90"],
    ["dark:bg-stone-950/90", "dark:bg-elivis-bg/90"],
    ["dark:bg-stone-950/95", "dark:bg-elivis-bg/95"],
    ["dark:bg-stone-950", "dark:bg-elivis-bg"],
    ["dark:bg-stone-900/90", "dark:bg-elivis-surface/90"],
    ["dark:bg-stone-900/80", "dark:bg-elivis-surface/80"],
    ["dark:bg-stone-900/95", "dark:bg-elivis-surface/95"],
    ["dark:bg-stone-900", "dark:bg-elivis-surface"],
    ["dark:bg-stone-800/80", "dark:bg-elivis-surface-elevated/80"],
    ["dark:bg-stone-800/90", "dark:bg-elivis-surface-elevated/90"],
    ["dark:bg-stone-800", "dark:bg-elivis-surface-elevated"],
    ["dark:bg-stone-700", "dark:bg-elivis-surface-elevated"],
    ["dark:bg-stone-600", "dark:bg-elivis-surface-elevated"],
    ["dark:hover:bg-stone-900", "dark:hover:bg-elivis-surface"],
    ["dark:hover:bg-stone-800", "dark:hover:bg-elivis-surface-elevated"],
    ["dark:hover:bg-stone-800/90", "dark:hover:bg-elivis-surface-elevated/90"],
    ["dark:hover:bg-stone-950/90", "dark:hover:bg-elivis-bg/90"],
    ["dark:active:bg-stone-800", "dark:active:bg-elivis-surface-elevated"],
    /* 짧은 stone-50/100 등이 stone-400/500의 접두사로 잡이지 않도록 긴 토큰을 먼저 치환 */
    ["dark:text-stone-900", "dark:text-elivis-ink"],
    ["dark:text-stone-600", "dark:text-elivis-ink-muted"],
    ["dark:text-stone-500", "dark:text-elivis-ink-muted"],
    ["dark:text-stone-400", "dark:text-elivis-ink-secondary"],
    ["dark:text-stone-300", "dark:text-elivis-ink-secondary"],
    ["dark:text-stone-200", "dark:text-elivis-ink"],
    ["dark:text-stone-100", "dark:text-elivis-ink"],
    ["dark:text-stone-50", "dark:text-elivis-ink"],
    ["dark:border-stone-800", "dark:border-elivis-line"],
    ["dark:border-stone-700", "dark:border-elivis-line"],
    ["dark:border-stone-600", "dark:border-elivis-line"],
    ["dark:border-stone-200/90", "dark:border-elivis-line"],
    ["dark:divide-stone-800", "dark:divide-elivis-line"],
    ["dark:divide-stone-700", "dark:divide-elivis-line"],
    ["dark:placeholder:text-stone-500", "dark:placeholder:text-elivis-ink-muted"],
    ["dark:placeholder:text-stone-400", "dark:placeholder:text-elivis-ink-muted"],
    ["dark:ring-stone-800", "dark:ring-elivis-line"],
    ["dark:ring-stone-700", "dark:ring-elivis-line"],
    ["dark:ring-stone-600", "dark:ring-elivis-line"],
    ["dark:shadow-lg", "dark:shadow-none"],
    ["dark:shadow-black/40", "dark:shadow-none"],
    ["dark:shadow-black/30", "dark:shadow-none"],
    ["dark:shadow-stone-900/10", "dark:shadow-none"],
    ["dark:hover:text-stone-200", "dark:hover:text-elivis-ink"],
    ["dark:hover:text-stone-50", "dark:hover:text-elivis-ink"],
    ["dark:hover:text-stone-100", "dark:hover:text-elivis-ink"],
    ["dark:hover:text-stone-950", "dark:hover:text-elivis-ink"],
    ["dark:hover:border-stone-600", "dark:hover:border-elivis-line"],
    ["dark:focus:ring-offset-stone-950", "dark:focus:ring-offset-elivis-bg"],
    ["dark:focus:ring-stone-500", "dark:focus:ring-elivis-accent"],
    ["dark:bg-stone-50", "dark:bg-elivis-surface"],
    ["dark:bg-stone-100", "dark:bg-elivis-surface-elevated"],
    ["dark:hover:bg-stone-50", "dark:hover:bg-elivis-surface-elevated"],
    ["dark:hover:bg-stone-100", "dark:hover:bg-elivis-surface-elevated"],
    ["dark:hover:bg-stone-50/90", "dark:hover:bg-elivis-surface-elevated/90"],
    ["dark:hover:bg-stone-50/80", "dark:hover:bg-elivis-surface-elevated/80"],
    ["dark:[&_code]:bg-stone-800", "dark:[&_code]:bg-elivis-surface-elevated"],
    ["dark:[&_blockquote]:border-stone-600", "dark:[&_blockquote]:border-elivis-line"],
    ["dark:[&_blockquote]:text-stone-400", "dark:[&_blockquote]:text-elivis-ink-secondary"],
    ["dark:prose-a:text-amber-200/90", "dark:prose-a:text-elivis-accent-hover"],
    ["dark:hover:prose-a:text-amber-100", "dark:hover:prose-a:text-elivis-accent"],
    ["dark:bg-amber-950", "dark:bg-elivis-accent-strong/35"],
    ["dark:text-amber-200", "dark:text-elivis-accent-hover"],
    ["dark:hover:bg-amber-950/30", "dark:hover:bg-elivis-accent-strong/25"],
    ["dark:bg-white/95", "dark:bg-elivis-surface/95"],
    ["dark:bg-white", "dark:bg-elivis-surface"],
    ["dark:bg-white/80", "dark:bg-elivis-surface/90"],
    ["dark:bg-gray-900", "dark:bg-elivis-surface"],
    ["dark:bg-gray-800", "dark:bg-elivis-surface-elevated"],
    ["dark:text-gray-100", "dark:text-elivis-ink"],
    ["dark:text-gray-400", "dark:text-elivis-ink-secondary"],
    ["dark:ring-stone-900", "dark:ring-elivis-bg"],
    ["dark:ring-white", "dark:ring-elivis-bg"],
    ["dark:hover:text-stone-700", "dark:hover:text-elivis-ink-secondary"],
    ["dark:hover:text-stone-400", "dark:hover:text-elivis-ink-secondary"],
    ["dark:bg-blue-500", "dark:bg-elivis-accent"],
    ["dark:hover:bg-blue-400", "dark:hover:bg-elivis-accent-hover"],
    ["dark:focus:ring-blue-400", "dark:focus:ring-elivis-accent"],
];

function walk(dir, files) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, name.name);
        if (name.isDirectory()) {
            if (name.name === "node_modules" || name.name === "dist") continue;
            walk(p, files);
        } else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts") || name.name.endsWith(".css")) {
            files.push(p);
        }
    }
}

function migrate(content) {
    let out = content;
    for (const [from, to] of REPLACEMENTS) {
        if (out.includes(from)) {
            out = out.split(from).join(to);
        }
    }
    return out;
}

const files = [];
for (const d of DIRS) walk(d, files);

let n = 0;
for (const file of files) {
    const before = fs.readFileSync(file, "utf8");
    const after = migrate(before);
    if (after !== before) {
        fs.writeFileSync(file, after);
        n++;
        console.log(path.relative(ROOT, file));
    }
}
console.log("files updated:", n);
