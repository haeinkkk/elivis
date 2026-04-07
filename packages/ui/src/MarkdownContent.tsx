"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { createContext, useContext } from "react";
import ReactMarkdown from "react-markdown";
import type { Schema } from "hast-util-sanitize";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

import { htmlToMarkdown } from "./utils/team-intro-markdown";

const WIKI_LINK_HREF = /^wiki:([a-z0-9][a-z0-9-]{0,62})$/i;

/** `pre` 안의 `code`는 언어 미지정(```` ``` ```` 만) 펜스 블록도 포함 */
const PreCodeBlockContext = createContext(false);

/**
 * `id`를 clobber 접두사로 바꾸면 `[링크](#slug)`와 제목 `id`가 어긋납니다.
 * 위키·설명 필드는 신뢰된 사용자 입력이므로 `id`는 그대로 둡니다.
 */
const markdownSanitizeSchema: Schema = {
    ...defaultSchema,
    clobber: [...(defaultSchema.clobber ?? [])].filter((k) => k !== "id"),
};

const HEADING_PERMALINK_CLASS =
    "[&>a:first-child]:mr-1.5 [&>a:first-child]:inline-block [&>a:first-child]:select-none [&>a:first-child]:font-mono [&>a:first-child]:text-sm [&>a:first-child]:text-stone-400 [&>a:first-child]:no-underline hover:[&>a:first-child]:text-stone-600";

function wikiHeading(Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
    return function WikiHeadingEl(props: ComponentPropsWithoutRef<typeof Tag>) {
        const { className, children, ...rest } = props;
        return (
            <Tag
                {...rest}
                className={[HEADING_PERMALINK_CLASS, className].filter(Boolean).join(" ")}
            >
                {children}
            </Tag>
        );
    };
}

function resolveMediaSrc(src: string | undefined, assetBaseUrl?: string): string | undefined {
    if (!src) return src;
    if (src.startsWith("/uploads/") && assetBaseUrl) {
        return `${assetBaseUrl.replace(/\/$/, "")}${src}`;
    }
    return src;
}

/** watch / embed / shorts / youtu.be */
function youtubeVideoId(url: string): string | null {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./i, "").toLowerCase();
        if (host === "youtu.be") {
            const id = u.pathname.replace(/^\//, "").split("/")[0];
            return /^[\w-]{11}$/.test(id) ? id : null;
        }
        if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
            if (u.pathname === "/watch" || u.pathname.startsWith("/watch")) {
                const v = u.searchParams.get("v");
                return v && /^[\w-]{11}$/.test(v) ? v : null;
            }
            if (u.pathname.startsWith("/embed/")) {
                const id = u.pathname.slice(7).split("/")[0];
                return /^[\w-]{11}$/.test(id) ? id : null;
            }
            if (u.pathname.startsWith("/shorts/")) {
                const id = u.pathname.slice(8).split("/")[0];
                return /^[\w-]{11}$/.test(id) ? id : null;
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

function isVideoFileHref(href: string): boolean {
    if (!href) return false;
    try {
        if (href.startsWith("/") || href.startsWith("./")) {
            return /\.(mp4|webm|mov)(\?|$)/i.test(href);
        }
        const u = new URL(href);
        return /\.(mp4|webm|mov)$/i.test(u.pathname);
    } catch {
        return /\.(mp4|webm|mov)(\?|$)/i.test(href);
    }
}

/**
 * 리치 에디터(Tiptap)가 HTML로 저장된 본문이 `contentMd`에 들어온 경우,
 * react-markdown이 이를 제목·목록으로 파싱하지 못하므로 Turndown으로 마크다운으로 바꿉니다.
 */
function coerceStoredBodyToMarkdown(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    if (!t.startsWith("<")) return t;
    // 일반 마크다운(제목·목록 등)으로 시작하는 경우는 그대로
    if (/^#+\s/m.test(t) || /^[-*+]\s/m.test(t) || /^```/.test(t)) return t;
    if (!/<\/[a-z][a-z0-9]*>/i.test(t)) return t;
    try {
        const md = htmlToMarkdown(t).trim();
        return md || t;
    } catch {
        return t;
    }
}

type MarkdownContentProps = {
    /** 마크다운 원문 (비어 있으면 아무것도 렌더하지 않음) */
    markdown: string;
    className?: string;
    /** `/uploads/...` 경로를 API(또는 CDN) 절대 URL로 붙일 때 사용 */
    assetBaseUrl?: string;
    /** `[표시](wiki:slug)` 링크를 클릭했을 때 같은 프로젝트의 다른 위키 문서로 전환 */
    onWikiLink?: (slug: string) => void;
};

const rehypePlugins: PluggableList = [
    rehypeSlug,
    [
        rehypeAutolinkHeadings,
        {
            behavior: "prepend",
            content: [{ type: "text", value: "#" }],
            properties: { title: "Permalink to this section" },
        },
    ],
    [rehypeSanitize, markdownSanitizeSchema],
];

/**
 * GFM 마크다운 렌더링 + HTML 살균(rehype-sanitize).
 * 사용자·관리자가 입력한 설명 필드에 사용합니다.
 */
export function MarkdownContent({
    markdown,
    className = "",
    assetBaseUrl,
    onWikiLink,
}: MarkdownContentProps) {
    const source = coerceStoredBodyToMarkdown(markdown);
    if (!source) return null;

    return (
        <div
            className={`prose prose-stone max-w-none text-stone-800 prose-headings:scroll-mt-20 prose-p:leading-relaxed prose-a:text-stone-800 prose-a:underline-offset-2 hover:prose-a:text-stone-950 prose-li:my-0.5 ${className}`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={rehypePlugins}
                components={{
                    h1: wikiHeading("h1"),
                    h2: wikiHeading("h2"),
                    h3: wikiHeading("h3"),
                    h4: wikiHeading("h4"),
                    h5: wikiHeading("h5"),
                    h6: wikiHeading("h6"),
                    pre: ({ children, ...rest }) => (
                        <pre
                            className="not-prose my-4 overflow-x-auto rounded-xl border border-stone-700/80 bg-stone-900 p-4 text-sm leading-relaxed text-stone-100"
                            {...rest}
                        >
                            <PreCodeBlockContext.Provider value={true}>{children}</PreCodeBlockContext.Provider>
                        </pre>
                    ),
                    code: function MarkdownCode({ className, children, ...rest }) {
                        const inFence = useContext(PreCodeBlockContext);
                        if (inFence) {
                            return (
                                <code
                                    className={[
                                        className,
                                        "block whitespace-pre bg-transparent p-0 font-mono text-[0.8125rem] text-inherit",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    {...rest}
                                >
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code
                                className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.875em] text-stone-800 before:content-none after:content-none"
                                {...rest}
                            >
                                {children}
                            </code>
                        );
                    },
                    img: ({ src, alt, ...rest }) => {
                        const resolved = resolveMediaSrc(src, assetBaseUrl);
                        return (
                            <img
                                src={resolved}
                                alt={alt ?? ""}
                                className="max-h-[min(80vh,720px)] w-auto max-w-full rounded-lg"
                                {...rest}
                            />
                        );
                    },
                    a: ({ href, children, ...rest }) => {
                        const h = href?.trim() ?? "";
                        if (onWikiLink && h) {
                            const m = WIKI_LINK_HREF.exec(h);
                            if (m) {
                                const slug = m[1].toLowerCase();
                                return (
                                    <button
                                        type="button"
                                        className="inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-stone-400 underline-offset-2 hover:text-stone-950 hover:decoration-stone-800"
                                        onClick={() => onWikiLink(slug)}
                                    >
                                        {children as ReactNode}
                                    </button>
                                );
                            }
                        }

                        const yt =
                            h.startsWith("http://") || h.startsWith("https://")
                                ? youtubeVideoId(h)
                                : null;
                        if (yt) {
                            return (
                                <span className="my-4 block w-full max-w-3xl not-prose">
                                    <iframe
                                        title="YouTube video"
                                        className="aspect-video h-auto w-full rounded-lg border-0"
                                        src={`https://www.youtube.com/embed/${yt}`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />
                                </span>
                            );
                        }

                        if (h && isVideoFileHref(h)) {
                            const src = resolveMediaSrc(h, assetBaseUrl) ?? h;
                            return (
                                <span className="my-4 block w-full max-w-3xl not-prose">
                                    <video
                                        className="w-full rounded-lg"
                                        controls
                                        preload="metadata"
                                        src={src}
                                    >
                                        <a href={h} target="_blank" rel="noopener noreferrer">
                                            {children as ReactNode}
                                        </a>
                                    </video>
                                </span>
                            );
                        }

                        const isExternal = h.startsWith("http://") || h.startsWith("https://");
                        if (isExternal) {
                            return (
                                <a href={h} target="_blank" rel="noopener noreferrer" {...rest}>
                                    {children as ReactNode}
                                </a>
                            );
                        }
                        return (
                            <a href={href} {...rest}>
                                {children as ReactNode}
                            </a>
                        );
                    },
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    );
}
