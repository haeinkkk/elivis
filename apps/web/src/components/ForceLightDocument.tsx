"use client";

import { useLayoutEffect, type ReactNode } from "react";

/** `@repo/ui` theme/constants.ts 와 동일 — 번들 경로 단순화를 위해 여기서만 사용 */
const DARK_MODE_STORAGE_KEY = "elivis-dark-mode";

function readStoredDark(): boolean {
    try {
        const v = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
        return v === "1" || v === "true";
    } catch {
        return false;
    }
}

/**
 * 인증 화면 전용: `html.dark` 제거.
 * - `ThemeProvider`의 `useLayoutEffect`가 자식보다 뒤에 돌며 localStorage 기준으로 `dark`를 다시 붙이므로,
 *   같은 틱 끝에서 `queueMicrotask`로 한 번 더 제거한다.
 * - 언마운트 시에는 저장값에 맞춰 `dark` 복구 (저장값은 변경하지 않음).
 */
export function ForceLightDocument({ children }: { children: ReactNode }) {
    useLayoutEffect(() => {
        const root = document.documentElement;
        const strip = () => {
            root.classList.remove("dark");
        };
        strip();
        queueMicrotask(strip);

        return () => {
            root.classList.toggle("dark", readStoredDark());
        };
    }, []);

    return <>{children}</>;
}
