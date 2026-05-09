"use client";

import { useQuery } from "@tanstack/react-query";
import { History, LogOut, Search, Star } from "lucide-react";
import { PreviousTrips } from "@/components/previous-trips";
import { useAuth } from "@/lib/store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import api from "@repo/eden";

export default function Page() {
  const auth = useAuth();
  useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const res = await api.user.get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch user info");
      }
      auth.set(res.data);
      return res.data;
    },
  });
  return (
    <div className="p-4 space-y-6">
      <div className="flex w-full">
        <Link
          href="/"
          className="text-2xl text-center w-full font-bold text-primary"
        >
          Uber
        </Link>
      </div>
      <div className="text-3xl flex font-bold capitalize gap-2">
        <h1>Hi,</h1>
        <p>{auth.data.name}</p>
        <Link href="/auth/signout">
          <Button variant="ghost" size="icon-sm">
            <LogOut />
          </Button>
        </Link>
      </div>
      <Link href="/book" className="w-full">
        <div className="px-4 py-3 bg-accent flex items-center gap-2 rounded-xl font-semibold justify-between">
          Where you want to go?
          <Search className="ml-2 w-4 h-4 stroke-4 opacity-70" />
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-4 my-6">
        <Link
          href="/history"
          className="px-6 py-4 bg-accent rounded-3xl font-semibold justify-between"
        >
          <h3 className="text-xl font-bold">Previous Rides</h3>
          <History className="mt-16 ml-auto w-10 h-10 stroke-2 opacity-70" />
        </Link>
        <Link
          href="/history"
          className="px-6 py-4 bg-accent rounded-3xl font-semibold justify-between"
        >
          <h3 className="text-xl font-bold">Rate the app</h3>
          <Star className="mt-16 ml-auto w-10 h-10 stroke-2 opacity-70" />
        </Link>
      </div>

      <PreviousTrips />
    </div>
  );
}
