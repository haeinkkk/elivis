"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
    /** 마크다운 원문 (비어 있으면 아무것도 렌더하지 않음) */
    markdown: string;
    className?: string;
};

/**
 * GFM 마크다운 렌더링 + HTML 살균(rehype-sanitize).
 * 사용자·관리자가 입력한 설명 필드에 사용합니다.
 */
export function MarkdownContent({ markdown, className = "" }: MarkdownContentProps) {
    const trimmed = markdown.trim();
    if (!trimmed) return null;

    return (
        <div
            className={`prose prose-stone max-w-none text-stone-800 prose-headings:scroll-mt-20 prose-p:leading-relaxed prose-a:text-stone-800 prose-a:underline-offset-2 hover:prose-a:text-stone-950 prose-code:rounded prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-stone-900 prose-pre:text-stone-100 ${className}`}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {trimmed}
            </ReactMarkdown>
        </div>
    );
}
