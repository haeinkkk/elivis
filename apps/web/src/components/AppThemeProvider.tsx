"use client";

import { ThemeProvider } from "@repo/ui";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
}
