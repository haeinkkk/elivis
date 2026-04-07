/** GET/PATCH `/api/admin/auth-settings` */

export type ApiAdminAuthSettingsLdap = {
    enabled: boolean;
    url: string;
    userDnTemplate: string;
    bindDn: string;
    hasBindPassword: boolean;
    searchBase: string;
    searchFilter: string;
    nameAttribute: string;
    timeoutMs: number;
};

export type ApiAdminAuthSettings = {
    publicSignupEnabled: boolean;
    updatedAt: string;
    ldap: ApiAdminAuthSettingsLdap;
};
