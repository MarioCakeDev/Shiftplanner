import { db } from "../db";
import { shifts, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { parseISO } from "date-fns";
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

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return (asUtc - date.getTime()) / 60000;
}

function formatIcalDate(iso: string): string {
  const padded = iso.length === 16 ? `${iso}:00` : iso;
  const parsed = parseISO(padded);
  const offset = getTimeZoneOffset(parsed, TIMEZONE);
  const utc = new Date(parsed.getTime() - offset * 60_000);
  return utc.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcal(userId: string): string {
  const cachePath = join(cacheDir, `${userId}.ics`);

  if (existsSync(cachePath)) {
    return readFileSync(cachePath, "utf-8");
  }

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error("User not found");

  const userShifts = db.select().from(shifts).where(eq(shifts.userId, userId)).all();

  const now = formatIcalDate(new Date().toISOString().split(".")[0] + "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Schichtplan//schichtplan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Schichtplan ${escapeIcalText(user.name)}`,
  ];

  for (const shift of userShifts) {
    const start = formatIcalDate(shift.startDateTime);
    const end = formatIcalDate(shift.endDateTime);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${shift.id}@schichtplan`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcalText(shift.title)}`,
      `DESCRIPTION:${escapeIcalText(shift.title)}`,
      `DTSTAMP:${now}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const icsContent = lines.join("\r\n") + "\r\n";

  writeFileSync(cachePath, icsContent, "utf-8");
  return icsContent;
}
