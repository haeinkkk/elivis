"use client";

import { UserAvatar } from "../../UserAvatar";
import type { ProjectDetailParticipant } from "../../types/project-detail";

const AVATAR_STACK_MAX = 4;

export function ProjectParticipantAvatarStack({
    participants,
    size = "md",
}: {
    participants: ProjectDetailParticipant[];
    size?: "sm" | "md";
}) {
    const displayCount = Math.min(participants.length, AVATAR_STACK_MAX);
    const overflow = participants.length - displayCount;
    const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

    return (
        <div className="flex items-center -space-x-2" aria-label={`멤버 ${participants.length}명`}>
            {participants.slice(0, displayCount).map((user) => (
                <UserAvatar
                    key={user.id}
                    userId={user.id}
                    label={user.name}
                    avatarUrl={user.avatarUrl}
                    sizeClass={sizeClass}
                />
            ))}
            {overflow > 0 && (
                <div
                    className={`${sizeClass} shrink-0 rounded-full ring-2 ring-white bg-stone-600 flex items-center justify-center font-medium text-white shadow-sm dark:ring-elivis-bg`}
                    title={`외 ${overflow}명`}
                >
                    +{overflow}
                </div>
            )}
        </div>
    );
}
