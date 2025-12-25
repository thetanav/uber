import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { jwtPlugin } from "../lib/jwt";
import { sendEmail } from "../lib/resend";
import jwt from "jsonwebtoken";

export const auth = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post(
    "/captain/signup",
    async ({ body }) => {
      const { name, vehicle, capacity, email, password, confirmPassword } =
        body;
      // Validate password and confirmPassword
      if (password !== confirmPassword) {
        return status(400, { message: "Passwords do not match" });
      }
      // Check if email is already in use
      const existingCaptain = await prisma.captain.findUnique({
        where: { email },
      });
      if (existingCaptain) {
        return status(409, { message: "Email already in use" });
      }
      // Create captain
      await prisma.captain.create({
        data: {
          name,
          vehicle,
          capacity,
          email,
          password: await bcrypt.hash(password, 10),
        },
      });
      return { message: "Captain created!" };
    },
    {
      body: t.Object({
        name: t.String(),
        vehicle: t.String(),
        capacity: t.Number(),
        email: t.String({ format: "email" }),
        password: t.String(),
        confirmPassword: t.String(),
      }),
    },
  )
  .post(
    "/user/signup",
    async ({ body }) => {
      const { name, email, password, confirmPassword } = body;
      // Validate password and confirmPassword
      if (password !== confirmPassword) {
        return status(400, { message: "Passwords do not match" });
      }
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return status(409, { message: "Email already in use" });
      }
      // Create user
      await prisma.user.create({
        data: {
          name,
          email,
          password: await bcrypt.hash(password, 10),
        },
      });
      return { message: "User created!" };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String(),
        confirmPassword: t.String(),
      }),
    },
  )
  .post(
    "/user/login",
    async ({ jwt, body, cookie }) => {
      const { email, password } = body;
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = await jwt.sign({ user: user.id, role: "user" });
        console.log("token generated", token);
        cookie.auth?.set({
          value: token,
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/",
        });
        return status(200, { token, message: "Login successful!" });
      }
      return status(401, { message: "Login unsuccessful!" });
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .post(
    "/captain/login",
    async ({ jwt, body }) => {
      const { email, password } = body;
      const captain = await prisma.captain.findUnique({
        where: { email },
      });
      if (captain && (await bcrypt.compare(password, captain.password)))
        return jwt.sign({ user: captain.id, role: "captain" });
      return { message: "Login unsuccessful!" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .get("/logout", ({ cookie }) => {
    cookie.auth?.remove();
    return { success: true };
  })
  .post(
    "/forgot",
    async ({ body }) => {
      const { email } = body;
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user) {
        return status(404, { message: "User not found" });
      }
      const token = jwt.sign({ email, time: Date.now() }, Bun.env.JWT_SECRET!);
      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `<htmL><body><h1>Reset your password</h1><p>Click the link below to reset your password:</p><a href="http://localhost:3000/auth/reset?token=${token}">Reset password</a><p>The link is active for 5 mins only.</p></htmL></body>`,
      });
      return { message: "Password reset email sent!" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    },
  )
  .post(
    "/reset",
    async ({ query, body }) => {
      const { token } = query;
      const { password } = body;

      const payload: any = jwt.verify(token, Bun.env.JWT_SECRET!);
      console.log(payload);
      if (!payload) return status(400, { message: "Invalid token" });
      if (payload.time < Date.now() - 5 * 60 * 1000)
        return status(400, { message: "Token expired" });
      try {
        await prisma.user.update({
          where: { email: payload.email },
          data: { password: await bcrypt.hash(password, 10) },
        });
      } catch (err) {
        return status(400, { message: "Unkown Error" });
      }
      return status(200, { message: "Password updated!" });
    },
    {
      body: t.Object({
        password: t.String(),
      }),
    },
  );
