import { Elysia } from "elysia";
import jwtLib from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { userMap, captainMap } from "../src";
import {
  getTripForUser,
  setTripForUser,
  saveCaptainLocation,
  getCaptainLocation,
} from "../lib/redis";
import { p } from "vitest/dist/chunks/reporters.d.OXEK7y4s";

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
      case "listen:user":
        // payload { tripId }
        // user will send message listen <trip id>
        // we have to send it the updates on the trips status with captain location
        const trip = await prisma.trip.findUnique({
          where: { id: payload.tripId },
        });
        if (!trip || trip.status != "ACCEPTED" || !trip.capacity) {
          ws.send(JSON.stringify({ type: "error", payload: "Trip not found" }));
          return;
        }
        const captainWs = captainMap.get(trip.captainId!);
        if (!captainWs) {
          ws.send(
            JSON.stringify({ type: "error", payload: "Captain not connected" }),
          );
          return;
        }
        userMap.set(payload.user, ws);
        ws.send(JSON.stringify({ type: "success", payload: "Listening" }));
        const captainLocation = await getCaptainLocation(trip.captainId!);
        if (!captainLocation) {
          ws.send(
            JSON.stringify({ type: "error", payload: "No location data" }),
          );
          return;
        }
        ws.send(
          JSON.stringify({
            type: "update",
            payload: {
              lat: captainLocation.lat,
              long: captainLocation.long,
            },
          }),
        );
        break;
      case "send:captain":
        // payload { lat, long, tripId }
        if (
          ws.info.role !== "captain" ||
          !payload.lat ||
          !payload.long ||
          !payload.tripId
        ) {
          ws.send(JSON.stringify({ type: "error", payload: "" }));
          return;
        }
        // captain send lat and long through the ws
        // we have to send it the updates on the trips status
        await saveCaptainLocation(payload.user, payload.lat, payload.long);
        const userId = await getTripForUser(payload.tripId);
        if (userId == undefined) {
          const trip = await prisma.trip.findUnique({
            where: { id: payload.tripId },
            include: { captain: true },
          });
          if (!trip) {
            ws.send(
              JSON.stringify({ type: "error", payload: "Trip not found" }),
            );
            return;
          }
          await setTripForUser(payload.tripId, trip.userId);
        }
        const userWs = userMap.get(userId!);
        if (userWs) {
          userWs.send(
            JSON.stringify({
              type: "update",
              payload: {
                status: "in_progress",
                location: { lat: payload.lat, long: payload.long },
              },
            }),
          );
          break;
        }
        ws.send(JSON.stringify({ type: "error", payload: "User not found" }));
        break;
      case "pool:captain":
        // captain pools for trips and sends there live location
        if (
          ws.info.role !== "captain" ||
          !payload.lat ||
          !payload.long ||
          !payload.tripId
        ) {
          ws.send(JSON.stringify({ type: "error", payload: "" }));
          return;
        }
        await prisma.captain.update({
          where: { id: payload.user },
          data: {
            isOnline: true,
            inDrive: false,
            isPooling: true,
            currentLat: payload.lat,
            currentLng: payload.long,
          },
        });
        // captain send lat and long through the ws
        // we have to save it
        await saveCaptainLocation(payload.user, payload.lat, payload.long);
        break;
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
