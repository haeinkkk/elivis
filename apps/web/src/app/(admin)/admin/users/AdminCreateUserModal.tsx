"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { createAdminUserAction } from "@/app/actions/admin";
import type { AdminUserRow } from "@/lib/server/admin.server";

interface AdminCreateUserModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: (user: AdminUserRow) => void;
}

export function AdminCreateUserModal({ open, onClose, onCreated }: AdminCreateUserModalProps) {
    const t = useTranslations("adminUsers");
    const tAuth = useTranslations("auth");
    const tRole = useTranslations("domain.systemRole");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");

    const emailRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        systemRole: "USER" as "SUPER_ADMIN" | "USER",
    });

    useEffect(() => {
        if (open) {
            setForm({ email: "", password: "", name: "", systemRole: "USER" });
            setConfirmPassword("");
            setError(null);
            setShowPassword(false);
            setShowConfirm(false);
            setTimeout(() => emailRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    function onChange(field: keyof typeof form, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setError(null);
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.email.trim() || !form.name.trim() || !form.password) {
            setError(t("formRequiredFields"));
            return;
        }
        if (form.password !== confirmPassword) {
            setError(t("formPasswordMismatch"));
            return;
        }
        setError(null);
        startTransition(async () => {
            const result = await createAdminUserAction({
                email: form.email.trim(),
                password: form.password,
                            name: form.name.trim(),
                systemRole: form.systemRole,
            });
            if (!result.ok) {
                setError(result.message);
                return;
            }
            onCreated(result.user);
            onClose();
        });
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
        >
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 dark:border-elivis-line bg-white dark:bg-elivis-surface shadow-xl">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-elivis-line px-5 py-4">
                    <h2
                        id="create-user-title"
                        className="text-base font-semibold text-stone-800 dark:text-elivis-ink"
                    >
                        {t("modalTitle")}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated hover:text-stone-600"
                        aria-label={t("modalClose")}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18 18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* 폼 */}
                <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
                    {/* 이메일 */}
                    <div>
                        <label
                            htmlFor="new-user-email"
                            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {tAuth("emailLabel")}
                            <span className="ml-1 text-red-500">*</span>
                        </label>
                        <input
                            ref={emailRef}
                            id="new-user-email"
                            type="email"
                            autoComplete="off"
                            required
                            disabled={pending}
                            value={form.email}
                            onChange={(e) => onChange("email", e.target.value)}
                            placeholder="user@example.com"
                            className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3.5 py-2.5 text-sm text-stone-800 dark:text-elivis-ink outline-none transition-colors placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50 dark:focus:border-elivis-accent dark:focus:bg-elivis-surface dark:focus:ring-elivis-accent/30"
                        />
                    </div>

                    {/* 이름 */}
                    <div>
                        <label
                            htmlFor="new-user-name"
                            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("colName")}
                            <span className="ml-1 text-red-500">*</span>
                        </label>
                        <input
                            id="new-user-name"
                            type="text"
                            autoComplete="off"
                            required
                            disabled={pending}
                            value={form.name}
                            onChange={(e) => onChange("name", e.target.value)}
                            placeholder={t("placeholderNameExample")}
                            className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3.5 py-2.5 text-sm text-stone-800 dark:text-elivis-ink outline-none transition-colors placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50 dark:focus:border-elivis-accent dark:focus:bg-elivis-surface dark:focus:ring-elivis-accent/30"
                        />
                    </div>

                    {/* 비밀번호 */}
                    <div>
                        <label
                            htmlFor="new-user-password"
                            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {tAuth("passwordLabel")}
                            <span className="ml-1 text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="new-user-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                required
                                disabled={pending}
                                value={form.password}
                                onChange={(e) => onChange("password", e.target.value)}
                                placeholder={t("placeholderPassword")}
                                className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3.5 py-2.5 pr-10 text-sm text-stone-800 dark:text-elivis-ink outline-none transition-colors placeholder:text-stone-400 dark:placeholder:text-elivis-ink-muted focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50 dark:focus:border-elivis-accent dark:focus:bg-elivis-surface dark:focus:ring-elivis-accent/30"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-elivis-ink-secondary hover:text-stone-600 dark:hover:text-elivis-ink"
                                aria-label={
                                    showPassword ? t("ariaHidePassword") : t("ariaShowPassword")
                                }
                            >
                                {showPassword ? (
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 비밀번호 확인 */}
                    <div>
                        <label
                            htmlFor="new-user-password-confirm"
                            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("passwordConfirmLabel")}
                            <span className="ml-1 text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="new-user-password-confirm"
                                type={showConfirm ? "text" : "password"}
                                autoComplete="new-password"
                                required
                                disabled={pending}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder={t("placeholderConfirmPassword")}
                                className={`w-full rounded-xl border bg-stone-50 px-3.5 py-2.5 pr-10 text-sm text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:bg-white disabled:opacity-50 dark:bg-elivis-surface dark:text-elivis-ink dark:placeholder:text-elivis-ink-muted dark:focus:bg-elivis-surface ${
                                    confirmPassword && confirmPassword !== form.password
                                        ? "border-red-300 focus:border-red-300 focus:ring-2 focus:ring-red-100 dark:border-red-800 dark:focus:border-red-500 dark:focus:ring-red-900/40"
                                        : confirmPassword && confirmPassword === form.password
                                          ? "border-green-300 focus:border-green-300 focus:ring-2 focus:ring-green-100 dark:border-green-700 dark:focus:border-green-500 dark:focus:ring-green-900/40"
                                          : "border-stone-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-elivis-line dark:focus:border-elivis-accent dark:focus:ring-elivis-accent/30"
                                }`}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-elivis-ink-secondary hover:text-stone-600 dark:hover:text-elivis-ink"
                                aria-label={
                                    showConfirm ? t("ariaHidePassword") : t("ariaShowPassword")
                                }
                            >
                                {showConfirm ? (
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                        />
                                    </svg>
                                )}
                            </button>
                            {/* 일치 여부 인디케이터 */}
                            {confirmPassword && (
                                <span className="absolute right-9 top-1/2 -translate-y-1/2">
                                    {confirmPassword === form.password ? (
                                        <svg
                                            className="h-4 w-4 text-green-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m4.5 12.75 6 6 9-13.5"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="h-4 w-4 text-red-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6 18 18 6M6 6l12 12"
                                            />
                                        </svg>
                                    )}
                                </span>
                            )}
                        </div>
                        {confirmPassword && confirmPassword !== form.password && (
                            <p className="mt-1 text-xs text-red-500">{t("formPasswordMismatch")}</p>
                        )}
                    </div>

                    {/* 역할 */}
                    <div>
                        <label
                            htmlFor="new-user-role"
                            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-elivis-ink"
                        >
                            {t("systemRoleLabel")}
                        </label>
                        <select
                            id="new-user-role"
                            disabled={pending}
                            value={form.systemRole}
                            onChange={(e) =>
                                onChange("systemRole", e.target.value)
                            }
                            className="w-full rounded-xl border border-stone-200 dark:border-elivis-line bg-stone-50 dark:bg-elivis-surface px-3.5 py-2.5 text-sm text-stone-800 dark:text-elivis-ink outline-none transition-colors focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200 disabled:opacity-50 dark:focus:border-elivis-accent dark:focus:bg-elivis-surface dark:focus:ring-elivis-accent/30"
                        >
                            <option value="USER">
                                {t("roleSelectOption", {
                                    code: "USER",
                                    label: tRole("USER"),
                                })}
                            </option>
                            <option value="SUPER_ADMIN">
                                {t("roleSelectOption", {
                                    code: "SUPER_ADMIN",
                                    label: tRole("SUPER_ADMIN"),
                                })}
                            </option>
                        </select>
                    </div>

                    {/* 오류 */}
                    {error && (
                        <div
                            className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={pending}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-elivis-ink-secondary transition-colors hover:bg-stone-100 dark:hover:bg-elivis-surface-elevated disabled:opacity-50"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
                        >
                            {pending ? (
                                <>
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    {t("creating")}
                                </>
                            ) : (
                                t("addUser")
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
