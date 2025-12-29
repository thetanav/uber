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
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";

export const PreviousTrips = () => {
  const { data } = useQuery({
    queryKey: ["previous-trips"],
    queryFn: async () => {
      const res = await api.user.history.get();
      return res.data;
    },
  });
  return (
    <div className="grid grid-cols-1 gap-4 mt-4">
      {data &&
        data?.trips.map((trip) => (
          <div key={trip.id} className="border rounded-lg p-4">
            <div className="space-y-2">
              <span className="flex items-center gap-2">
                <Map />
                <p className="w-full text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.origin}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <MapPin />
                <p className="w-full text-ellipsis overflow-hidden whitespace-nowrap">
                  {trip.destination}
                </p>
              </span>
              <span className="flex items-center gap-2">
                <Clock />
                {new Date(trip.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-2">
                {trip.status === "REQUESTED" && <CircleDashed />}
                {trip.status === "ACCEPTED" && <CircleCheck />}
                {trip.status === "ON_TRIP" && <CircleCheck />}
                {trip.status === "COMPLETED" && <CircleCheckBig />}
                {trip.status}
              </span>
              <Link href={`/book/${trip.id}`}>
                <Button>View</Button>
              </Link>
            </div>
          </div>
        ))}
    </div>
  );
};
