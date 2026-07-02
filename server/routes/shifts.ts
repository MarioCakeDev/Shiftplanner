import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../db";
import { shifts, shiftTemplates } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { Shift, BatchRequest, BatchResponse, UpdateShiftInput, ErrorResponse } from "../../shared/types";
import type { AuthUser } from "./auth";
import { invalidateIcalCache } from "../lib/ical";

const batchSchema = z.object({
  mode: z.enum(["SET", "REMOVE"]),
  templateId: z.string(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  templateId: z.string().optional(),
});

const app = new Hono<{ Variables: { user: AuthUser } }>()
  .post("/batch", zValidator("json", batchSchema), (c) => {
    const user = c.get("user");
    const { mode, templateId, dates } = c.req.valid("json") as BatchRequest;

    const template = db.select().from(shiftTemplates).where(
      and(eq(shiftTemplates.id, templateId), eq(shiftTemplates.userId, user.id))
    ).get();

    if (!template) return c.json({ error: "template not found" } satisfies ErrorResponse, 404);

    if (mode === "REMOVE") {
      let deleted = 0;
      for (const date of dates) {
        const existing = db.select().from(shifts).where(
          and(
            eq(shifts.userId, user.id),
            eq(shifts.templateId, templateId),
            gte(shifts.startDateTime, `${date}T00:00`),
            lte(shifts.startDateTime, `${date}T23:59`)
          )
        ).get();
        if (existing) {
          db.delete(shifts).where(eq(shifts.id, existing.id)).run();
          deleted++;
        }
      }
      invalidateIcalCache(user.id);
      return c.json({ deleted, created: 0, replaced: 0 } satisfies BatchResponse);
    }

    let created = 0;
    let replaced = 0;

    for (const date of dates) {
      const startDateTime = `${date}T${template.startTime}`;
      const [startHour, startMin] = template.startTime.split(":").map(Number);
      const [endHour, endMin] = template.endTime.split(":").map(Number);
      const startMinTotal = startHour * 60 + startMin;
      const endMinTotal = endHour * 60 + endMin;

      let endDate = date;
      if (endMinTotal <= startMinTotal) {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        endDate = d.toISOString().slice(0, 10);
      }
      const endDateTime = `${endDate}T${template.endTime}`;

      const existing = db.select().from(shifts).where(
        and(
          eq(shifts.userId, user.id),
          gte(shifts.startDateTime, `${date}T00:00`),
          lte(shifts.startDateTime, `${date}T23:59`)
        )
      ).get();

      if (existing) {
        db.update(shifts).set({
          templateId: template.id, title: template.title, color: template.color,
          startDateTime, endDateTime,
          updatedAt: new Date().toISOString(),
        }).where(eq(shifts.id, existing.id)).run();
        replaced++;
      } else {
        db.insert(shifts).values({
          id: randomUUID(), userId: user.id, templateId: template.id,
          startDateTime, endDateTime, title: template.title, color: template.color,
        }).run();
        created++;
      }
    }

    invalidateIcalCache(user.id);
    return c.json({ created, deleted: 0, replaced } satisfies BatchResponse);
  })
  .get("/", (c) => {
    const user = c.get("user");
    const month = c.req.query("month");
    const conditions = [eq(shifts.userId, user.id)];

    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const endDate = new Date(year, mon, 0).getDate();
      conditions.push(
        gte(shifts.startDateTime, `${month}-01`),
        lte(shifts.startDateTime, `${month}-${String(endDate).padStart(2, "0")}T23:59:59`)
      );
    }

    return c.json(db.select().from(shifts).where(and(...conditions)).all() satisfies Shift[]);
  })
  .delete("/:id", (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const result = db.delete(shifts).where(and(eq(shifts.id, id), eq(shifts.userId, user.id))).run();
    if (result.changes === 0) return c.json({ error: "not found" } satisfies ErrorResponse, 404);
    invalidateIcalCache(user.id);
    return c.body(null, 204);
  })
  .put("/:id", zValidator("json", updateSchema), (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json") as UpdateShiftInput;
    const updateData: Record<string, string> = {};
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) updateData[key] = val;
    }
    if (Object.keys(updateData).length === 0) return c.json({ error: "no fields to update" } satisfies ErrorResponse, 400);
    updateData.updatedAt = new Date().toISOString();
    const result = db.update(shifts).set(updateData).where(
      and(eq(shifts.id, id), eq(shifts.userId, user.id))
    ).run();
    if (result.changes === 0) return c.json({ error: "not found" } satisfies ErrorResponse, 404);
    invalidateIcalCache(user.id);
    return c.json({ id, ...updateData } as unknown as Shift);
  });

export type ShiftsAppType = typeof app;
export default app;
