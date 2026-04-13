import type { ReactNode } from "react";

import { ForceLightDocument } from "@/components/ForceLightDocument";

export default function SignupLayout({ children }: { children: ReactNode }) {
    return <ForceLightDocument>{children}</ForceLightDocument>;
}
