"use client";

import { Card, CardContent } from "@/components/ui/card";
import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type TripStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_TRIP"
  | "COMPLETED"
  | "CANCELLED";

interface Trip {
  id: string;
  origin: string;
  destination: string;
  status: TripStatus;
  pricing: any;
  capacity: number;
  createdAt: any;
  user: {
    name: any;
    email: string;
  };
}

export default function CaptainHistory() {
  const { data, isLoading } = useQuery<{ trips: Trip[] }>({
    queryKey: ["captain-history"],
    queryFn: async () => {
      const res = await api.captain.history.get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch trip history");
      }
      return res.data || { trips: [] };
    },
  });

  const trips = data?.trips || [];

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "ON_TRIP":
        return "text-blue-600 bg-blue-100";
      case "ACCEPTED":
        return "text-yellow-600 bg-yellow-100";
      case "REQUESTED":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trip History</h1>
        <Link href="/">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {!trips || trips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No trips yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Go online to start accepting trips!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(trip.status)}`}
                      >
                        {trip.status}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-600 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="text-sm font-medium">{trip.origin}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation className="h-4 w-4 text-red-600 mt-1" />
                        <div>
                          <p className="text-xs text-gray-500">Destination</p>
                          <p className="text-sm font-medium">
                            {trip.destination}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      ${Number(trip.pricing).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip.capacity}{" "}
                      {trip.capacity === 1 ? "person" : "people"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center text-sm">
                  <div>
                    <p className="text-xs text-gray-500">User</p>
                    <p className="font-medium">{trip.user.name}</p>
                  </div>
                  {trip.status === "ACCEPTED" && (
                    <Link href={`/trips/${trip.id}`}>
                      <Button size="sm" variant="default">
                        View Trip
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
