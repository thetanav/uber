import { jwt } from "@elysiajs/jwt";
import { t } from "elysia";

export const jwtPlugin = jwt({
  secret: process.env.JWT_SECRET || "uber",
  exp: "7d",
  schema: t.Object({
    user: t.String(),
    role: t.Union([t.Literal("user"), t.Literal("captain")]),
  }),
});
