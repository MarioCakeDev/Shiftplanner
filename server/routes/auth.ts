import { Hono } from "hono";
import { initOidcAuthMiddleware, processOAuthCallback, revokeSession, getAuth } from "@hono/oidc-auth";
import { config } from "../lib/config";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const oidcAuthConfig = {
  OIDC_AUTH_SECRET: process.env.OIDC_AUTH_SECRET || "dev-secret-change-this-in-production-dev-secret-change-this-in-production",
  OIDC_ISSUER: config.oidc.issuer,
  OIDC_CLIENT_ID: config.oidc.clientId,
  OIDC_CLIENT_SECRET: config.oidc.clientSecret,
  OIDC_REDIRECT_URI: config.oidc.redirectUri,
  OIDC_AUTH_EXTERNAL_URL: process.env.OIDC_AUTH_EXTERNAL_URL,
  OIDC_COOKIE_DOMAIN: process.env.OIDC_COOKIE_DOMAIN,
  OIDC_COOKIE_PATH: "/",
  OIDC_SCOPES: "openid profile email",
  OIDC_AUTH_EXPIRES: process.env.OIDC_AUTH_EXPIRES,
  OIDC_AUTH_REFRESH_INTERVAL: process.env.OIDC_AUTH_REFRESH_INTERVAL,
  OIDC_AUDIENCE: process.env.OIDC_AUDIENCE,
  OIDC_JWT_ALG: "HS256" as const,
};

export const authRoutes = new Hono()
  .get("/login", (c) => c.redirect("/"))
  .get("/callback", async (c) => processOAuthCallback(c))
  .get("/logout", async (c) => {
    await revokeSession(c);
    return c.redirect("/");
  })
  .get("/me", async (c) => {
    const auth = await getAuth(c);
    if (!auth) return c.json({ error: "unauthorized" }, 401);
    return c.json({
      id: auth.sub || "",
      name: (auth.name as string) || "Unknown",
      email: (auth.email as string) || "",
      icalUrl: "",
    });
  });

export const oidcMiddleware = initOidcAuthMiddleware(oidcAuthConfig);

export function hasOidcConfig() {
  return !!(config.oidc.issuer && config.oidc.clientId && config.oidc.clientSecret);
}
