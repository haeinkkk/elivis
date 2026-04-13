"use client";

import { useState, useTransition } from "react";

interface TeamFavoriteButtonProps {
    teamId: string;
    initialIsFavorite: boolean;
    size?: "sm" | "md";
    onToggle?: (isFavorite: boolean) => void;
    onAdd: () => Promise<{ ok: boolean; message?: string }>;
    onRemove: () => Promise<{ ok: boolean; message?: string }>;
}

export function TeamFavoriteButton({
    teamId: _teamId,
    initialIsFavorite,
    size = "md",
    onToggle,
    onAdd,
    onRemove,
}: TeamFavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    const btnSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

    function handleClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        setErrorMsg(null);

        startTransition(() => {
            void (async () => {
                if (isFavorite) {
                    const res = await onRemove();
                    if (res.ok) {
                        setIsFavorite(false);
                        onToggle?.(false);
                    } else {
                        setErrorMsg(res.message ?? "오류가 발생했습니다.");
                    }
                } else {
                    const res = await onAdd();
                    if (res.ok) {
                        setIsFavorite(true);
                        onToggle?.(true);
                    } else {
                        setErrorMsg(res.message ?? "오류가 발생했습니다.");
                    }
                }
            })();
        });
    }

    return (
        <span className="relative inline-flex shrink-0">
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                className={`flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${btnSize} ${
                    isFavorite
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-stone-300 hover:text-amber-400 dark:text-elivis-ink-secondary dark:hover:text-amber-400"
                }`}
            >
                <svg
                    className={iconSize}
                    viewBox="0 0 24 24"
                    fill={isFavorite ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={1.8}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                    />
                </svg>
            </button>
            {errorMsg && (
                <span className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white shadow">
                    {errorMsg}
                </span>
            )}
        </span>
    );
}
