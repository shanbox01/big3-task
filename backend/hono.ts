import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router.js";
import { createContext } from "./trpc/create-context.js";

const app = new Hono();

app.use("*", cors());

app.use("*", async (c, next) => {
  const pathHeader = c.req.header("x-path");
  if (c.req.path === "/" && pathHeader?.startsWith("/api/trpc")) {
    const url = new URL(c.req.url);
    const newUrl = url.origin + pathHeader + (url.search || "");
    const newReq = new Request(newUrl, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });
    return app.request(newReq);
  }
  return next();
});

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;