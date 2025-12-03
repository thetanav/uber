import { Elysia } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { captain } from "../routes/captain";
import { trip } from "../routes/trip";
import { websocketService } from "../services/websocket";

const app = new Elysia()
  .use(jwtPlugin)
  .use(auth)
  .use(user)
  .use(captain)
  .use(trip);

// WebSocket endpoint for real-time communication
app.ws("/realtime", {
  async open(ws) {
    const url = new URL((ws.raw as any).url);
    await websocketService.handleOpen(ws, url);
  },
  async message(ws: any, msg: { type: string; payload: any }) {
    await websocketService.handleMessage(ws, msg);
  },
  async close(ws) {
    await websocketService.handleClose(ws);
  },
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  app.listen(process.env.PORT || 3000);

  console.log(
    `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}

export type App = typeof app;
export default app;

