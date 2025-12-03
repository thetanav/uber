import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { jwtPlugin } from "../lib/jwt";

export const auth = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post(
    "/captain-signup",
    async ({ body }) => {
      const { name, vehicle, capacity, email, password, confirmPassword } =
        body;
      // Validate password and confirmPassword
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      // Check if email is already in use
      const existingCaptain = await prisma.captain.findUnique({
        where: { email },
      });
      if (existingCaptain) {
        throw new Error("Email already in use");
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
    "/user-signup",
    async ({ body }) => {
      const { name, email, password, confirmPassword } = body;
      // Validate password and confirmPassword
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new Error("Email already in use");
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
    "/login-user",
    async ({ jwt, body }) => {
      const { email, password } = body;
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (user && (await bcrypt.compare(password, user.password)))
        return jwt.sign({ user: user.id, role: "user" });
      return { message: "Login unsuccessful!" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .post(
    "/login-captain",
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
  );
