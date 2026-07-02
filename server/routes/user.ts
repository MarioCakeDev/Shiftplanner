import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { UserInfo, ErrorResponse } from "../../shared/types";
import type { AuthUser } from "./auth";

const app = new Hono<{ Variables: { user: AuthUser } }>()
  .get("/me", (c) => {
    const user = c.get("user");
    const dbUser = db.select().from(users).where(eq(users.id, user.id)).get();
    if (!dbUser) return c.json({ error: "not found" } satisfies ErrorResponse, 404);
    return c.json({
      id: dbUser.id, name: dbUser.name, email: dbUser.email,
      icalUrl: `/api/ical/${dbUser.icalToken}`,
    } satisfies UserInfo);
  })
  .post("/regenerate-ical-token", (c) => {
    const user = c.get("user");
    const newToken = randomUUID();
    db.update(users).set({ icalToken: newToken }).where(eq(users.id, user.id)).run();
    return c.json({ icalUrl: `/api/ical/${newToken}` });
  });

export type UserAppType = typeof app;
export default app;
