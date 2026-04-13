"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** API 오류·네트워크 등으로 팀 상세를 불러오지 못했을 때 */
export function TeamDetailLoadError() {
    const t = useTranslations("teams.detail.loadError");
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-md text-stone-600 dark:text-elivis-ink-secondary">{t("message")}</p>
            <Link
                href="/teams"
                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
                {t("cta")}
            </Link>
        </div>
    );
}
