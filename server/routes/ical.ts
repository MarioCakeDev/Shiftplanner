import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateIcal } from "../lib/ical";
import type { ErrorResponse } from "../../shared/types";

const app = new Hono()
  .get("/:token", (c) => {
    const token = c.req.param("token");
    const user = db.select().from(users).where(eq(users.icalToken, token)).get();
    if (!user) return c.json({ error: "invalid token" } satisfies ErrorResponse, 404);

    try {
      const ics = generateIcal(user.id);
      c.header("Content-Type", "text/calendar; charset=utf-8");
      c.header("Content-Disposition", `attachment; filename="schichtplan.ics"`);
      return c.body(ics);
    } catch {
      return c.json({ error: "failed to generate calendar" } satisfies ErrorResponse, 500);
    }
  });

export type IcalAppType = typeof app;
export default app;
