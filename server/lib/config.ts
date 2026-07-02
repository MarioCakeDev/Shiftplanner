function normalizeOidcRedirectUri(value: string | undefined) {
  const fallback = `/api/auth/callback`;
  if (!value) return fallback;
  if (value.startsWith("/") || /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) return value;
  return `http://${value}`;
}

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  databaseUrl: process.env.DATABASE_URL || "data/schichtplan.db",
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  oidc: {
    issuer: process.env.OIDC_ISSUER || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: normalizeOidcRedirectUri(process.env.OIDC_REDIRECT_URI),
  },
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  get authEnabled() {
    return !!(this.oidc.issuer && this.oidc.clientId);
  },
};
