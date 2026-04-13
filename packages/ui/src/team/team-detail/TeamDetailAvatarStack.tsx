"use client";

import { useTranslations } from "next-intl";

import { UserAvatar } from "../../UserAvatar";
import { TEAM_AVATAR_STACK_MAX } from "./team-detail-helpers";

export function TeamDetailAvatarStack({
    members,
    size = "md",
}: {
    members: { id: string; label: string; avatarUrl: string | null }[];
    size?: "sm" | "md";
}) {
    const t = useTranslations("teams.detail");
    const displayCount = Math.min(members.length, TEAM_AVATAR_STACK_MAX);
    const overflow = members.length - displayCount;
    const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

    return (
        <div
            className="flex items-center -space-x-2"
            aria-label={t("labels.membersCount", { count: members.length })}
        >
            {members.slice(0, displayCount).map((m) => (
                <UserAvatar
                    key={m.id}
                    userId={m.id}
                    label={m.label}
                    avatarUrl={m.avatarUrl}
                    sizeClass={sizeClass}
                />
            ))}
            {overflow > 0 && (
                <div
                    className={`${sizeClass} shrink-0 rounded-full ring-2 ring-white bg-stone-600 flex items-center justify-center font-medium text-white shadow-sm dark:ring-elivis-bg`}
                    title={t("labels.avatarStackOverflow", { count: overflow })}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}
