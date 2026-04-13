import type { PostCategory } from "./team-community-types";

export const CATEGORY_BADGE_CLASS: Record<PostCategory, string> = {
    notice:
        "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/45 dark:text-red-300 dark:ring-red-800/50",
    discussion:
        "bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-800/50",
    share:
        "bg-green-50 text-green-600 ring-green-200 dark:bg-green-950/45 dark:text-green-300 dark:ring-green-800/50",
    general:
        "bg-stone-100 text-stone-500 ring-stone-200 dark:bg-elivis-surface-elevated dark:text-elivis-ink-secondary dark:ring-elivis-line",
};

export const CATEGORY_CARD: Record<
    PostCategory,
    { border: string; selectedBg: string; hoverBg: string }
> = {
    notice: {
        border: "border-l-red-400 dark:border-l-red-500",
        selectedBg: "bg-red-50/60 dark:bg-red-950/35",
        hoverBg: "hover:bg-red-50/40 dark:hover:bg-red-950/25",
    },
    discussion: {
        border: "border-l-blue-400 dark:border-l-blue-500",
        selectedBg: "bg-blue-50/60 dark:bg-blue-950/35",
        hoverBg: "hover:bg-blue-50/40 dark:hover:bg-blue-950/25",
    },
    share: {
        border: "border-l-green-400 dark:border-l-green-500",
        selectedBg: "bg-green-50/60 dark:bg-green-950/35",
        hoverBg: "hover:bg-green-50/40 dark:hover:bg-green-950/25",
    },
    general: {
        border: "border-l-stone-300 dark:border-l-elivis-line",
        selectedBg: "bg-stone-50 dark:bg-elivis-surface-elevated",
        hoverBg: "hover:bg-stone-50 dark:hover:bg-elivis-surface-elevated",
    },
};
