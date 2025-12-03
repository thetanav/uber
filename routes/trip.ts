import { Elysia, status, t } from "elysia";
import { jwtPlugin } from "../lib/jwt";
import { tripService } from "../services/trip";

export const trip = new Elysia({ prefix: "/trip" })
  .use(jwtPlugin)
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

      if (payload.role !== "captain") {
        return status(401, "Unauthorized");
      }

      const result = await tripService.matchTrip(id, payload.user as string);
      
      if (!result.success) {
        return status(400, result.message);
      }
      
      return { message: result.message, tripid: result.tripid };
    },
    {
      body: t.Object({
        id: t.String(),
      }),
    },
  );
