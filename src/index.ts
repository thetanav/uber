import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import { jwt } from "@elysiajs/jwt";
import bcrypt from "bcrypt";
import { Decimal } from "decimal.js";

const jwtInstance = jwt({
  name: "jwt",
  secret: "uber",
  exp: "7d",
});

const app = new Elysia<any>()
  .use(jwtInstance)
  .ws("/realtime", {
    body: t.Object({
      type: t.String(),
      payload: t.Any(),
    }),
    async open(ws, { request, jwt }) {
      const token = request.headers.get("authorization")?.split(" ")[1];
      if (!token) {
        ws.close(4001, "No token");
        return;
      }
      const payload = await jwt.verify(token);
      if (!payload) {
        ws.close(4002, "Invalid token");
        return;
      }
      (ws as any).info = payload; // save it to redis
      console.log("🔗 WS opened for user", payload);
    },
    message(ws, msg) {
      const { type, payload } = msg;
      switch (type) {
        case "listen:user":
          // user will send message listen <trip id>
          // we have to send it the updates on the trips status with captain location
          break;
        case "send:captain":
          // captain send lat and long through the ws
          // we have to send it the updates on the trips status
          break;
        default:
          break;
      }
    },
    // clean up when client disconnects
    close(ws) {
      console.log("❌ client left");
    },
  })
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
      ),
  )
  .group("/trip", (app) =>
    app
      .post(
        "/request",
        async ({ jwt, body, headers: { authorization } }) => {
          const { origin, destination, capacity } = body;
          const payload = await jwt.verify(authorization);

          if (!payload) return status(401, "Unauthorized");

          const user = await prisma.user.findUnique({
            where: { id: payload.user as string },
          });
          if (!user) return status(401, "Unauthorized");
          const otp = Math.floor(1000 + Math.random() * 9000).toString();
          const trip = await prisma.trip.create({
            data: {
              user: { connect: { id: user.id } },
              origin: origin.name,
              originLat: origin.latitude,
              originLng: origin.longitude,
              destination: destination.name,
              destLat: destination.latitude,
              destLng: destination.longitude,
              capacity,
              pricing: new Decimal(0),
              status: "REQUESTED",
              otp,
            },
          });
          return { message: "Trip created successfully!", id: trip.id, otp };
        },
        {
          body: t.Object({
            origin: t.Object({
              name: t.String(),
              latitude: t.Number(),
              longitude: t.Number(),
            }),
            destination: t.Object({
              name: t.String(),
              latitude: t.Number(),
              longitude: t.Number(),
            }),
            capacity: t.Number(),
          }),
        },
      )
      .post(
        "/cancel",
        async ({ jwt, body, headers: { authorization } }) => {
          const { id } = body;
          const payload = await jwt.verify(authorization);

          if (!payload) return status(401, "Unauthorized");

          const trip = await prisma.trip.findUnique({
            where: { id },
          });
          if (!trip) return { message: "Trip not found!" };

          if (
            payload.role === "captain" &&
            trip.captainId === (payload.user as string)
          ) {
            await prisma.trip.update({
              where: { id },
              data: { status: "CANCELLED" },
            });
          } else if (
            payload.role === "user" &&
            trip.userId === (payload.user as string)
          ) {
            if (trip.status === "ACCEPTED") {
              return { message: "Ride has already started!" };
            }
            await prisma.trip.update({
              where: { id },
              data: { status: "CANCELLED" },
            });
          } else {
            return status(401, "Unauthorized");
          }

          return { message: "Trip cancelled successfully!" };
        },
        {
          body: t.Object({
            id: t.String(),
          }),
        },
      )
      .post(
        "/pickup",
        async ({ jwt, body, headers: { authorization } }) => {
          // check the trip id and otp of the trip and also the trip has not started also the trip captain is the
          const { id, otp } = body;
          const payload = await jwt.verify(authorization);

          if (!payload) return status(401, "Unauthorized");

          const captain = await prisma.captain.findUnique({
            where: { id: payload.user as string },
          });
          if (!captain) return status(401, "Unauthorized");

          const trip = await prisma.trip.findUnique({
            where: { id },
          });
          if (
            !trip ||
            trip.captainId !== captain.id ||
            trip.status !== "ACCEPTED" ||
            trip.otp !== otp
          ) {
            return { message: "Invalid trip or OTP!" };
          }

          await prisma.trip.update({
            where: { id },
            data: { status: "ON_TRIP" },
          });

          return { message: "Trip picked up successfully!" };
        },
        {
          body: t.Object({
            id: t.String(),
            otp: t.String(),
          }),
        },
      )
      .post(
        "/complete",
        async ({ jwt, body, headers: { authorization } }) => {
          const { id } = body;
          const payload = await jwt.verify(authorization);

          if (!payload) return status(401, "Unauthorized");

          const captain = await prisma.captain.findUnique({
            where: { id: payload.user as string },
          });
          if (!captain) return status(401, "Unauthorized");

          const trip = await prisma.trip.findUnique({
            where: { id },
          });
          if (
            !trip ||
            trip.captainId !== captain.id ||
            trip.status !== "ON_TRIP"
          ) {
            return { message: "Invalid trip!" };
          }

          await prisma.trip.update({
            where: { id },
            data: { status: "COMPLETED" },
          });

          return { message: "Trip completed successfully!" };
        },
        {
          body: t.Object({
            id: t.String(),
          }),
        },
      )
      .post(
        "/match",
        async ({ jwt, body, headers: { authorization } }) => {
          const { id } = body;
          const payload = await jwt.verify(authorization);

          if (!payload) return status(401, "Unauthorized");

          const captain = await prisma.captain.findUnique({
            where: { id: payload.user as string },
          });
          if (!captain) return status(401, "Unauthorized");

          const trip = await prisma.trip.findUnique({
            where: { id },
          });
          if (!trip) return { message: "Trip not found!" };

          if (payload.role === "captain" && trip.status === "REQUESTED") {
            await prisma.trip.update({
              where: { id },
              data: {
                status: "ACCEPTED",
                captain: { connect: { id: captain.id } },
              },
            });
          } else {
            return status(401, "Unauthorized");
          }

          return { message: "Trip matched successfully!", tripid: trip.id };
        },
        {
          body: t.Object({
            id: t.String(),
          }),
        },
      ),
  );
export default app;

if (import.meta.main) {
  app.listen(3000);

  console.log(
    `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}
