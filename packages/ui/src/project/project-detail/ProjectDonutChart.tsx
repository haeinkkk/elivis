"use client";

export function ProjectDonutChart({
    percent,
    size = 120,
    strokeWidth = 12,
    color = "#22c55e",
}: {
    percent: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (percent / 100) * circumference;
    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f5f5f4" strokeWidth={strokeWidth} />
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
}
