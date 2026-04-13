import * as React from "react";

const detailTabButtonBase =
    "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5";

function detailTabButtonClass(isActive: boolean): string {
    return [
        detailTabButtonBase,
        isActive
            ? "border-stone-800 text-stone-800 dark:border-elivis-ink dark:text-elivis-ink"
            : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:border-elivis-line dark:hover:text-elivis-ink",
    ].join(" ");
}

const detailTabBarShellClass =
    "border-b border-stone-200 bg-white/95 backdrop-blur-sm dark:border-elivis-line dark:bg-elivis-surface/95";

export type ElivisDetailTabBarItem = {
    id: string;
    label: string;
};

export type ElivisDetailTabBarProps = {
    ariaLabel: string;
    items: ElivisDetailTabBarItem[];
    activeId: string;
    onSelect: (id: string) => void;
    /** 팀 상세: 탭 줄과 헤더 정렬용 trailing spacer */
    layout?: "default" | "trailingSpacer";
};

export function ElivisDetailTabBar({
    ariaLabel,
    items,
    activeId,
    onSelect,
    layout = "default",
}: ElivisDetailTabBarProps): React.ReactElement {
    const buttons = items.map((item) => (
        <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={detailTabButtonClass(activeId === item.id)}
        >
            {item.label}
        </button>
    ));

    if (layout === "trailingSpacer") {
        return (
            <div className={detailTabBarShellClass}>
                <div className="flex items-end justify-between gap-2 px-4 sm:px-5 md:px-6">
                    <nav className="flex gap-0 overflow-x-auto" aria-label={ariaLabel}>
                        {buttons}
                    </nav>
                    <span className="hidden sm:block pb-2" aria-hidden />
                </div>
            </div>
        );
    }

    return (
        <div className={detailTabBarShellClass}>
            <nav
                className="flex gap-0 overflow-x-auto px-4 sm:px-5 md:px-6"
                aria-label={ariaLabel}
            >
                {buttons}
            </nav>
        </div>
    );
}

const settingsNavClass =
    "flex shrink-0 gap-1 overflow-x-auto pb-1 lg:w-44 lg:flex-col lg:overflow-x-visible lg:pb-0";

const settingsButtonBase = [
    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    "whitespace-nowrap lg:w-full",
].join(" ");

function settingsNavButtonClass(isActive: boolean): string {
    return [
        settingsButtonBase,
        isActive
            ? "bg-stone-200 text-stone-900 dark:bg-elivis-surface-elevated dark:text-elivis-ink"
            : "text-stone-500 hover:bg-stone-50 hover:text-stone-700 dark:text-elivis-ink-secondary dark:hover:bg-elivis-surface-elevated dark:hover:text-elivis-ink",
    ].join(" ");
}

export type ElivisDetailSettingsNavItem = {
    id: string;
    label: string;
    /** SVG path `d` (Heroicons outline style) */
    iconPath: string;
};

export type ElivisDetailSettingsNavProps = {
    ariaLabel: string;
    items: ElivisDetailSettingsNavItem[];
    activeId: string;
    onSelect: (id: string) => void;
};

export function ElivisDetailSettingsNav({
    ariaLabel,
    items,
    activeId,
    onSelect,
}: ElivisDetailSettingsNavProps): React.ReactElement {
    return (
        <nav className={settingsNavClass} aria-label={ariaLabel}>
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={settingsNavButtonClass(activeId === item.id)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-4 w-4 shrink-0"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={item.iconPath}
                        />
                    </svg>
                    {item.label}
                </button>
            ))}
        </nav>
    );
}
