import Fastify from "fastify";

import { authPlugin } from "./plugins/auth.js";
import { realtimeRoutes } from "./realtime/ws.js";
import { authRoutes } from "./routes/auth.js";
import { boardRoutes } from "./routes/boards.js";
import { cardRoutes } from "./routes/cards.js";

export function buildApp() {
  const app = Fastify();

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(authPlugin);
  app.register(authRoutes);
  app.register(boardRoutes);
  app.register(cardRoutes);
  app.register(realtimeRoutes);

  return app;
}
