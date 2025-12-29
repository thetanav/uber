import { Elysia, t } from "elysia";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { captain } from "../routes/captain";
import { haversine } from "../lib/math";

const app = new Elysia({
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // TODO: true in production (https)
    path: "/",
  },
})
  .use(
    cors({
      credentials: true,
    })
  )
  .use(
    swagger({
      // optional: change the path
      path: "/swagger",
      // optional: change metadata
      documentation: {
        info: {
          title: "My Uber Clone API",
          version: "1.0.0",
          description: "API docs for my ride app",
        },
      },
    })
  )
  .on("error", ({ code, error }) => {
    if (code === "NOT_FOUND") {
      return "Path not found :(";
    } else {
      return error;
    }
  })
  .get("/", () => "Welcome to Uber Backend!")
  .post(
    "/price",
    ({ body }) => {
      const { origin, destination, capacity } = body;
      const dist = haversine(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );

      // const surgeCharge = max(1, active_requests/active_drivers)

      return {
        price: dist * capacity * 0.4,
      };
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
    }
  )
  .use(auth)
  .use(user)
  .use(captain);

export type App = typeof app;

app.listen(
  {
    port: 8080,
    hostname: "0.0.0.0",
  },
  () => {
    console.log(
      `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
  }
);
