import Redis from "ioredis";
import { prisma } from "./prisma";
import { notifyCaptainTripStatus } from "../routes/ws";

export const redis = new Redis({
  host: "localhost",
  port: 6379,
});

export async function saveCaptainLocation(
  id: string,
  lat: number,
  long: number
) {
  await redis.geoadd("captain:locations", long, lat, id);
}

export async function findNearestCaptains(
  tripId: string,
  userLat: number,
  userLong: number,
  radius: number = 5,
  max: number = 5
) {
  // TODO: this function will search for nearest drivers and then check wheather they are available for ride
  const results = await redis.geosearch(
    "captain:locations",
    "FROMLONGLAT",
    userLat,
    userLong,
    "BYRADIUS",
    radius,
    "km",
    "WITHDIST",
    "ASC",
    "COUNT",
    max
  );
  for (const result in results) {
    const captain = await prisma.captain.findUnique({
      where: {
        id: result[0],
      },
    });
    if (captain?.inDrive || !captain?.isOnline) continue;

    // match this captain to trip
    await prisma.trip.update({
      data: {
        captainId: captain.id,
        // TODO: add captain here
      },
      where: {
        id: tripId,
      },
    });
    await prisma.captain.update({
      data: {
        isOnline: true,
        isPooling: false,
        inDrive: true,
      },
      where: {
        id: captain.id,
      },
    });
    notifyCaptainTripStatus(captain.id, tripId, "ACCEPTED");
  }
}

export async function getCaptainLocation(id: string) {
  const pos = await redis.geopos("captain:locations", id);
  if (!pos || !pos[0]) return null;
  const [long, lat] = pos[0];
  return { lat, long };
}

export async function setTripForUser(userId: string, tripId: string) {
  await redis.set(`trip:user:${tripId}`, userId);
}

export async function getUserFromTrip(tripId: string) {
  const userId = await redis.get(`trip:user:${tripId}`);
  if (!userId) return null;
  return userId;
}
