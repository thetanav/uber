import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { haversine } from "../lib/math";
import { getCaptainLocation } from "../lib/redis";
import { broadcastNewTrip, broadcastToTrip } from "../routes/socketio";
import { authUser } from "../middleware/auth";
import type { AppBindings } from "../src/types";

const RequestSchema = z.object({
  origin: z.object({
    name: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    name: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
  }),
  capacity: z.number(),
});

const CancelSchema = z.object({
  id: z.string().min(1),
});

export const user = new Hono<AppBindings>().basePath("/user");

user.use("/*", authUser);

user.get("/verify", (c) => {
  return c.json({ ok: true });
});

user.get("/", async (c) => {
  const payload = c.get("auth");
  const user = await prisma.user.findUnique({ where: { id: payload.user } });
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  return c.json({
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  });
});

user.post("/request", async (c) => {
  const payload = c.get("auth");
  const body = RequestSchema.parse(await c.req.json());
  const { origin, destination, capacity } = body;
  const rider = await prisma.user.findUnique({ where: { id: payload.user } });
  if (!rider) return c.json({ message: "Unauthorized" }, 401);

  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const dist = haversine(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  );

  const price = dist * capacity * 0.4;

  const trip = await prisma.trip.create({
    data: {
      user: { connect: { id: rider.id } },
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

  broadcastNewTrip(trip);

  return c.json({ id: trip.id }, 200);
});

user.post("/cancel", async (c) => {
  const payload = c.get("auth");
  const body = CancelSchema.parse(await c.req.json());
  const { id } = body;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return c.json({ message: "Trip not found!" });

  if (payload.role === "user" && trip.userId === payload.user) {
    if (trip.status === "ACCEPTED") {
      return c.json({ message: "Ride has already started!" });
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
    return c.json({ message: "Unauthorized" }, 401);
  }

  return c.json({ message: "Trip cancelled successfully!" });
});

user.get("/trip/:id", async (c) => {
  const payload = c.get("auth");
  if (payload.role !== "user") return c.json({ message: "Unauthorized" }, 401);

  const trip = await prisma.trip.findUnique({
    where: { id: c.req.param("id") },
    include: { captain: true },
  });

  if (!trip) return c.json({ message: "Trip not found" }, 404);
  if (trip.userId !== payload.user) {
    return c.json({ message: "Unauthorized to view this trip" }, 403);
  }

  let captainLocation = null;
  if (trip.captainId) {
    const location = await getCaptainLocation(trip.captainId);
    if (location) {
      captainLocation = { lat: location.lat, lng: location.long };
    }
  }

  return c.json({
    ...trip,
    captain: trip.captain
      ? {
          ...trip.captain,
          location: captainLocation,
        }
      : null,
  });
});

user.get("/history", async (c) => {
  const payload = c.get("auth");
  const trips = await prisma.trip.findMany({
    where: { userId: payload.user },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ trips });
});

user.get("/ongoing", async (c) => {
  const payload = c.get("auth");
  const trips = await prisma.trip.findMany({
    where: { userId: payload.user, status: "ON_TRIP" },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ trips });
});
