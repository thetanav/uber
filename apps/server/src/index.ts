import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import { jwtPlugin } from "../lib/jwt";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { captain } from "../routes/captain";
import {
  ws,
  notifyUserTripStatus,
  notifyCaptainTripStatus,
} from "../routes/ws";

const app = new Elysia()
  .use(jwtPlugin)
  .on("error", ({ code }) => {
    if (code === "NOT_FOUND") {
      return "Path not found :(";
    } else {
      return "Internal Server Error";
    }
  })
  .use(auth)
  .use(user)
  .use(captain)
  .use(ws)
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
    },
  );

export const userMap = new Map<string, any>();
export const captainMap = new Map<string, any>();

export type App = typeof app;
export default app;

// Start server if run directly
if (import.meta.main) {
  app.listen(process.env.PORT || 3000, () => {
    console.log(
      `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
    );
  });
}
