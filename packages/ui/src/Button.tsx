import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary";
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    children,
    className = "",
    ...props
}: ButtonProps): React.ReactElement {
    const base =
        "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-elivis-bg";
    const variants = {
        primary:
            "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-elivis-accent dark:hover:bg-elivis-accent-hover dark:focus:ring-elivis-accent",
        secondary:
            "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-elivis-surface-elevated dark:text-elivis-ink dark:hover:bg-elivis-surface dark:focus:ring-elivis-line",
    };

    return (
        <button
            type="button"
            className={`${base} ${variants[variant]} ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    );
}
