import { Elysia, t, status } from "elysia";
import { prisma } from "../lib/prisma";
import { Decimal } from "decimal.js";
import { firstCaptain } from "../lib/background";
import { jwtPlugin } from "../lib/jwt";
import { haversine } from "../lib/math";
import { getCaptainLocation } from "../lib/redis";
import { broadcastToTrip, broadcastNewTrip } from "../routes/ws";

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

      const dist = haversine(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
      );

      // const surgeCharge = max(1, active_requests/active_drivers)

      const price = dist * capacity * 0.4;

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
          pricing: price,
          status: "REQUESTED",
          otp,
        },
      });

      // await firstCaptain(
      //   trip.userId,
      //   trip.id,
      //   origin.latitude,
      //   origin.longitude
      // );

      broadcastNewTrip(trip);

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
    },
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
        broadcastToTrip(id, {
          type: "trip_update",
          tripId: id,
          status: "CANCELLED",
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

    // Fetch captain's live location from Redis if captain is assigned
    let captainLocation = null;
    if (trip.captainId) {
      const location = await getCaptainLocation(trip.captainId);
      if (location) {
        captainLocation = { lat: location.lat, lng: location.long };
      }
    }

    // Return trip with captain location
    return {
      ...trip,
      captain: trip.captain
        ? {
            ...trip.captain,
            location: captainLocation,
          }
        : null,
    };
  })
  .get("/history", async ({ payload }) => {
    const trips = await prisma.trip.findMany({
      where: { userId: payload.user },
      orderBy: { createdAt: "desc" },
    });

    return { trips };
  });
