import { createTRPCRouter } from "./create-context.js";
import { aiRouter } from "./routes/ai.js";
import { exampleRouter } from "./routes/example.js";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
