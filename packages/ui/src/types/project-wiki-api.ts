export type ApiProjectWikiUser = {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
};

export type ApiProjectWikiListItem = {
    slug: string;
    title: string;
    updatedAt: string;
    updatedBy: ApiProjectWikiUser;
};

export type ApiProjectWikiListPayload = {
    pages: ApiProjectWikiListItem[];
};

export type ApiProjectWikiPageDetail = {
    slug: string;
    title: string;
    contentMd: string;
    updatedAt: string;
    updatedBy: ApiProjectWikiUser;
};

export type ProjectWikiListResult =
    | { ok: true; data: ApiProjectWikiListPayload }
    | { ok: false; message: string };

export type ProjectWikiPageResult =
    | { ok: true; data: ApiProjectWikiPageDetail }
    | { ok: false; message: string };

export type ProjectWikiDeleteResult = { ok: true } | { ok: false; message: string };

export type ProjectWikiReorderResult = { ok: true } | { ok: false; message: string };
