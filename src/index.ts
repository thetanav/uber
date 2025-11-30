import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

const app = new Elysia()
  .group("/auth", (app) =>
    app
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
            },
          });
          return { message: "Signup successful!", token: "1234567890" };
        },
        {
          body: t.Object({
            name: t.String(),
            vehicle: t.String(),
            capacity: t.Number(),
            email: t.String(),
            password: t.String(),
            confirmPassword: t.String(),
          }),
        },
      )
      .post(
        "/user-signup",
        ({ body }) => {
          console.log(body);
          return { message: "Signup successful!", token: "1234567890" };
        },
        {
          body: t.Object({
            name: t.String(),
            email: t.String(),
            password: t.String(),
            confirmPassword: t.String(),
          }),
        },
      )
      .post(
        "/login",
        ({ body }) => {
          console.log(body);
          return { message: "Login successful!", token: "0987654321" };
        },
        {
          body: t.Object({
            email: t.String(),
            password: t.String(),
          }),
        },
      ),
  )
  .group("/trip", (app) =>
    app
      .post(
        "/request",
        ({ body }) => {
          console.log(body);
          return { message: "Trip created successfully!", id: "1234567890" };
        },
        {
          body: t.Object({
            captainId: t.String(),
            origin: t.String(),
            destination: t.String(),
            capacity: t.Number(),
          }),
        },
      )
      .post(
        "/cancel",
        ({ body }) => {
          console.log(body);
          return { message: "Trip cancelled successfully!" };
        },
        {
          body: t.Object({
            id: t.String(),
            captainId: t.String(),
          }),
        },
      )
      .post(
        "/match",
        ({ body }) => {
          // captain accept the ride
          console.log(body);
          return { message: "Trip matched successfully!" };
        },
        {
          body: t.Object({
            id: t.String(),
            captainId: t.String(),
          }),
        },
      ),
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
