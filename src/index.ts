import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import { jwt } from "@elysiajs/jwt";
import bcrypt from "bcrypt";
import { Decimal } from "decimal.js";
import jwtLib from "jsonwebtoken";

const jwtPlugin = jwt({
  secret: process.env.JWT_SECRET || "uber",
  exp: "7d",
  schema: t.Object({
    user: t.String(),
    role: t.Union([t.Literal("user"), t.Literal("captain")]),
  }),
});

const app = new Elysia().use(jwtPlugin);

// TODO: use redis for all of this
const userMap = new Map<string, any>();
const captainMap = new Map<string, any>();
const captainLoc = new Map<string, { lat: number; long: number }>();
const tripUserMap = new Map<string, string>();

app.ws("/realtime", {
  async open(ws) {
    const url = new URL((ws.raw as any).url);
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "No token");
      return;
    }
    try {
      const payload = jwtLib.verify(
        token,
        process.env.JWT_SECRET || "uber",
      ) as any;
      (ws as any).info = payload;
      if (payload.role === "user") {
        userMap.set(payload.user, ws);
      } else if (payload.role === "captain") {
        captainMap.set(payload.user, ws);
      }
      console.log("🔗 WS opened for", payload.role, payload.user);
    } catch {
      ws.close(4002, "Invalid token");
    }
  },
  async message(ws: any, msg: { type: string; payload: any }) {
    const { type, payload } = msg;
    switch (type) {
      case "listen:user":
        // payload { tripId }
        // user will send message listen <trip id>
        // we have to send it the updates on the trips status with captain location
        const trip = await prisma.trip.findUnique({
          where: { id: payload.tripId },
        });
        if (!trip || trip.status != "ACCEPTED" || !trip.capacity) {
          ws.send(JSON.stringify({ type: "error", payload: "Trip not found" }));
          return;
        }
        const captainWs = captainMap.get(trip.captainId!);
        if (!captainWs) {
          ws.send(
            JSON.stringify({ type: "error", payload: "Captain not connected" }),
          );
          return;
        }
        userMap.set(payload.user, ws);
        break;
      case "send:captain":
        // payload { lat, long, tripId }
        if (
          ws.info.role !== "captain" ||
          !payload.lat ||
          !payload.long ||
          !payload.tripId
        ) {
          ws.send(JSON.stringify({ type: "error", payload: "" }));
          return;
        }
        // captain send lat and long through the ws
        // we have to send it the updates on the trips status
        captainLoc.set(payload.user, { lat: payload.lat, long: payload.long });
        const userId = tripUserMap.get(payload.tripId);
        if (userId == undefined) {
          const trip = await prisma.trip.findUnique({
            where: { id: payload.tripId },
            include: { captain: true },
          });
          if (!trip) {
            ws.send(
              JSON.stringify({ type: "error", payload: "Trip not found" }),
            );
            return;
          }
          tripUserMap.set(payload.tripId, trip.userId);
        }
        const userWs = userMap.get(userId!);
        if (userWs) {
          userWs.send(
            JSON.stringify({
              type: "update",
              payload: {
                status: "in_progress",
                location: { lat: payload.lat, long: payload.long },
              },
            }),
          );
          break;
        }
        ws.send(JSON.stringify({ type: "error", payload: "User not found" }));
        break;
      default:
        break;
    }
  },
  // clean up when client disconnects
  close(ws) {
    if ((ws as any).info) {
      const { user, role } = (ws as any).info;
      if (role === "user") {
        userMap.delete(user);
      } else if (role === "captain") {
        captainMap.delete(user);
      }
    }
    console.log("❌ client left");
  },
});

app.group("/auth", (app) =>
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
);

app.group("/trip", (app) =>
  app
    .post(
      "/user/request",
      async ({ jwt, body, headers: { authorization } }) => {
        const { origin, destination, capacity } = body;
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

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
      "/master/cancel",
      async ({ jwt, body, headers: { authorization } }) => {
        const { id } = body;
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

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

        const userId = tripUserMap.get(trip.id);
        const wss = userId ? userMap.get(userId) : undefined;
        if (wss) wss.send(JSON.stringify({ type: "CANCELLED" }));
        return { message: "Trip cancelled successfully!" };
      },
      {
        body: t.Object({
          id: t.String(),
        }),
      },
    )
    .post(
      "/captain/pickup",
      async ({ jwt, body, headers: { authorization } }) => {
        // check the trip id and otp of the trip and also the trip has not started also the trip captain is the
        const { id, otp } = body;
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

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

        const userId = tripUserMap.get(trip.id);
        const wss = userId ? userMap.get(userId) : undefined;
        if (wss) wss.send(JSON.stringify({ type: "ON_TRIP" }));
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
      "/captain/complete",
      async ({ jwt, body, headers: { authorization } }) => {
        const { id } = body;
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

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

        const userId = tripUserMap.get(trip.id);
        const wss = userId ? userMap.get(userId) : undefined;
        if (wss) wss.send(JSON.stringify({ type: "COMPLETED" }));
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
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

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
export type App = typeof app;
export default app;

if (import.meta.main) {
  app.listen(process.env.PORT || 3001);

  console.log(
    `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}
