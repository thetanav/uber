import { Elysia, status, t } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { tripService } from "../services/trip";

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
  )
  .post(
    "/captain/pickup",
    async ({ jwt, body, headers: { authorization } }) => {
      const { id, otp } = body;
      if (!authorization) return status(401, "Unauthorized");
      
      let payload: any;
      try {
        payload = await jwt.verify(authorization);
      } catch {
        return status(401, "Unauthorized");
      }

      if (payload.role !== "captain") {
        return status(401, "Unauthorized");
      }

      const result = await tripService.pickupTrip(id, payload.user as string, otp);
      
      if (!result.success) {
        if (result.message === "Captain not found") {
          return status(401, "Unauthorized");
        }
        return { message: result.message };
      }
      
      return { message: result.message };
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

      if (payload.role !== "captain") {
        return status(401, "Unauthorized");
      }

      const result = await tripService.completeTrip(id, payload.user as string);
      
      if (!result.success) {
        if (result.message === "Captain not found") {
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

