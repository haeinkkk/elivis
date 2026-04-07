import { fetchPublicAuthConfig } from "@/lib/server/auth.server";

import { LoginPageClient } from "./LoginPageClient";

export default async function LoginPage() {
    const config = await fetchPublicAuthConfig();
    return (
        <LoginPageClient
            publicSignupEnabled={config.publicSignupEnabled}
            ldapEnabled={config.ldapEnabled}
        />
    );
}
