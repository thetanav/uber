import { z } from "zod";

export const RoleSchema = z.enum(["user", "captain"]);
export type Role = z.infer<typeof RoleSchema>;
