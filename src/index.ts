import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import { jwtPlugin } from "../lib/jwt";
import jwtLib from "jsonwebtoken";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { captain } from "../routes/captain";


const app = new Elysia()
  .use(jwtPlugin)
  .use(auth)
  .use(user)
  .use(captain);

// TODO: use redis for all of this
const userMap = new Map<string, any>();
const captainMap = new Map<string, any>();
const captainLoc = new Map<string, { lat: number; long: number }>();
const tripUserMap = new Map<string, string>();

app.ws("/realtime", {
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
        captainLoc.set(payload.user, { lat: payload.lat, long: payload.long });
        const userId = tripUserMap.get(payload.tripId);
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
          tripUserMap.set(payload.tripId, trip.userId);
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
})
    .post(
      "/match",
      async ({ jwt, body, headers: { authorization } }) => {
        const { id } = body;
        if (!authorization) return status(401, "Unauthorized");
        let payload: any;
        try {
          payload = await jwt.verify(authorization);
        } catch {
          return status(401, "Unauthorized");
        }

        const captain = await prisma.captain.findUnique({
          where: { id: payload.user as string },
        });
        if (!captain) return status(401, "Unauthorized");

        const trip = await prisma.trip.findUnique({
          where: { id },
        });
        if (!trip) return { message: "Trip not found!" };

        if (payload.role === "captain" && trip.status === "REQUESTED") {
          await prisma.trip.update({
            where: { id },
            data: {
              status: "ACCEPTED",
              captain: { connect: { id: captain.id } },
            },
          });
        } else {
          return status(401, "Unauthorized");
        }

        return { message: "Trip matched successfully!", tripid: trip.id };
      },
      {
        body: t.Object({
          id: t.String(),
        }),
      },
    ),
);

app.listen(process.env.PORT || 3000);

console.log(
  `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
export default app;
