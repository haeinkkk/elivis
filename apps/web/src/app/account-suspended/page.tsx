import { Suspense } from "react";

import { AccountSuspendedClient } from "./AccountSuspendedClient";

function AccountSuspendedFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f7f5] px-4">
            <p className="text-sm text-stone-500">…</p>
        </div>
    );
}

export default function AccountSuspendedPage() {
    return (
        <Suspense fallback={<AccountSuspendedFallback />}>
            <AccountSuspendedClient />
        </Suspense>
    );
}
