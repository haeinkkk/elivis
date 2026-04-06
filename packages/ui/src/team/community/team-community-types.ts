export type PostCategory = "general" | "notice" | "discussion" | "share";

export type PostCategoryFilterId = PostCategory | "all";

export const CATEGORY_FILTER_ORDER: PostCategoryFilterId[] = [
    "all",
    "notice",
    "discussion",
    "share",
    "general",
];

export interface PendingAttachment {
    localId: string;
    url: string;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
}
