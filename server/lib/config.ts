export const config = {
  port: parseInt(process.env.PORT || "3000"),
  databaseUrl: process.env.DATABASE_URL || "data/schichtplan.db",
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  oidc: {
    issuer: process.env.OIDC_ISSUER || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: process.env.OIDC_REDIRECT_URI || `http://localhost:${process.env.PORT || "3000"}/auth/callback`,
  },
  sessionSecret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  get authEnabled() {
    return !!(this.oidc.issuer && this.oidc.clientId);
  },
};
