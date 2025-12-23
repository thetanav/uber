import { Elysia, status } from "elysia";
import { prisma } from "../lib/prisma";
import { userMap, captainMap } from "../src";
import {
  saveCaptainLocation,
  getCaptainLocation,
  getUserFromTrip,
} from "../lib/redis";
import { jwtPlugin } from "../lib/jwt";

// Notification functions for trip status updates
export const notifyUserTripStatus = (
  userId: string,
  tripId: string,
  status: string
) => {
  const ws = userMap.get(userId);
  if (ws) {
    ws.send(
      JSON.stringify({ type: "status:update", payload: { tripId, status } })
    );
  }
};

export const notifyCaptainTripStatus = (
  captainId: string,
  tripId: string,
  status: string
) => {
  const ws = captainMap.get(captainId);
  if (ws) {
    ws.send(
      JSON.stringify({ type: "status:update", payload: { tripId, status } })
    );
  }
};

export const ws = new Elysia().use(jwtPlugin).ws("/realtime", {
  async open(ws) {
    const token = ws.data.query?.token;

    if (!token) return status(401, "Missing token");

    try {
      const payload = await ws.data.jwt.verify(token as string);
      if (!payload) return status(401, "Invalid token");
      (ws.data as any).info = payload;

      ws.send(
        JSON.stringify({
          type: "auth",
          status: "ok",
          userId: payload.user,
        })
      );
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", payload: "Unauthorized" }));
      ws.close?.();
    }

    if ((ws.data as any).info?.role === "user") {
      userMap.set((ws.data as any).info.user, ws);
    } else if ((ws.data as any).info.role === "captain") {
      captainMap.set((ws.data as any).info.user, ws);
    }
  },
  async message(ws, msg: { type: string; payload: any }) {
    const { type, payload } = msg;
    const info = (ws.data as any).info;
    if (!info) return;
    switch (type) {
      case "subscribe:trip":
        // payload { tripId }
        // user subscribes to trip updates (location and status) after requesting
        if (info.role == "user") return;

        const trip = await prisma.trip.findUnique({
          where: { id: payload.tripId },
          include: { captain: true },
        });

        if (!trip || trip.userId !== info.user) {
          ws.send(
            JSON.stringify({
              type: "error",
              payload: "Trip not found or unauthorized",
            })
          );
          return;
        }

        userMap.set(info.user, ws);

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
              })
            );
          }
        }

        ws.send(
          JSON.stringify({
            type: "subscribed",
            payload: { tripId: trip.id, status: trip.status },
          })
        );
        break;
      case "send:location":
        // payload { lat, long, tripId? }
        // captain sends location for pooling or in drive
        if (info.role == "user") return;
        if (!payload.lat || !payload.long) {
          ws.send(
            JSON.stringify({ type: "error", payload: "Invalid payload" })
          );
          return;
        }

        if (payload.tripId) {
          await prisma.captain.update({
            data: {
              isOnline: true,
              inDrive: true,
              isPooling: false,
            },
            where: {
              id: info.user,
            },
          });

          try {
            const userId = await getUserFromTrip(payload.tripId);

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
                  })
                );
              }
            }
          } catch {
            new Error("User not connected");
          }
        } else {
          await prisma.captain.update({
            data: {
              isOnline: true,
              inDrive: false,
              isPooling: true,
            },
            where: {
              id: info.user,
            },
          });
          await saveCaptainLocation(info.user, payload.lat, payload.long);
        }
        ws.send(
          JSON.stringify({
            type: "location:updated",
            payload: "Location sent",
          })
        );
        break;
      default:
        break;
    }
  },
  // clean up when client disconnects
  async close(ws) {
    if (ws.data) {
      const { user, role } = (ws.data as any).info;
      if (role === "user") {
        userMap.delete(user);
      } else if (role === "captain") {
        captainMap.delete(user);
        // make captain offline
        await prisma.captain.update({
          data: {
            isOnline: false,
            isPooling: false,
            inDrive: false,
          },
          where: {
            id: user,
          },
        });
      }
    }
  },
});
