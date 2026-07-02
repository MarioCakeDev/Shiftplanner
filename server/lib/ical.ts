import { db } from "../db";
import { shifts, users } from "../db/schema";
import { eq } from "drizzle-orm";
import ical, { ICalCalendarMethod, ICalEventTransparency } from "ical-generator";
import { fromZonedTime } from "date-fns-tz";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const cacheDir = join(import.meta.dir, "../../data/ical-cache");
mkdirSync(cacheDir, { recursive: true });

const TIMEZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

export function invalidateIcalCache(userId: string) {
  const filePath = join(cacheDir, `${userId}.ics`);
  if (existsSync(filePath)) {
    try { Bun.file(filePath).delete(); } catch {}
  }
}

function formatIcalDate(iso: string): Date {
  const padded = iso.length === 16 ? `${iso}:00` : iso;
  return fromZonedTime(padded.replace(/Z$/i, ""), TIMEZONE);
}

export function generateIcal(userId: string): string {
  const cachePath = join(cacheDir, `${userId}.ics`);

  if (existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error("User not found");

  const userShifts = db.select().from(shifts).where(eq(shifts.userId, userId)).all();

  const calendar = ical();
  calendar.name(`Schichtplan ${user.name}`);
  calendar.prodId({ company: "Schichtplan", product: "schichtplan", language: "EN" });
  calendar.method(ICalCalendarMethod.PUBLISH);

  for (const shift of userShifts) {
    const start = formatIcalDate(shift.startDateTime);
    const end = formatIcalDate(shift.endDateTime);
    calendar.createEvent({ start, end, summary: shift.title })
      .uid(shift.id)
      .summary(shift.title)
      .description(shift.title)
      .timestamp(new Date())
      .transparency(ICalEventTransparency.TRANSPARENT);
  }

  const icsContent = calendar.toString();

  writeFileSync(cachePath, icsContent, "utf-8");
  return icsContent;
}
