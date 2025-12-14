import { Elysia, status, t } from "elysia";
import { prisma } from "../lib/prisma";
import { auth } from "../routes/auth";
import { user } from "../routes/user";
import { swagger } from "@elysiajs/swagger";
import {
  ws,
  notifyUserTripStatus,
  notifyCaptainTripStatus,
} from "../routes/ws";
import { cors } from "@elysiajs/cors";
import { captain } from "../routes/captain";

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
      // exact frontend origin
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
  .use(auth)
  .use(user)
  .use(captain)
  .use(ws);

// userId, socket
export const userMap = new Map<string, any>();
export const captainMap = new Map<string, any>();

export type App = typeof app;

app.listen(8080, () => {
  console.log(
    `🦊 uber backend Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
});
