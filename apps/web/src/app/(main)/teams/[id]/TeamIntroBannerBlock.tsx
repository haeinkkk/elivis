"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
    deleteTeamBannerAction,
    uploadTeamBannerAction,
} from "@/app/actions/teams";
import { getApiBaseUrl } from "@/lib/api";

function toBannerSrc(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${getApiBaseUrl()}${url}`;
}

export function TeamIntroBannerBlock({
    teamId,
    bannerUrl,
    canEdit,
    variant = "card",
}: {
    teamId: string;
    bannerUrl: string | null;
    canEdit: boolean;
    /** card: 소개 블록 카드용 / pageTop: 상세 최상단 배너 */
    variant?: "card" | "pageTop";
}) {
    const router = useRouter();
    const t = useTranslations("teams.detail");
    const fileRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const [displayUrl, setDisplayUrl] = useState<string | null>(() => toBannerSrc(bannerUrl));
    const [imgErr, setImgErr] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDisplayUrl(toBannerSrc(bannerUrl));
        setImgErr(false);
    }, [bannerUrl]);

    function pickFile() {
        fileRef.current?.click();
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowed.includes(file.type)) {
            setError(t("banner.errors.invalidType"));
            e.target.value = "";
            return;
        }
        const maxMb = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB) || 2;
        if (file.size > maxMb * 1024 * 1024) {
            setError(t("banner.errors.tooLarge", { maxMb }));
            e.target.value = "";
            return;
        }

        setError(null);
        const local = URL.createObjectURL(file);
        setDisplayUrl(local);
        setImgErr(false);

        const fd = new FormData();
        fd.append("banner", file);

        startTransition(async () => {
            const result = await uploadTeamBannerAction(teamId, fd);
            URL.revokeObjectURL(local);
            if (!result.ok) {
                setError(result.message ?? t("errors.saveFailed"));
                setDisplayUrl(toBannerSrc(bannerUrl));
            } else {
                setDisplayUrl(result.bannerUrl ?? null);
                router.refresh();
            }
        });

        e.target.value = "";
    }

    function onRemove() {
        setError(null);
        startTransition(async () => {
            const result = await deleteTeamBannerAction(teamId);
            if (!result.ok) {
                setError(result.message ?? t("errors.deleteFailed"));
            } else {
                setDisplayUrl(null);
                router.refresh();
            }
        });
    }

    const showImg = Boolean(displayUrl && !imgErr);
    const frameClass =
        variant === "pageTop"
            ? "border-b border-stone-200"
            : "rounded-t-2xl border-b border-stone-100";
    const mediaClass = variant === "pageTop" ? "h-[200px]" : "aspect-[15/4] sm:aspect-[20/5]";

    return (
        <div className={`relative w-full overflow-hidden bg-stone-100 ${frameClass}`}>
            <div className={`relative w-full ${mediaClass}`}>
                {showImg ? (
                    <img
                        src={displayUrl!}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200"
                        aria-hidden
                    >
                        <div className="px-4 text-center">
                            <p className="text-sm font-medium text-stone-500">{t("banner.title")}</p>
                            <p className="mt-1 text-xs text-stone-400">
                                {canEdit
                                    ? t("banner.helperEditable")
                                    : t("banner.helperReadonly")}
                            </p>
                        </div>
                    </div>
                )}
                {canEdit ? (
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={onFileChange}
                        />
                        <div className="absolute bottom-3 right-3 flex flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={pickFile}
                                disabled={isPending}
                                className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm ring-1 ring-stone-200/80 backdrop-blur transition hover:bg-white disabled:opacity-60"
                            >
                                {displayUrl && !imgErr ? t("banner.change") : t("banner.upload")}
                            </button>
                            {bannerUrl ? (
                                <button
                                    type="button"
                                    onClick={onRemove}
                                    disabled={isPending}
                                    className="rounded-lg bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-stone-900 disabled:opacity-60"
                                >
                                    {t("banner.remove")}
                                </button>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </div>
            {error ? (
                <p className="border-t border-stone-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
