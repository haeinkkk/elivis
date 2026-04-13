"use client";

import { useTranslations } from "next-intl";

import { ElivisSelect } from "../../ElivisSelect";

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
    const options = [
        ...(nullable ? [{ value: "", label: placeholder ?? t("taskDetail.none") }] : []),
        ...items.map((item) => ({ value: item.id, label: item.name })),
    ];
    return (
        <ElivisSelect
            searchable
            variant="field"
            value={value ?? ""}
            onValueChange={(v) => !disabled && onChange(v || null)}
            disabled={disabled}
            options={options}
            searchPlaceholder={t("taskDetail.optionSearchPlaceholder")}
            noResultsText={t("taskDetail.noOptionsMatch")}
        />
    );
}
