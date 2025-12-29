import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { Captain } from "../generated/prisma/client";

export const firstCaptain = async (
  userId: string,
  tripId: string,
  lat: number,
  long: number,
) => {
  // find the first available captian and match with the trip
  const captains = await redis.geosearch(
    "captain:locations",
    long,
    lat,
    2000,
    "m",
    "WITHCOORD",
    "COUNT",
    10,
    "ASC",
  );
  let finalCaptain: Captain | null = null;

  for (const cap of captains as [string, [string, string]][]) {
    const captain = await prisma.captain.findUnique({
      where: { id: cap[0] },
    });
    if (!captain) continue;
    // check captain is available for trip
    if (captain.isOnline && captain.isPooling && !captain.inDrive) {
      finalCaptain = captain;
      break; // Take the first available (closest)
    }
  }

  if (finalCaptain) {
    await prisma.captain.update({
      where: { id: finalCaptain.id },
      data: { inDrive: true, isPooling: false },
    });
    await prisma.trip.update({
      where: { id: tripId },
      data: { captainId: finalCaptain.id },
    });
  }

  return finalCaptain;
};
