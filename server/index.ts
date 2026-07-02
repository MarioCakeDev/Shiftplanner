import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./lib/config";
import { db, runMigrations } from "./db";
import { authRoutes, oidcMiddleware } from "./routes/auth";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import templatesRoutes from "./routes/templates";
import shiftsRoutes from "./routes/shifts";
import icalRoutes from "./routes/ical";
import userRoutes from "./routes/user";
import { getAuth } from "@hono/oidc-auth";

import { writeFileSync, mkdirSync } from "fs";
import { join, extname } from "path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

mkdirSync(join(import.meta.dir, "../data"), { recursive: true });

runMigrations();

if (!config.authEnabled) {
  const existing = db.select().from(users).where(eq(users.id, "dev-user")).get();
  if (!existing) {
    db.insert(users).values({ id: "dev-user", name: "Dev User", email: "dev@localhost", icalToken: randomUUID() }).run();
    console.log("Created dev user");
  }
}

const api = new Hono();
api.use("*", cors());
api.route("/api/auth", authRoutes);
api.use("*", oidcMiddleware);

api.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth")) return next();
  if (!config.authEnabled) {
    c.set("user", { id: "dev-user", name: "Dev User", email: "dev@localhost" });
    return next();
  }

  const auth = await getAuth(c);
  if (!auth?.sub) return c.redirect("/api/auth/login");

  let user = db.select().from(users).where(eq(users.id, auth.sub)).get();
  if (!user) {
    db.insert(users).values({
      id: auth.sub,
      name: (auth.name as string) || auth.email || "Unknown",
      email: (auth.email as string) || "",
      icalToken: randomUUID(),
    }).run();
    user = db.select().from(users).where(eq(users.id, auth.sub)).get();
  }
  if (!user) return c.redirect("/api/auth/login");
  c.set("user", { id: user.id, name: user.name, email: user.email });
  await next();
});

api.onError((err, c) => {
  const msg = `[${new Date().toISOString()}] ${err.message}\n${err.stack}\n`;
  writeFileSync(join(import.meta.dir, "../data/error.log"), msg, { flag: "a" });
  console.error(msg);
  return c.json({ error: "Internal Server Error" }, 500);
});

api.route("/api/templates", templatesRoutes);
api.route("/api/shifts", shiftsRoutes);
api.route("/api/user", userRoutes);

const app = new Hono();
app.route("/", api);
app.route("/api/ical", icalRoutes);

// Serve static client build
app.get("*", async (c) => {
  const filePath = c.req.path === "/" ? "/index.html" : c.req.path;
  const diskPath = `./client/dist${filePath}`;
  const file = Bun.file(diskPath);
  if (await file.exists()) {
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    return new Response(file, { headers: { "Content-Type": contentType } });
  }
  const fallback = Bun.file("./client/dist/index.html");
  if (await fallback.exists()) {
    return new Response(fallback, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return c.json({ error: "not found" }, 404);
});

serve({ fetch: app.fetch, port: config.port });
console.log(`Server running on http://localhost:${config.port}`);

export type AppType = typeof app;
