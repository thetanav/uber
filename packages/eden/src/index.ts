import { treaty } from "@elysiajs/eden";
import type { App } from "../../../apps/server/src/index";

const api = treaty<App>("https://api.uber.local", {
  fetch: {
    credentials: "include", // VERY IMPORTANT
  },
});

export default api;
