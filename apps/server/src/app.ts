import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { captain } from "../routes/captain";
import { haversine } from "../lib/math";
import { logger } from "../lib/logger";
import type { AppBindings } from "./types";

export const app = new Hono<AppBindings>();

// app.use("*", honoLogger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: ["http://uber.localhost", "http://captain.uber.localhost"],
    credentials: true,
  }),
);

app.notFound((c) => c.text("Path not found :(", 404));
app.onError((err, c) => {
  logger.error({ err }, "Unhandled error");
  return c.json({ message: "Internal Server Error" }, 500);
});

app.get("/", (c) => c.text("Welcome to Uber Backend!"));

app.post("/price", async (c) => {
  const body = await c.req.json();
  const { origin, destination, capacity } = body as {
    origin: { name: string; latitude: number; longitude: number };
    destination: { name: string; latitude: number; longitude: number };
    capacity: number;
  };
  const dist = haversine(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  );

  return c.json({ price: dist * capacity * 0.4 });
});

app.route("/", auth);
app.route("/", user);
app.route("/", captain);
