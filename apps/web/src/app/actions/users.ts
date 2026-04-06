"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { apiUrl, getApiBaseUrl } from "@/lib/http/api-base-url";
import { AT_COOKIE } from "@/lib/server/auth.server";
import { updateMyProfile } from "@/lib/server/user-profile.server";
import type { UserStatus } from "@/lib/user/user-types";

export interface UpdateProfileState {
    error?: string;
    success?: string;
}

export async function updateProfileAction(
    _prev: UpdateProfileState,
    formData: FormData,
): Promise<UpdateProfileState> {
    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const bio = (formData.get("bio") as string | null)?.trim() ?? null;

    if (!name) {
        return { error: "이름을 입력해주세요." };
    }

    const result = await updateMyProfile({ name, bio: bio || null });

    if (!result.ok) {
        return { error: result.message };
    }

    revalidatePath("/settings");
    return { success: "saved" };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateStatusResult {
    ok: boolean;
    message?: string;
}

export async function updateStatusAction(status: UserStatus): Promise<UpdateStatusResult> {
    const result = await updateMyProfile({ status });

    if (!result.ok) {
        return { ok: false, message: result.message };
    }

    revalidatePath("/settings");
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarActionResult {
    ok: boolean;
    message?: string;
    avatarUrl?: string;
}

export async function uploadAvatarAction(formData: FormData): Promise<AvatarActionResult> {
    const jar = await cookies();
    const accessToken = jar.get(AT_COOKIE)?.value ?? "";
    const lang = jar.get("elivis_lang")?.value ?? "ko";

    try {
        const res = await fetch(apiUrl("/api/users/me/avatar"), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Accept-Language": lang,
            },
            body: formData,
        });

        const body = (await res.json()) as {
            code: number;
            message: string;
            data: { avatarUrl: string };
        };

        if (!res.ok) {
            return { ok: false, message: body.message };
        }

        revalidatePath("/settings");
        return {
            ok: true,
            avatarUrl: `${getApiBaseUrl()}${body.data.avatarUrl}`,
        };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}

export async function deleteAvatarAction(): Promise<AvatarActionResult> {
    const jar = await cookies();
    const accessToken = jar.get(AT_COOKIE)?.value ?? "";
    const lang = jar.get("elivis_lang")?.value ?? "ko";

    try {
        const res = await fetch(apiUrl("/api/users/me/avatar"), {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Accept-Language": lang,
            },
        });

        const body = (await res.json()) as { code: number; message: string; data: unknown };

        if (!res.ok) {
            return { ok: false, message: body.message };
        }

        revalidatePath("/settings");
        return { ok: true };
    } catch {
        return { ok: false, message: "네트워크 오류가 발생했습니다." };
    }
}
