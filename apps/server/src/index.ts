import { serve } from "bun";
import { app } from "./app";
import { engine } from "../routes/socketio";
import { logger } from "../lib/logger";

const { websocket } = engine.handler();

const server = serve({
  port: Bun.env.PORT,
  hostname: "0.0.0.0",
  fetch(req, serverInstance) {
    const url = new URL(req.url);

    if (url.pathname === "/socket.io/") {
      return engine.handleRequest(req, serverInstance);
    }

    return app.fetch(req, serverInstance);
  },
  websocket,
});

logger.info(`🦊 uber backend Hono is running at ${server.hostname}:${server.port}`);
logger.info(
  `🔌 SocketIO server is ready at ${server.hostname}:${server.port}/socket.io`,
);
