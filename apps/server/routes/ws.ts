import { Elysia } from "elysia";
import jwtLib from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { userMap, captainMap } from "../src";
import {
  getTripForUser,
  saveCaptainLocation,
  getCaptainLocation,
} from "../lib/redis";

// Notification functions for trip status updates
export const notifyUserTripStatus = (
  userId: string,
  tripId: string,
  status: string,
) => {
  const ws = userMap.get(userId);
  if (ws) {
    ws.send(
      JSON.stringify({ type: "status:update", payload: { tripId, status } }),
    );
  }
};

export const notifyCaptainTripStatus = (
  captainId: string,
  tripId: string,
  status: string,
) => {
  const ws = captainMap.get(captainId);
  if (ws) {
    ws.send(
      JSON.stringify({ type: "status:update", payload: { tripId, status } }),
    );
  }
};

export const ws = new Elysia().ws("/realtime", {
  async open(ws) {
    const url = new URL((ws.raw as any).url);
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "No token");
      return;
    }
    try {
      const payload = jwtLib.verify(
        token,
        process.env.JWT_SECRET || "uber",
      ) as any;
      (ws as any).info = payload;
      if (payload.role === "user") {
        userMap.set(payload.user, ws);
      } else if (payload.role === "captain") {
        captainMap.set(payload.user, ws);
      }
      console.log("🔗 WS opened for", payload.role, payload.user);
    } catch {
      ws.close(4002, "Invalid token");
    }
  },
  async message(ws: any, msg: { type: string; payload: any }) {
    const { type, payload } = msg;
    switch (type) {
      case "subscribe:trip":
        // payload { tripId }
        // user subscribes to trip updates (location and status) after requesting
        const trip = await prisma.trip.findUnique({
          where: { id: payload.tripId },
          include: { captain: true },
        });
        if (!trip || trip.userId !== ws.info.user) {
          ws.send(
            JSON.stringify({
              type: "error",
              payload: "Trip not found or unauthorized",
            }),
          );
          return;
        }
        userMap.set(ws.info.user, ws);
        ws.send(
          JSON.stringify({
            type: "subscribed",
            payload: { tripId: trip.id, status: trip.status },
          }),
        );
        // Send initial captain location if available
        if (trip.captainId && trip.status === "ACCEPTED") {
          const captainLocation = await getCaptainLocation(trip.captainId);
          if (captainLocation) {
            ws.send(
              JSON.stringify({
                type: "location:update",
                payload: {
                  tripId: trip.id,
                  lat: captainLocation.lat,
                  long: captainLocation.long,
                },
              }),
            );
          }
        }
        break;
      case "send:location":
        // payload { lat, long, tripId? }
        // captain sends location for pooling or during matched trip
        if (ws.info.role !== "captain" || !payload.lat || !payload.long) {
          ws.send(
            JSON.stringify({ type: "error", payload: "Invalid payload" }),
          );
          return;
        }
        await saveCaptainLocation(ws.info.user, payload.lat, payload.long);
        if (payload.tripId) {
          // During matched trip, send to user
          const userId = await getTripForUser(payload.tripId);
          if (userId) {
            const userWs = userMap.get(userId);
            if (userWs) {
              userWs.send(
                JSON.stringify({
                  type: "location:update",
                  payload: {
                    tripId: payload.tripId,
                    lat: payload.lat,
                    long: payload.long,
                  },
                }),
              );
            }
          }
        } else {
          // Pooling: update captain status
          await prisma.captain.update({
            where: { id: ws.info.user },
            data: {
              isOnline: true,
              inDrive: false,
              isPooling: true,
              currentLat: payload.lat,
              currentLng: payload.long,
            },
          });
        }
        ws.send(
          JSON.stringify({
            type: "location:updated",
            payload: "Location sent",
          }),
        );
        break;
      // Removed pool:captain as it's now part of send:location without tripId
      default:
        break;
    }
  },
  // clean up when client disconnects
  close(ws) {
    if ((ws as any).info) {
      const { user, role } = (ws as any).info;
      if (role === "user") {
        userMap.delete(user);
      } else if (role === "captain") {
        captainMap.delete(user);
      }
    }
    console.log("❌ client left");
  },
});
