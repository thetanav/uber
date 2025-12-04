import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { Captain } from "../generated/prisma/client";

export const poolForCaptains = async (
  tripId: string,
  lat: number,
  long: number,
) => {
  // find available captains
  // send to the captain
  // TODO: Fix the bugs
  const captains = await redis.geosearch(
    "captain:locations",
    long,
    lat,
    1000,
    "m",
    "WITHCOORD",
    "COUNT",
    20,
    "ASC",
  );
  let finalCaptain: Captain | null = null;

  for (const cap of captains as [string, [string, string]][]) {
    const captain = await prisma.captain.findUnique({
      where: { id: cap[0] },
    });
    if (!captain) continue;
    if (captain.isOnline && captain.isPooling && !captain.inDrive) {
      finalCaptain = captain;
      break; // Take the first available (closest)
    }
  }
  if (!finalCaptain) return null;
  return finalCaptain;
};
