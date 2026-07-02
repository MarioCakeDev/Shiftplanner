import { Hono } from "hono";
import { oidcAuthMiddleware, processOAuthCallback, revokeSession, getAuth } from "@hono/oidc-auth";
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
export const oidcMiddleware = initOidcAuthMiddleware(oidcAuthConfig);

export const authRoutes = new Hono()
  .use("*", oidcAuthMiddleware())
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

export function hasOidcConfig() {
  return !!(config.oidc.issuer && config.oidc.clientId && config.oidc.clientSecret);
}
