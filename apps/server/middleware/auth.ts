import type { Context, Next } from "hono";
import { verifyJwt } from "../lib/jwt";

export async function authUser(c: Context, next: Next) {
  const token = c.req.header("authorization")?.split(" ")[1];
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const payload = await verifyJwt(token);
    console.log(payload);
    if (payload.role !== "user") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    c.set("auth", payload);
    await next();
  } catch {
    return c.json({ message: "Invalid token" }, 401);
  }
}

export async function authCaptain(c: Context, next: Next) {
  const token = c.req.header("authorization");
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const payload = await verifyJwt(token);
    if (payload.role !== "captain") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    c.set("auth", payload);
    await next();
  } catch {
    return c.json({ message: "Invalid token" }, 401);
  }
}
