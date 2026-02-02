import { createTRPCRouter } from "./create-context";
import { aiRouter } from "./routes/ai";
import { exampleRouter } from "./routes/example";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
