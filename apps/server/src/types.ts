import type { JwtPayload } from "../lib/jwt";

export type AppBindings = {
  Variables: {
    auth: JwtPayload;
  };
};
