import { Elysia, t, status } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { Decimal } from "decimal.js";
import { getTripForUser } from "../lib/redis";
import { userMap } from "../src";
import { poolForCaptains } from "../lib/background";
import { notifyCaptainTripStatus } from "./ws";

export const user = new Elysia({ prefix: "/user" })
  .use(jwtPlugin)
  .post(
    "/request",
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
      await poolForCaptains(trip.id, origin.latitude, origin.longitude);
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

      if (payload.role === "user" && trip.userId === (payload.user as string)) {
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
    },
  )
  .get("/history", async ({ jwt, headers: { authorization } }) => {
    if (!authorization) return status(401, "Unauthorized");
    let payload: any;
    try {
      payload = await jwt.verify(authorization);
    } catch {
      return status(401, "Unauthorized");
    }

    if (payload.role !== "user") return status(401, "Unauthorized");

    const trips = await prisma.trip.findMany({
      where: { userId: payload.user as string },
      include: { captain: true },
      orderBy: { createdAt: "desc" },
    });

    return { trips };
  });
