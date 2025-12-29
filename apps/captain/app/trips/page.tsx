"use client";

import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@repo/eden";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import CaptainInfo from "@/components/captain";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

interface Trip {
  id: string;
  origin: string;
  originLat: number | string | null;
  originLng: number | string | null;
  destination: string;
  destLat: number | string | null;
  destLng: number | string | null;
  capacity: number;
  pricing: number | string;
  otp: string;
  status: string;
}

export default function AvailableTrips() {
  const router = useRouter();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const { data, isLoading, refetch } = useQuery<{ trips: Trip[] }>({
    queryKey: ["available-trips"],
    queryFn: async () => {
      const res = await api.captain.trips.available.get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch available trips");
      }
      return res.data || { trips: [] };
    },
    refetchInterval: 5000,
  });

  const trips = data?.trips || [];

  const acceptMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await api.captain.trips({ id: tripId }).accept.post();
      if (res.status !== 200) {
        throw new Error("Failed to accept trip");
      }
      return res.data;
    },
    onSuccess: (data, tripId) => {
      toast.success("Trip accepted successfully!");
      router.push(`/trips/${tripId}`);
    },
    onError: () => {
      toast.error("Failed to accept trip");
    },
  });

  useEffect(() => {
    if (trips && trips.length > 0 && !selectedTrip) {
      setSelectedTrip(trips[0] || null);
    }
  }, [trips, selectedTrip]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Available Trips</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <CaptainInfo />

      {!trips || trips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No trips available right now.</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure you are online and check back in a few seconds.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTrip?.id === trip.id
                    ? "ring-2 ring-primary bg-accent"
                    : ""
                }`}
                onClick={() => setSelectedTrip(trip)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    ${trip.pricing?.toFixed(2) || "N/A"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                    <div className="flex gap-4 text-sm text-gray-600 pt-2 border-t">
                      <span className="flex items-center gap-1">
                        Capacity: {trip.capacity}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {selectedTrip && (
              <>
                {selectedTrip.originLat &&
                  selectedTrip.originLng &&
                  selectedTrip.destLat &&
                  selectedTrip.destLng && (
                    <div className="border rounded-lg overflow-hidden">
                      <Map
                        from={[selectedTrip.originLat, selectedTrip.originLng]}
                        to={[selectedTrip.destLat, selectedTrip.destLng]}
                        key={`${selectedTrip.id}-map`}
                      />
                    </div>
                  )}

                <Card>
                  <CardHeader>
                    <CardTitle>Accept Trip?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Earnings</span>
                        <span className="font-semibold">
                          ${selectedTrip.pricing?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-semibold">
                          {selectedTrip.capacity}{" "}
                          {selectedTrip.capacity === 1 ? "person" : "people"}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => acceptMutation.mutate(selectedTrip.id)}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Trip"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
