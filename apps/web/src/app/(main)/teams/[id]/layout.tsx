import type { ReactNode } from "react";

/** `output: export`(Electron 정적 빌드)용. 실제 id는 클라이언트 라우팅으로 처리 */
export function generateStaticParams() {
    return [{ id: "placeholder" }];
}

export default function TeamIdLayout({ children }: { children: ReactNode }) {
    return children;
}
