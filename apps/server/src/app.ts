import cors from "@fastify/cors";
import Fastify from "fastify";

import { authPlugin } from "./plugins/auth.js";
import { realtimeRoutes } from "./realtime/ws.js";
import { authRoutes } from "./routes/auth.js";
import { boardMemberRoutes } from "./routes/boardMembers.js";
import { boardRoutes } from "./routes/boards.js";
import { cardRoutes } from "./routes/cards.js";

export function buildApp() {
  const app = Fastify();

  app.register(cors, {
    origin: [process.env["CORS_ORIGIN"] ?? "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(authPlugin);
  app.register(authRoutes);
  app.register(boardRoutes);
  app.register(boardMemberRoutes);
  app.register(cardRoutes);
  app.register(realtimeRoutes);

  return app;
}
