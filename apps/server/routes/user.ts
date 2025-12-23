import { Elysia, t, status } from "elysia";
import { prisma } from "../lib/prisma";
import { Decimal } from "decimal.js";
import { firstCaptain } from "../lib/background";
import { notifyCaptainTripStatus } from "./ws";
import { jwtPlugin } from "../lib/jwt";

export const user = new Elysia({ prefix: "/user" })
  .use(jwtPlugin)
  .derive(async ({ jwt, cookie, headers, set }) => {
    const token = cookie.auth?.value;
    console.log("token", token);
    if (!token) {
      set.status = 401;
      throw new Error("Unauthorized");
    }

    try {
      const payload = await jwt.verify(token as string);
      console.log("payload", payload);
      if (!payload || payload.role !== "user") throw new Error("Invalid token");
      return { payload };
    } catch {
      set.status = 401;
      throw new Error("Invalid token");
    }
  })
  .get("/verify", async ({ payload }) => {
    return "ok";
  })
  .get("/", async ({ payload }) => {
    const user = await prisma.user.findUnique({
      where: { id: payload.user },
    });
    if (!user) return status(401, "Unauthorized");
    return { name: user.name, email: user.email, createdAt: user.createdAt };
  })
  .post("/logout", ({ cookie }) => {
    cookie.auth.remove();
    return { success: true };
  })
  .post(
    "/request",
    async ({ body, payload }) => {
      const { origin, destination, capacity } = body;
      const user = await prisma.user.findUnique({
        where: { id: payload.user },
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

      await firstCaptain(
        trip.userId,
        trip.id,
        origin.latitude,
        origin.longitude
      );

      return status(200, {
        id: trip.id,
      });
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
    }
  )
  .post(
    "/cancel",
    async ({ body, payload }) => {
      const { id } = body;

      const trip = await prisma.trip.findUnique({
        where: { id },
      });
      if (!trip) return { message: "Trip not found!" };

      if (payload.role === "user" && trip.userId === payload.user) {
        if (trip.status === "ACCEPTED") {
          return { message: "Ride has already started!" };
        }
        await prisma.trip.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
        // Notify captain if assigned
        if (trip.captainId) {
          notifyCaptainTripStatus(trip.captainId, trip.id, "CANCELLED");
        }
      } else {
        return status(401, "Unauthorized");
      }

      return { message: "Trip cancelled successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    }
  )
  .get("/trip/:id", async ({ params, payload }) => {
    if (payload.role !== "user") return status(401, "Unauthorized");

    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: { captain: true },
    });

    if (!trip) return status(404, { message: "Trip not found" });

    if (trip.userId !== payload.user) {
      return status(403, { message: "Unauthorized to view this trip" });
    }

    return trip;
  })
  .get("/history", async ({ payload }) => {
    if (payload.role !== "user") return status(401, "Unauthorized");

    const trips = await prisma.trip.findMany({
      where: { userId: payload.user },
      include: { captain: true },
      orderBy: { createdAt: "desc" },
    });

    return { trips };
  });
