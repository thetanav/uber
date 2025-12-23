"use client";

import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  return useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const res = await api.user.get();
      if (res.status === 200) {
        return res.data;
      } else {
        throw new Error("Failed to fetch user info");
      }
    },
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
