import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { broadcastToTrip } from "../routes/socketio";
import { authCaptain } from "../middleware/auth";
import type { AppBindings } from "../src/types";

const CancelSchema = z.object({
  id: z.string().min(1),
});

const PickupSchema = z.object({
  id: z.string().min(1),
  otp: z.string().min(1),
});

const CompleteSchema = z.object({
  id: z.string().min(1),
});

export const captain = new Hono<AppBindings>().basePath("/captain");

captain.use("/*", authCaptain);

captain.post("/online", async (c) => {
  const payload = c.get("auth");
  await prisma.captain.update({
    where: { id: payload.user },
    data: { isOnline: true, isPooling: true },
  });
  return c.json({ message: "Captain is now online and pooling" });
});

captain.post("/offline", async (c) => {
  const payload = c.get("auth");
  await prisma.captain.update({
    where: { id: payload.user },
    data: { isOnline: false, isPooling: false, inDrive: false },
  });
  return c.json({ message: "Captain is now offline" });
});

captain.post("/cancel", async (c) => {
  const payload = c.get("auth");
  const body = CancelSchema.parse(await c.req.json());
  const { id } = body;

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return c.json({ message: "Trip not found!" });

  if (payload.role === "captain" && trip.captainId === payload.user) {
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

captain.post("/pickup", async (c) => {
  const payload = c.get("auth");
  const body = PickupSchema.parse(await c.req.json());
  const { id, otp } = body;

  const captainUser = await prisma.captain.findUnique({
    where: { id: payload.user },
  });
  if (!captainUser) return c.json({ message: "Unauthorized" }, 401);

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (
    !trip ||
    trip.captainId !== captainUser.id ||
    trip.status !== "ACCEPTED" ||
    trip.otp !== otp
  ) {
    return c.json({ message: "Invalid trip or OTP!" });
  }

  await prisma.trip.update({
    where: { id },
    data: { status: "ON_TRIP" },
  });
  broadcastToTrip(id, {
    type: "trip_update",
    tripId: id,
    status: "ON_TRIP",
  });

  return c.json({ message: "Trip picked up successfully!" });
});

captain.post("/complete", async (c) => {
  const payload = c.get("auth");
  const body = CompleteSchema.parse(await c.req.json());
  const { id } = body;

  const captainUser = await prisma.captain.findUnique({
    where: { id: payload.user },
  });
  if (!captainUser) return c.json({ message: "Unauthorized" }, 401);

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.captainId !== captainUser.id || trip.status !== "ON_TRIP") {
    return c.json({ message: "Invalid trip!" });
  }

  await prisma.trip.update({
    where: { id },
    data: { status: "COMPLETED" },
  });
  broadcastToTrip(id, {
    type: "trip_update",
    tripId: id,
    status: "COMPLETED",
  });

  return c.json({ message: "Trip completed successfully!" });
});

captain.get("/history", async (c) => {
  const payload = c.get("auth");
  const trips = await prisma.trip.findMany({
    where: { captainId: payload.user },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ trips });
});

captain.post("/trips/:id/accept", async (c) => {
  const payload = c.get("auth");
  const captainUser = await prisma.captain.findUnique({
    where: { id: payload.user },
  });
  if (!captainUser) return c.json({ message: "Unauthorized" }, 401);

  if (!captainUser.isOnline || captainUser.inDrive) {
    return c.json({ message: "Captain is not available" });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: c.req.param("id") },
  });
  if (!trip || trip.status !== "REQUESTED" || trip.captainId) {
    return c.json({ message: "Trip is not available" });
  }

  await prisma.$transaction([
    prisma.trip.update({
      where: { id: c.req.param("id") },
      data: { captainId: captainUser.id, status: "ACCEPTED" },
    }),
    prisma.captain.update({
      where: { id: captainUser.id },
      data: { inDrive: true, isPooling: false },
    }),
  ]);

  broadcastToTrip(c.req.param("id"), {
    type: "trip_update",
    tripId: c.req.param("id"),
    status: "ACCEPTED",
  });

  return c.json({ message: "Trip accepted successfully!" });
});
