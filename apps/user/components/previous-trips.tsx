"use client";

import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";
import {
  CircleDashed,
  Circle,
  Clock,
  Locate,
  LocateIcon,
  Map,
  MapPin,
  CircleCheck,
  CircleCheckBig,
  Check,
  ArrowUpRight,
  IndianRupee,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

export const PreviousTrips = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["previous-trips"],
    queryFn: async () => {
      const res = await api.user.history.get();
      return res.data;
    },
  });
  return (
    <div className="mt-4 select-none">
      <p className="text-xl font-bold text-muted-foreground mb-4">
        Ongoing Trips
      </p>
      {isLoading ? (
        <div className="gap-2 flex flex-col w-full">
          <div className="animate-pulse size-4 bg-neutral-100 rounded-3xl h-48 w-full" />
          <div className="animate-pulse size-4 bg-neutral-100 rounded-3xl h-48 w-full" />
          <div className="animate-pulse size-4 bg-neutral-100 rounded-3xl h-48 w-full" />
        </div>
      ) : (
        data?.trips.map((trip) => (
          <div key={trip.id} className="border rounded-xl p-4">
            <div className="space-y-2">
              <span className="flex items-center gap-2">
                <IndianRupee className="size-4 text-muted-foreground" />
                <p className="max-w-56 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.pricing.toString()}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <Map className="size-4 text-muted-foreground" />
                <p className="max-w-56 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.origin}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <p className="max-w-56 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.destination}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <p className="max-w-56 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                  {new Date(trip.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {trip.status === "REQUESTED" && (
                    <CircleDashed className="size-4" />
                  )}
                  {trip.status === "ACCEPTED" && (
                    <CircleCheck className="size-4" />
                  )}
                  {trip.status === "ON_TRIP" && (
                    <CircleCheck className="size-4" />
                  )}
                  {trip.status === "COMPLETED" && <CircleCheckBig />}
                </span>
                <p className="max-w-56 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.status}{" "}
                </p>
              </span>
              <Link href={`/book/${trip.id}`}>
                <Button variant={"outline"} size={"sm"}>
                  View
                  <ArrowUpRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
