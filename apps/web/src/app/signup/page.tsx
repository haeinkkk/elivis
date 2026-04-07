import { fetchPublicAuthConfig } from "@/lib/server/auth.server";

import { SignupDisabled } from "./SignupDisabled";
import { SignupPageClient } from "./SignupPageClient";

export default async function SignupPage() {
    const config = await fetchPublicAuthConfig();
    if (!config.publicSignupEnabled) {
        return <SignupDisabled />;
    }
    return <SignupPageClient ldapEnabled={config.ldapEnabled} />;
}
