"use client";

import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  return useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const res = await api.user.info.post({});
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

  return (
    <div>
      {data?.name && <div>{data.name}</div>}
      {data?.email && <div>{data.email}</div>}
    </div>
  );
}
