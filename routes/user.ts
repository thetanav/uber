import { Elysia, t, status } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { Decimal } from "decimal.js";
import { tripService } from "../services/trip";

export const user = new Elysia({ prefix: "/user" })
  .use(jwtPlugin)
  .post(
    "/user/request",
    async ({ jwt, body, headers: { authorization } }) => {
      const { origin, destination, capacity } = body;
      if (!authorization) return status(401, "Unauthorized");
      
      let payload: any;
      try {
        payload = await jwt.verify(authorization);
      } catch {
        return status(401, "Unauthorized");
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.user as string },
      });
      if (!user) return status(401, "Unauthorized");
      
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const trip = await prisma.trip.create({
        data: {
          user: { connect: { id: user.id } },
          origin: origin.name,
          originLat: origin.latitude,
          originLng: origin.longitude,
          destination: destination.name,
          destLat: destination.latitude,
          destLng: destination.longitude,
          capacity,
          pricing: new Decimal(0),
          status: "REQUESTED",
          otp,
        },
      });
      return { message: "Trip created successfully!", id: trip.id, otp };
    },
    {
      body: t.Object({
        origin: t.Object({
          name: t.String(),
          latitude: t.Number(),
          longitude: t.Number(),
        }),
        destination: t.Object({
          name: t.String(),
          latitude: t.Number(),
          longitude: t.Number(),
        }),
        capacity: t.Number(),
      }),
    },
  )
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

      const result = await tripService.cancelTrip(id, payload.user as string, payload.role);
      
      if (!result.success) {
        if (result.message === "Unauthorized") {
          return status(401, "Unauthorized");
        }
        return { message: result.message };
      }
      
      return { message: result.message };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    },
  );

