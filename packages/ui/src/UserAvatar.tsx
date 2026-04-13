"use client";

import { useState } from "react";

import { getAvatarColor, getInitials, toAvatarSrc } from "./utils/avatar";

export { getAvatarColor, getInitials, toAvatarSrc };

export function UserAvatar({
    userId,
    label,
    avatarUrl,
    sizeClass,
    ringClass = "ring-2 ring-white dark:ring-elivis-bg",
}: {
    userId: string;
    label: string;
    avatarUrl: string | null | undefined;
    sizeClass: string;
    ringClass?: string;
}) {
    const [imgError, setImgError] = useState(false);
    const src = toAvatarSrc(avatarUrl);
    const showImg = Boolean(src && !imgError);

    return (
        <div
            className={`${sizeClass} shrink-0 rounded-full ${ringClass} flex items-center justify-center font-semibold text-white shadow-sm overflow-hidden`}
            style={!showImg ? { backgroundColor: getAvatarColor(userId) } : undefined}
            title={label}
        >
            {showImg ? (
                <img
                    src={src!}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                getInitials(label)
            )}
        </div>
    );
}
