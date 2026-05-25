"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const data = useQuery({
    queryKey: ["verify"],
    queryFn: async () => {
      const res = await api.post("/user/verify", {
        headers: {
          authorization: localStorage.getItem("token"),
        },
      });
      return res;
    },
  });
  if (!data) redirect("/login");
  return children;
}
