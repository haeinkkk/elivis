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
        "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
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
