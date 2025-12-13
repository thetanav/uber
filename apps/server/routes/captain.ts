import { Elysia, status, t } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { notifyCaptainTripStatus, notifyUserTripStatus } from "./ws";

export const captain = new Elysia({ prefix: "/captain" })
  .use(jwtPlugin)
  .derive(async ({ jwt, cookie, headers, set }) => {
    const token = cookie.auth?.value || headers.authorization;

    if (!token) {
      set.status = 401;
      throw new Error("Unauthorized");
    }

    try {
      const payload = await jwt.verify(token as string);
      if (!payload || payload.role != "captain")
        throw new Error("Invalid token");
      return { payload };
    } catch {
      set.status = 401;
      throw new Error("Invalid token");
    }
  })
  .post(
    "/cancel",
    async ({ body, payload }) => {
      const { id } = body;

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
        // Notify user
        notifyUserTripStatus(trip.userId, trip.id, "CANCELLED");
      } else {
        return status(401, "Unauthorized");
      }

      return { message: "Trip cancelled successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/pickup",
    async ({ body, payload }) => {
      // check the trip id and otp of the trip and also the trip has not started also the trip captain is the
      const { id, otp } = body;

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

      // Notify user
      notifyUserTripStatus(trip.userId, trip.id, "ON_TRIP");
      return { message: "Trip picked up successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
        otp: t.String(),
      }),
    }
  )
  .post(
    "/complete",
    async ({ body, payload }) => {
      const { id } = body;

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

      // Notify user
      notifyUserTripStatus(trip.userId, trip.id, "COMPLETED");
      return { message: "Trip completed successfully!" };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    }
  )
  .get("/history", async ({ jwt, headers: { authorization } }) => {
    if (!authorization) return status(401, "Unauthorized");
    let payload: any;
    try {
      payload = await jwt.verify(authorization);
    } catch {
      return status(401, "Unauthorized");
    }

    if (payload.role !== "captain") return status(401, "Unauthorized");

    const trips = await prisma.trip.findMany({
      where: { captainId: payload.user as string },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return { trips };
  })
  .post(
    "/match",
    async ({ body, payload }) => {
      const { id } = body;

      const captain = await prisma.captain.findUnique({
        where: { id: payload.user },
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
        // Notify user and captain
        notifyUserTripStatus(trip.userId, trip.id, "ACCEPTED");
        notifyCaptainTripStatus(captain.id, trip.id, "ACCEPTED");
      } else {
        return status(401, "Unauthorized");
      }

      return { message: "Trip matched successfully!", tripid: trip.id };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    }
  );
