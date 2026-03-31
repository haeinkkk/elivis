/** 팀 소개 탭 레이아웃 (JSON으로 `Team.introLayoutJson`에 저장) */

export const INTRO_LAYOUT_VERSION = 1 as const;

export type IntroBlockType = "banner" | "intro" | "metaCreated" | "metaCreator";

export type IntroColSpan = 4 | 6 | 8 | 12;

export type IntroLayoutBlock = {
    id: string;
    type: IntroBlockType;
    colSpan: IntroColSpan;
};

export type IntroLayoutConfig = {
    v: typeof INTRO_LAYOUT_VERSION;
    blocks: IntroLayoutBlock[];
};

const BLOCK_TYPES: IntroBlockType[] = ["banner", "intro", "metaCreated", "metaCreator"];

/** UI 템플릿(썸네일·프리셋) 식별자 */
export type IntroTemplateId = "none" | "twoCol" | "threeCol" | "rows";

export const INTRO_TEMPLATE_ORDER: IntroTemplateId[] = ["none", "twoCol", "threeCol", "rows"];

export const INTRO_TEMPLATES: Record<
    IntroTemplateId,
    { title: string; showEditIcon: boolean; blocks: IntroLayoutBlock[] }
> = {
    none: {
        title: "레이아웃 없음",
        showEditIcon: false,
        blocks: [
            { id: "blk-banner", type: "banner", colSpan: 12 },
            { id: "blk-intro", type: "intro", colSpan: 12 },
            { id: "blk-meta-created", type: "metaCreated", colSpan: 12 },
            { id: "blk-meta-creator", type: "metaCreator", colSpan: 12 },
        ],
    },
    /** 배너 전체 → 생성일·생성자 6+6 → 소개 전체 */
    twoCol: {
        title: "2열",
        showEditIcon: true,
        blocks: [
            { id: "t2-banner", type: "banner", colSpan: 12 },
            { id: "t2-meta-created", type: "metaCreated", colSpan: 6 },
            { id: "t2-meta-creator", type: "metaCreator", colSpan: 6 },
            { id: "t2-intro", type: "intro", colSpan: 12 },
        ],
    },
    /** 배너 전체 → 소개·메타 세 칸(4+4+4) */
    threeCol: {
        title: "3열",
        showEditIcon: true,
        blocks: [
            { id: "t3-banner", type: "banner", colSpan: 12 },
            { id: "t3-intro", type: "intro", colSpan: 4 },
            { id: "t3-meta-created", type: "metaCreated", colSpan: 4 },
            { id: "t3-meta-creator", type: "metaCreator", colSpan: 4 },
        ],
    },
    rows: {
        title: "행",
        showEditIcon: true,
        blocks: [
            { id: "blk-banner", type: "banner", colSpan: 12 },
            { id: "blk-intro", type: "intro", colSpan: 12 },
            { id: "blk-meta-created", type: "metaCreated", colSpan: 6 },
            { id: "blk-meta-creator", type: "metaCreator", colSpan: 6 },
        ],
    },
};

export function applyIntroTemplate(id: IntroTemplateId): IntroLayoutConfig {
    const t = INTRO_TEMPLATES[id];
    return {
        v: INTRO_LAYOUT_VERSION,
        blocks: t.blocks.map((b) => ({ ...b })),
    };
}

/**
 * 저장된 블록 ID를 유지한 채, 선택한 템플릿의 순서·열 너비(colSpan)만 적용합니다.
 * (템플릿마다 다른 기본 id로 통째로 바꾸지 않음)
 */
export function mergeIntroTemplate(
    current: IntroLayoutConfig,
    templateId: IntroTemplateId,
): IntroLayoutConfig {
    const t = INTRO_TEMPLATES[templateId];
    const byType = new Map<IntroBlockType, IntroLayoutBlock>(
        current.blocks.map((b) => [b.type, b]),
    );
    return {
        v: INTRO_LAYOUT_VERSION,
        blocks: t.blocks.map((slot) => {
            const existing = byType.get(slot.type);
            return {
                id: existing?.id ?? slot.id,
                type: slot.type,
                colSpan: slot.colSpan,
            };
        }),
    };
}

export const DEFAULT_INTRO_LAYOUT: IntroLayoutConfig = applyIntroTemplate("rows");

export const INTRO_BLOCK_LABEL: Record<IntroBlockType, string> = {
    banner: "배너",
    intro: "팀 소개 메시지",
    metaCreated: "생성일",
    metaCreator: "팀 생성자",
};

/** 순서·타입·너비가 같으면 같은 템플릿으로 간주 */
export function introLayoutSignature(layout: IntroLayoutConfig): string {
    return layout.blocks.map((b) => `${b.type}:${b.colSpan}`).join("|");
}

export function findMatchingTemplateId(layout: IntroLayoutConfig): IntroTemplateId | null {
    const sig = introLayoutSignature(layout);
    for (const id of INTRO_TEMPLATE_ORDER) {
        if (introLayoutSignature(applyIntroTemplate(id)) === sig) return id;
    }
    return null;
}

/** 예전 템플릿·프리셋 시그니처를 현재 프리셋에 맞춤 */
function migrateLegacyIntroLayout(config: IntroLayoutConfig): IntroLayoutConfig {
    const sig = introLayoutSignature(config);
    if (sig === "banner:4|intro:4|metaCreated:4|metaCreator:12") {
        return applyIntroTemplate("threeCol");
    }
    if (sig === "banner:6|intro:6|metaCreated:6|metaCreator:6") {
        return applyIntroTemplate("twoCol");
    }
    /** 구 포커스·열·그리드(동일 배치) */
    if (sig === "banner:12|metaCreated:6|metaCreator:6|intro:12") {
        return applyIntroTemplate("twoCol");
    }
    /** 구 우선순위 표 등: 가장 가까운 기본으로 */
    if (sig === "banner:12|metaCreated:4|intro:8|metaCreator:12") {
        return applyIntroTemplate("rows");
    }
    return config;
}

export function parseIntroLayoutJson(raw: string | null | undefined): IntroLayoutConfig {
    if (raw == null || String(raw).trim() === "") {
        return DEFAULT_INTRO_LAYOUT;
    }
    try {
        const parsed = JSON.parse(String(raw)) as unknown;
        if (!isValidIntroLayoutConfig(parsed)) {
            return DEFAULT_INTRO_LAYOUT;
        }
        return migrateLegacyIntroLayout(parsed);
    } catch {
        return DEFAULT_INTRO_LAYOUT;
    }
}

export function isValidIntroLayoutConfig(x: unknown): x is IntroLayoutConfig {
    if (!x || typeof x !== "object") return false;
    const o = x as IntroLayoutConfig;
    if (o.v !== INTRO_LAYOUT_VERSION) return false;
    if (!Array.isArray(o.blocks) || o.blocks.length !== 4) return false;
    const seen = new Set<IntroBlockType>();
    for (const b of o.blocks) {
        if (!b || typeof b !== "object") return false;
        if (typeof (b as IntroLayoutBlock).id !== "string") return false;
        const type = (b as IntroLayoutBlock).type;
        if (!BLOCK_TYPES.includes(type)) return false;
        if (seen.has(type)) return false;
        seen.add(type);
        const span = (b as IntroLayoutBlock).colSpan;
        if (![4, 6, 8, 12].includes(span)) return false;
    }
    return seen.size === 4;
}

export function stringifyIntroLayout(config: IntroLayoutConfig): string {
    return JSON.stringify(config);
}

/** 소개 탭: 좁은 화면에서는 블록을 세로로 쌓고, md 이상에서만 열 너비 적용 */
export function colSpanClass(span: IntroColSpan): string {
    if (span === 12) return "col-span-12";
    if (span === 8) return "col-span-12 md:col-span-8";
    if (span === 6) return "col-span-12 md:col-span-6";
    return "col-span-12 md:col-span-4";
}

/**
 * 레이아웃 편집기 미리보기 전용: 뷰포트/패널이 좁아도 12칸 그리드 비율을 그대로 보여줌.
 * (설정 탭 등 `md` 미만 너비에서도 열·그리드 템플릿이 보이도록 함)
 */
export function colSpanClassFixed(span: IntroColSpan): string {
    if (span === 12) return "col-span-12";
    if (span === 8) return "col-span-8";
    if (span === 6) return "col-span-6";
    return "col-span-4";
}
