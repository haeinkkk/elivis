"use client";

import type { IntroTemplateId } from "@/lib/team-intro-layout";

const bg = "#e7e5e4";
const stroke = "#d6d3d1";
const accent = "#a8a29e";

/** 템플릿 카드용 미니 와이어프레임 */
export function TeamIntroTemplateThumb({ id }: { id: IntroTemplateId }) {
    return (
        <svg viewBox="0 0 72 48" className="h-14 w-full" aria-hidden>
            {id === "none" && (
                <rect x="8" y="8" width="56" height="32" rx="3" fill={bg} stroke={stroke} />
            )}
            {id === "twoCol" && (
                <>
                    <rect x="8" y="8" width="56" height="32" rx="3" fill="#fafaf9" stroke={stroke} />
                    <rect x="12" y="12" width="48" height="8" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="12" y="22" width="22" height="10" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="38" y="22" width="22" height="10" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="12" y="34" width="48" height="6" rx="1.5" fill={bg} stroke={accent} />
                </>
            )}
            {id === "threeCol" && (
                <>
                    <rect x="8" y="8" width="56" height="32" rx="3" fill="#fafaf9" stroke={stroke} />
                    <rect x="12" y="12" width="48" height="8" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="12" y="22" width="14" height="14" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="29" y="22" width="14" height="14" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="46" y="22" width="14" height="14" rx="1.5" fill={bg} stroke={stroke} />
                </>
            )}
            {id === "rows" && (
                <>
                    <rect x="8" y="8" width="56" height="32" rx="3" fill="#fafaf9" stroke={stroke} />
                    <rect x="12" y="11" width="48" height="7" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="12" y="20" width="48" height="7" rx="1.5" fill={bg} stroke={accent} />
                    <rect x="12" y="29" width="22" height="7" rx="1.5" fill={bg} stroke={stroke} />
                    <rect x="38" y="29" width="22" height="7" rx="1.5" fill={bg} stroke={stroke} />
                </>
            )}
        </svg>
    );
}
