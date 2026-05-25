import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { signJwt } from "../lib/jwt";
import { sendEmail } from "../lib/resend";
import { RoleSchema } from "../lib/types";
import { logger } from "../lib/logger";
import type { AppBindings } from "../src/types";

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  vehicle: z.string().optional(),
  capacity: z.number().optional(),
  password: z.string().min(1),
  confirmPassword: z.string().min(1),
  role: RoleSchema,
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: RoleSchema,
});

const ForgotSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
});

const ResetSchema = z.object({
  password: z.string().min(1),
  role: RoleSchema,
});

export const auth = new Hono<AppBindings>().basePath("/auth");

auth.post("/signup", async (c) => {
  const body = SignupSchema.parse(await c.req.json());
  const { name, email, password, confirmPassword, role, vehicle, capacity } =
    body;

  if (password !== confirmPassword) {
    return c.json({ message: "Passwords do not match" }, 400);
  }

  let existingUser;
  if (role === "user") {
    existingUser = await prisma.user.findUnique({ where: { email } });
  } else {
    existingUser = await prisma.captain.findUnique({ where: { email } });
  }

  if (existingUser) {
    return c.json({ message: "Email already in use" }, 409);
  }

  if (role === "user") {
    await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
      },
    });
  } else {
    if (!capacity || !vehicle) {
      return c.json({ message: "Vehicle and capacity are required" }, 400);
    }
    await prisma.captain.create({
      data: {
        name,
        vehicle,
        capacity,
        email,
        password: await bcrypt.hash(password, 10),
      },
    });
  }

  logger.info(`User created: ${name} (${email})`);
  return c.json({ message: "User created!" });
});

auth.post("/signin", async (c) => {
  const body = SigninSchema.parse(await c.req.json());
  const { email, password, role } = body;
  const table = role === "user" ? prisma.user : prisma.captain;

  const user = await table.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = await signJwt({ user: user.id, role });
    setCookie(c, "auth", token, {
      sameSite: "Lax",
      secure: true,
      path: "/",
    });
    logger.info(`User logged in: ${email}`);
    return c.json({ token, message: "Login successful!" }, 200);
  }

  return c.json({ message: "Login unsuccessful!" }, 401);
});

auth.get("/signout", (c) => {
  const token = getCookie(c, "auth");
  if (token) {
    deleteCookie(c, "auth", { path: "/" });
  }
  return c.json({ success: true });
});

auth.post("/forgot", async (c) => {
  const body = ForgotSchema.parse(await c.req.json());
  const { email, role } = body;
  const table = role === "user" ? prisma.user : prisma.captain;

  const user = await table.findUnique({ where: { email } });
  if (!user) {
    return c.json({ message: "User not found" }, 404);
  }

  const token = jwt.sign({ email, time: Date.now() }, Bun.env.JWT_SECRET!);
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `<htmL><body><h1>Reset your password</h1><p>Click the link below to reset your password:</p><a href="http://localhost:3000/auth/reset?token=${token}">Reset password</a><p>The link is active for 5 mins only.</p></htmL></body>`,
  });

  logger.info(`Password reset email sent: ${email}`);
  return c.json({ message: "Password reset email sent!" });
});

auth.post("/reset", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ message: "Invalid token" }, 400);
  }

  const body = ResetSchema.parse(await c.req.json());
  const { password, role } = body;

  const payload: any = jwt.verify(token, Bun.env.JWT_SECRET!);
  if (!payload) return c.json({ message: "Invalid token" }, 400);
  if (payload.time < Date.now() - 5 * 60 * 1000) {
    return c.json({ message: "Token expired" }, 400);
  }

  try {
    const table = role === "user" ? prisma.user : prisma.captain;
    await table.update({
      where: { email: payload.email },
      data: { password: await bcrypt.hash(password, 10) },
    });
  } catch {
    return c.json({ message: "Unknown Error" }, 400);
  }

  logger.info(`Password reset for ${payload.email}`);
  return c.json({ message: "Password updated!" }, 200);
});
