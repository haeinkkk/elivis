import { marked } from "marked";
import TurndownService from "turndown";

marked.setOptions({ gfm: true, breaks: true });

const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
});

/** 팀 소개 저장 형식은 마크다운 문자열 — 게시판 에디터(HTML)와 변환할 때 사용 */
export function markdownToHtml(md: string): string {
    const src = md ?? "";
    const out = marked.parse(src, { async: false });
    if (typeof out !== "string") {
        throw new Error("marked: expected sync string");
    }
    return out;
}

export function htmlToMarkdown(html: string): string {
    const h = html?.trim() ? html : "<p></p>";
    return turndown.turndown(h).trim();
}
