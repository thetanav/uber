import Redis from "ioredis";

export const redis = new Redis({
  host: "localhost",
  port: 6379,
});

export async function saveCaptainLocation(
  id: string,
  lat: number,
  long: number,
) {
  await redis.geoadd("captain:locations", long, lat, id);
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

export async function getTripForUser(tripId: string) {
  const userId = await redis.get(`trip:user:${tripId}`);
  if (!userId) return null;
  return userId;
}
