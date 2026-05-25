import { sign, verify } from "hono/jwt";

export type JwtPayload = {
  user: string;
  role: "user" | "captain";
};

const jwtSecret = Bun.env.JWT_SECRET || "uber";

export async function signJwt(payload: JwtPayload) {
  return sign(payload, jwtSecret);
}

export async function verifyJwt(token: string) {
  console.log("in verifyJwt", token, jwtSecret);
  const payload = await verify(token, jwtSecret);
  console.log(">", payload);
  return payload;
}
