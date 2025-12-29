"use client";

import api from "@repo/eden";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, History, Search, Star } from "lucide-react";
import { PreviousTrips } from "@/components/previous-trips";

export default function Home() {
  const { data } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const res = await api.user.get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch user info");
      }
      return res.data;
    },
  });

  return (
    <main className=" p-4">
      <h1 className="text-2xl text-center font-bold text-primary">Uber</h1>
      <div className="space-y-4">
        {/* {data && (
          <>
            <p>{data.email}</p>
            <p>{new Date(data.createdAt).toLocaleString()}</p>
          </>
        )} */}
        <div className="flex flex-col gap-2 mt-4">
          {data ? (
            <>
              <div className="text-3xl flex font-bold capitalize opacity-70">
                <h1>Hi</h1>, {data.name}
              </div>
              <Link href="/book" className="w-full mt-4">
                <div className="px-4 py-3 bg-accent flex items-center gap-2 rounded-xl font-semibold justify-between">
                  Where you want to go?
                  <Search className="ml-2 w-4 h-4 stroke-4 opacity-70" />
                </div>
              </Link>
              <div className="grid grid-cols-2 gap-4 my-6">
                <Link
                  href="/history"
                  className="px-6 py-4 bg-accent rounded-3xl font-semibold justify-between">
                  <h3 className="text-xl font-bold">Previous Rides</h3>
                  <History className="mt-16 ml-auto w-10 h-10 stroke-2 opacity-70" />
                </Link>
                <Link
                  href="/history"
                  className="px-6 py-4 bg-accent rounded-xl font-semibold justify-between">
                  <h3 className="text-xl font-bold">Rate the app</h3>
                  <Star className="mt-16 ml-auto w-10 h-10 stroke-2 opacity-70" />
                </Link>
              </div>

              <PreviousTrips />

              <Link href="/auth/signout" className="w-full">
                <Button variant="ghost" className="w-full">
                  Sign out
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="w-full">
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup" className="w-full">
                <Button variant="ghost" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
