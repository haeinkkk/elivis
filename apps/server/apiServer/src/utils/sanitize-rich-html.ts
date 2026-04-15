import sanitizeHtml from "sanitize-html";

/**
 * TipTap(StarterKit + 링크/이미지/글자 크기 등)에서 나오는 HTML을 허용 범위로 제한합니다.
 * 저장형 XSS 방지용 — API 저장 전·응답 직전에 호출합니다.
 */
const RICH_HTML_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "div",
        "br",
        "hr",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "strike",
        "sub",
        "sup",
        "blockquote",
        "pre",
        "code",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "span",
    ],
    allowedAttributes: {
        a: ["href", "title", "target", "rel", "class"],
        img: ["src", "alt", "title", "class", "width", "height"],
        span: ["style", "class"],
        p: ["class"],
        div: ["class"],
        code: ["class"],
        pre: ["class"],
        ol: ["start", "type", "class"],
        ul: ["class"],
        li: ["class"],
        blockquote: ["class"],
        "*": ["class"],
    },
    allowedStyles: {
        span: {
            "font-size": [/^[\d.]+px$/],
        },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
        img: ["http", "https"],
    },
};

export function sanitizeRichHtml(html: string | undefined | null): string {
    return sanitizeHtml(html ?? "", RICH_HTML_OPTIONS).trim();
}
