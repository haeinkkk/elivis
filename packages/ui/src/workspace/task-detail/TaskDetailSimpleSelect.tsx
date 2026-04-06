"use client";

import { useTranslations } from "next-intl";

export function TaskDetailSimpleSelect<T extends { id: string; name: string; color: string }>({
    value,
    items,
    nullable,
    placeholder,
    onChange,
    disabled = false,
}: {
    value: string | null;
    items: T[];
    nullable?: boolean;
    placeholder?: string;
    onChange: (id: string | null) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("workspace");
    return (
        <select
            value={value ?? ""}
            onChange={(e) => !disabled && onChange(e.target.value || null)}
            disabled={disabled}
            className="rounded border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-stone-400 disabled:cursor-default disabled:opacity-70"
        >
            {nullable && <option value="">{placeholder ?? t("taskDetail.none")}</option>}
            {items.map((item) => (
                <option key={item.id} value={item.id}>
                    {item.name}
                </option>
            ))}
        </select>
    );
}
