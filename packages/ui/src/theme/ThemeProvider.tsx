"use client";

import {
    createContext,
    useContext,
    useLayoutEffect,
    useState,
    type ReactNode,
} from "react";

import { DARK_MODE_STORAGE_KEY } from "./constants";

export type ThemeContextValue = {
    dark: boolean;
    setDark: (value: boolean) => void;
    toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredDark(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const v = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
        return v === "1" || v === "true";
    } catch {
        return false;
    }
}

function persistDark(dark: boolean) {
    try {
        window.localStorage.setItem(DARK_MODE_STORAGE_KEY, dark ? "1" : "0");
    } catch {
        /* ignore quota / private mode */
    }
}

function applyHtmlClass(dark: boolean) {
    document.documentElement.classList.toggle("dark", dark);
}

/** 로그인·회원가입은 DOM만 라이트로 둔다(저장값·React state는 그대로). */
function isLoginOrSignupPath(): boolean {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    return path === "/login" || path === "/signup";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [dark, setDarkState] = useState(false);

    useLayoutEffect(() => {
        const initial = readStoredDark();
        setDarkState(initial);
        applyHtmlClass(isLoginOrSignupPath() ? false : initial);
    }, []);

    function setDark(value: boolean) {
        setDarkState(value);
        persistDark(value);
        applyHtmlClass(value);
    }

    function toggleDark() {
        setDarkState((prev) => {
            const next = !prev;
            persistDark(next);
            applyHtmlClass(next);
            return next;
        });
    }

    const value = { dark, setDark, toggleDark };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme는 ThemeProvider 안에서만 사용할 수 있습니다.");
    }
    return ctx;
}
