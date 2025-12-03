import { Elysia, status, t } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export const captain = new Elysia({ prefix: "/captain" })
  .use(jwtPlugin)
  .post(
    "/master/cancel",
    async ({ jwt, body, headers: { authorization } }) => {
      const { id } = body;
      if (!authorization) return status(401, "Unauthorized");
      let payload: any;
      try {
        payload = await jwt.verify(authorization);
      } catch {
        return status(401, "Unauthorized");
      }

      const trip = await prisma.trip.findUnique({
        where: { id },
      });
      if (!trip) return { message: "Trip not found!" };

      if (
        payload.role === "captain" &&
        trip.captainId === (payload.user as string)
      ) {
        await prisma.trip.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      } else if (
        payload.role === "user" &&
        trip.userId === (payload.user as string)
      ) {
        if (trip.status === "ACCEPTED") {
          return { message: "Ride has already started!" };
        }
        await prisma.trip.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
      } else {
        return status(401, "Unauthorized");
      }

      const userId = tripUserMap.get(trip.id);
      const wss = userId ? userMap.get(userId) : undefined;
      if (wss) wss.send(JSON.stringify({ type: "CANCELLED" }));
      return { message: "Trip cancelled successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    "/captain/pickup",
    async ({ jwt, body, headers: { authorization } }) => {
      // check the trip id and otp of the trip and also the trip has not started also the trip captain is the
      const { id, otp } = body;
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
      if (
        !trip ||
        trip.captainId !== captain.id ||
        trip.status !== "ACCEPTED" ||
        trip.otp !== otp
      ) {
        return { message: "Invalid trip or OTP!" };
      }

      await prisma.trip.update({
        where: { id },
        data: { status: "ON_TRIP" },
      });

      const userId = tripUserMap.get(trip.id);
      const wss = userId ? userMap.get(userId) : undefined;
      if (wss) wss.send(JSON.stringify({ type: "ON_TRIP" }));
      return { message: "Trip picked up successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
        otp: t.String(),
      }),
    },
  )
  .post(
    "/captain/complete",
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
      if (!trip || trip.captainId !== captain.id || trip.status !== "ON_TRIP") {
        return { message: "Invalid trip!" };
      }

      await prisma.trip.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      const userId = tripUserMap.get(trip.id);
      const wss = userId ? userMap.get(userId) : undefined;
      if (wss) wss.send(JSON.stringify({ type: "COMPLETED" }));
      return { message: "Trip completed successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    },
  );
