"use client";

import { UserAvatar } from "../../UserAvatar";
import type { ApiTeamPostAuthor } from "../../types/team-posts-api";

export function displayTeamPostAuthorName(u: { name: string | null; email: string }) {
    return u.name ?? u.email;
}

export function TeamCommunityAuthorAvatar({
    author,
    sizeClass,
}: {
    author: ApiTeamPostAuthor;
    sizeClass: string;
}) {
    return (
        <UserAvatar
            userId={author.id}
            label={displayTeamPostAuthorName(author)}
            avatarUrl={author.avatarUrl}
            sizeClass={sizeClass}
            ringClass=""
        />
    );
}
