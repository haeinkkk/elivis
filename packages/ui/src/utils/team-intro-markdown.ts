import { marked } from "marked";
import TurndownService from "turndown";

marked.setOptions({ gfm: true, breaks: true });

const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
});

turndown.addRule("elivisWikiVideo", {
    filter(node) {
        return node.nodeName === "VIDEO" && Boolean((node as HTMLElement).getAttribute("src"));
    },
    replacement(_content, node) {
        const el = node as HTMLElement;
        const src = el.getAttribute("src") ?? "";
        if (!src) return "";
        return `[video](${src})`;
    },
});

turndown.addRule("elivisYoutubeIframe", {
    filter(node) {
        if (node.nodeName !== "IFRAME") return false;
        const src = (node as HTMLElement).getAttribute("src") ?? "";
        return /youtube\.com\/embed\//i.test(src);
    },
    replacement(_content, node) {
        const src = (node as HTMLElement).getAttribute("src") ?? "";
        const m = src.match(/\/embed\/([\w-]{11})/);
        const id = m?.[1];
        if (!id) return "";
        return `[YouTube](https://www.youtube.com/watch?v=${id})`;
    },
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
