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
  const captains = await redis.geosearch("captain:locations", {
    longitude: long,
    latitude: lat,
    radius: 1000,
    unit: "m",
    withCoordinates: true,
    sort: "ASC",
    count: 20,
  });
  let finalCaptain: Captain | null = null;

  await Promise.all(
    captains.map(async (cap) => {
      const captain = await prisma.captain.findUnique({
        where: { id: cap.id },
      });
      if (!captain) return;
      if (captain?.isOnline && captain.isPooling && !captain.inDrive) {
        finalCaptain = captain;
      }
    }),
  );
  if (!finalCaptain) return null;
  return finalCaptain;
};
