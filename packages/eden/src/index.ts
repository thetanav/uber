import { treaty } from "@elysiajs/eden";
import type { App } from "../../../apps/server/src/index";

const api = treaty<App>("localhost:8080");

export default api;
