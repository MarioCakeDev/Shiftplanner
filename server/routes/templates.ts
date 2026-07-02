import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../db";
import { shiftTemplates, shifts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { ShiftTemplate, CreateTemplateInput, ErrorResponse } from "../../shared/types";
import type { AuthUser } from "./auth";
import { invalidateIcalCache } from "../lib/ical";

function endDateTimeFor(date: string, endTime: string, startTime: string) {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const startMinTotal = startHour * 60 + startMin;
  const endMinTotal = endHour * 60 + endMin;

  let endDate = date;
  if (endMinTotal <= startMinTotal) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().slice(0, 10);
  }

  return `${endDate}T${endTime}`;
}

const createSchema = z.object({
  title: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const app = new Hono<{ Variables: { user: AuthUser } }>()
  .get("/", (c) => {
    const user = c.get("user");
    const templates = db.select().from(shiftTemplates).where(eq(shiftTemplates.userId, user.id)).all();
    return c.json(templates satisfies ShiftTemplate[]);
  })
  .post("/", zValidator("json", createSchema), (c) => {
    const user = c.get("user");
    const body = c.req.valid("json") as CreateTemplateInput;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.insert(shiftTemplates).values({ ...body, id, userId: user.id, createdAt }).run();
    return c.json({ id, userId: user.id, createdAt, ...body } satisfies ShiftTemplate, 201);
  })
  .put("/:id", zValidator("json", createSchema), (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json") as CreateTemplateInput;
    const existing = db.select().from(shiftTemplates).where(
      and(eq(shiftTemplates.id, id), eq(shiftTemplates.userId, user.id))
    ).get();
    if (!existing) return c.json({ error: "not found" } satisfies ErrorResponse, 404);

    db.update(shiftTemplates).set(body).where(
      and(eq(shiftTemplates.id, id), eq(shiftTemplates.userId, user.id))
    ).run();

    const affectedShifts = db.select().from(shifts).where(
      and(eq(shifts.userId, user.id), eq(shifts.templateId, id))
    ).all();

    for (const shift of affectedShifts) {
      const date = shift.startDateTime.slice(0, 10);
      db.update(shifts).set({
        title: body.title,
        color: body.color,
        startDateTime: `${date}T${body.startTime}`,
        endDateTime: endDateTimeFor(date, body.endTime, body.startTime),
        updatedAt: new Date().toISOString(),
      }).where(eq(shifts.id, shift.id)).run();
    }

    invalidateIcalCache(user.id);
    return c.json({ ...existing, ...body } satisfies ShiftTemplate);
  })
  .delete("/:id", (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const existing = db.select().from(shiftTemplates).where(
      and(eq(shiftTemplates.id, id), eq(shiftTemplates.userId, user.id))
    ).get();
    if (!existing) return c.json({ error: "not found" } satisfies ErrorResponse, 404);

    db.delete(shifts).where(and(eq(shifts.userId, user.id), eq(shifts.templateId, id))).run();
    db.delete(shiftTemplates).where(
      and(eq(shiftTemplates.id, id), eq(shiftTemplates.userId, user.id))
    ).run();
    invalidateIcalCache(user.id);
    return c.body(null, 204);
  });

export type TemplatesAppType = typeof app;
export default app;
