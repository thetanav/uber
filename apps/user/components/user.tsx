"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  return useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const res = await api.get("/user/me");
      if (res.status !== 200) {
        throw new Error("Failed to fetch user info");
      }
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once for auth endpoints
  });
}

export default function UserInfo() {
  const { data } = useUser();

  if (!data) return null;

  return (
    <div className="text-sm text-muted-foreground mb-4">
      Welcome, {data.name}! ({data.email})
    </div>
  );
}
