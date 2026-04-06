import type { PostCategory } from "./team-community-types";

export const CATEGORY_BADGE_CLASS: Record<PostCategory, string> = {
    notice: "bg-red-50 text-red-600 ring-red-200",
    discussion: "bg-blue-50 text-blue-600 ring-blue-200",
    share: "bg-green-50 text-green-600 ring-green-200",
    general: "bg-stone-100 text-stone-500 ring-stone-200",
};

export const CATEGORY_CARD: Record<
    PostCategory,
    { border: string; selectedBg: string; hoverBg: string }
> = {
    notice: {
        border: "border-l-red-400",
        selectedBg: "bg-red-50/60",
        hoverBg: "hover:bg-red-50/40",
    },
    discussion: {
        border: "border-l-blue-400",
        selectedBg: "bg-blue-50/60",
        hoverBg: "hover:bg-blue-50/40",
    },
    share: {
        border: "border-l-green-400",
        selectedBg: "bg-green-50/60",
        hoverBg: "hover:bg-green-50/40",
    },
    general: {
        border: "border-l-stone-300",
        selectedBg: "bg-stone-50",
        hoverBg: "hover:bg-stone-50",
    },
};
