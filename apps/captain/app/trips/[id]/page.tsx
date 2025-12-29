"use client";

import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@repo/eden";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Navigation, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useLocationTracking } from "@/hooks/useLocationTracking";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

type TripStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_TRIP"
  | "COMPLETED"
  | "CANCELLED";

interface Trip {
  id: string;
  origin: string;
  originLat: any;
  originLng: any;
  destination: string;
  destLat: any;
  destLng: any;
  status: TripStatus;
  otp: string;
  pricing: any;
  capacity: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CaptainTripDetails() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [otpInput, setOtpInput] = useState("");
  const [status, setStatus] = useState<TripStatus | null>(null);

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ["captain-trip", tripId],
    queryFn: async () => {
      const res = await api.captain.history.get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch trip details");
      }
      const allTrips = (res.data as any)?.trips || [];
      return allTrips.find((t: any) => t.id === tripId);
    },
    refetchInterval: (query) => {
      const tripData = query.state.data;
      if (!tripData) return 3000;
      if (tripData.status === "COMPLETED" || tripData.status === "CANCELLED") {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const pickupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.captain.pickup.post({ id: tripId, otp: otpInput });
      if (res.status !== 200) {
        throw new Error("Failed to verify OTP");
      }
    },
    onSuccess: () => {
      toast.success("Pickup verified!");
      setOtpInput("");
    },
    onError: () => {
      toast.error("Invalid OTP");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.captain.complete.post({ id: tripId });
      if (res.status !== 200) {
        throw new Error("Failed to complete trip");
      }
    },
    onSuccess: () => {
      toast.success("Trip completed successfully!");
      router.push("/");
    },
    onError: () => {
      toast.error("Failed to complete trip");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.captain.cancel.post({ id: tripId });
      if (res.status !== 200) {
        throw new Error("Failed to cancel trip");
      }
    },
    onSuccess: () => {
      toast.success("Trip cancelled");
      router.push("/");
    },
    onError: () => {
      toast.error("Failed to cancel trip");
    },
  });

  const { isTracking } = useLocationTracking({
    tripId: tripId,
    enabled: trip?.status === "ACCEPTED" || trip?.status === "ON_TRIP",
  });

  useEffect(() => {
    if (trip?.status && status !== trip.status) {
      toast.success(`Trip status: ${trip.status}`);
    }
    setStatus(trip?.status || null);
  }, [trip?.status, status]);

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case "REQUESTED":
        return "text-yellow-600 bg-yellow-100";
      case "ACCEPTED":
        return "text-blue-600 bg-blue-100";
      case "ON_TRIP":
        return "text-green-600 bg-green-100";
      case "COMPLETED":
        return "text-gray-600 bg-gray-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusLabel = (status: TripStatus) => {
    switch (status) {
      case "REQUESTED":
        return "Waiting for acceptance";
      case "ACCEPTED":
        return "Navigate to pickup";
      case "ON_TRIP":
        return "Trip in progress";
      case "COMPLETED":
        return "Trip completed";
      case "CANCELLED":
        return "Trip cancelled";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const canShowMap =
    trip.originLat && trip.originLng && trip.destLat && trip.destLng;

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="flex gap-2 items-center mb-4">
        <span className="text-2xl font-bold">Trip Details</span>
        {status && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}
          >
            {getStatusLabel(status)}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {canShowMap && (
          <div className="border rounded-lg overflow-hidden">
            <Map
              from={[Number(trip.originLat), Number(trip.originLng)]}
              to={[Number(trip.destLat), Number(trip.destLng)]}
              key={`${trip.id}-captain`}
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="w-0.5 h-16 bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      Pickup
                    </span>
                  </div>
                  <p className="text-gray-900">{trip.origin}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      Destination
                    </span>
                  </div>
                  <p className="text-gray-900">{trip.destination}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-lg font-semibold">
                  ${Number(trip.pricing).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Capacity</p>
                <p className="text-lg font-semibold">
                  {trip.capacity} {trip.capacity === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{trip.user.name}</p>
            <p className="text-sm text-gray-600">{trip.user.email}</p>
          </CardContent>
        </Card>

        {status === "ACCEPTED" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Verify OTP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ask the user for their OTP to verify pickup
                </p>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={4}
                />
                <Button
                  className="w-full"
                  onClick={() => pickupMutation.mutate()}
                  disabled={pickupMutation.isPending || otpInput.length !== 4}
                >
                  {pickupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Start Trip"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "ON_TRIP" && (
          <Card>
            <CardContent className="p-6">
              <Button
                className="w-full"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                variant="default"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  "Complete Trip"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {(status === "ACCEPTED" || status === "REQUESTED") && (
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Trip"}
          </Button>
        )}

        {isTracking && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="text-green-800 font-medium">✓ Sharing location</p>
            <p className="text-xs text-gray-600 mt-1">
              Your location is being shared with the user
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
