"use client";

import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";

export default function Page() {
  useQuery({
    queryKey: ["user-singout"],
    queryFn: async () => {
      const res = await api.auth.logout.get();
      if (res.status !== 200) {
        console.error("there was an error in signout");
      }
      return res.data;
    },
  });
  return <div>you are now signout!</div>;
}
