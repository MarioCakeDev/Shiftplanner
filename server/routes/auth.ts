import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { config } from "../lib/config";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomUUID } from "crypto";

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

export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  if (!config.authEnabled) {
    c.set("user", { id: "dev-user", name: "Dev User", email: "dev@localhost" });
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const JWKS = createRemoteJWKSet(new URL(`${config.oidc.issuer}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.oidc.issuer,
    });

    const sub = payload.sub as string;
    const name = (payload.name || payload.preferred_username || "Unknown") as string;
    const email = (payload.email || "") as string;

    let user = db.select().from(users).where(eq(users.id, sub)).get();
    if (!user) {
      const newUser = {
        id: sub,
        name,
        email,
        icalToken: randomUUID(),
      };
      db.insert(users).values(newUser).run();
      user = newUser as typeof users.$inferSelect;
    }

    c.set("user", { id: user.id, name: user.name, email: user.email });
    await next();
  } catch {
    return c.json({ error: "invalid token" }, 401);
  }
});
