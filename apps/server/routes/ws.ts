import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { userMap, captainMap } from "../src";
import {
  saveCaptainLocation,
  getCaptainLocation,
  getUserFromTrip,
} from "../lib/redis";
import { jwtPlugin } from "../lib/jwt";
import { cookie } from "@elysiajs/cookie";

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

export const ws = new Elysia()
  .use(jwtPlugin)
  .use(cookie())
  .guard({
    // runs before each handler (including WS upgrades)
    async beforeHandle({ request, jwt, cookie, status }) {
      const token = cookie.auth?.value;
      console.log("guard: beforeHandle", token);

      if (!token) return status(401, "Missing token");

      // ---------------------------------------------------------
      // Verify the token – `jwt.verify` returns the payload or `null`
      const payload = await jwt.verify(token as string);

      if (!payload) return status(401, "Invalid token");

      console.log("JWT verified for:", payload.user, payload.role, payload);

      // ---------------------------------------------------------
      // Return extra data – Elysia merges it into the WS context
      // `info` will be available as `ws.data.info` later
      return { info: payload };
    },
  })
  .ws("/realtime", {
    async open(ws) {
      const info = ws.data.info;
      console.log("open", info);
      if (info.role === "user") {
        userMap.set(info.user, ws);
      } else if (info.role === "captain") {
        captainMap.set(info.user, ws);
      }

      console.log("🔗 WS opened for", info.role, info.user);
    },
    async message(ws, msg: { type: string; payload: any }) {
      const { type, payload } = msg;
      switch (type) {
        case "subscribe:trip":
          // payload { tripId }
          // user subscribes to trip updates (location and status) after requesting
          if (ws.data.info.role == "user") return;

          const trip = await prisma.trip.findUnique({
            where: { id: payload.tripId },
            include: { captain: true },
          });

          if (!trip || trip.userId !== (ws.data as any).user) {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: "Trip not found or unauthorized",
              })
            );
            return;
          }

          userMap.set(ws.data.info.user, ws);

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
          if (ws.data.info.role == "user") return;
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
                id: ws.data.info.user,
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
                id: ws.data.info.user,
              },
            });
            await saveCaptainLocation(
              (ws.data as any).user,
              payload.lat,
              payload.long
            );
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
      console.log("❌ client left");
      if (ws.data) {
        const { user, role } = ws.data.info as any;
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
