"use client";

import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@repo/eden";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import MapComp from "@/components/map";

const Map = dynamic(() => import("@/components/map"), { ssr: true });

type TripStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_TRIP"
  | "COMPLETED"
  | "CANCELLED";

export default function RideDetails() {
  const params = useParams();
  const rideId = params.id as string;
  const [status, setStatus] = useState<TripStatus | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", rideId],
    queryFn: async () => {
      const res = await api.user.trip({ id: rideId }).get();
      if (res.status !== 200) {
        throw new Error("Failed to fetch trip details");
      }
      return res.data;
      // originLat: tripData.originLat,
      // originLng: tripData.originLng,
      // destLat: tripData.destLat,
      // destLng: tripData.destLng,
      // pricing: tripData.pricing,
    },

    // Adaptive polling based on trip status
    refetchInterval: (query) => {
      const tripData = query.state.data;
      if (!tripData) return 3000;

      // Stop polling when trip is completed or cancelled
      if (tripData.status === "COMPLETED" || tripData.status === "CANCELLED") {
        return false;
      }

      // More frequent polling when captain is approaching (ACCEPTED status)
      if (tripData.status === "ACCEPTED") {
        return 2000; // 2 seconds - critical phase
      }

      // Default polling for other statuses
      return 3000; // 3 seconds
    },

    refetchIntervalInBackground: true,
    staleTime: 0, // Always fetch fresh data
  });

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
        return "Waiting for driver";
      case "ACCEPTED":
        return "Driver on the way";
      case "ON_TRIP":
        return "Ride in progress";
      case "COMPLETED":
        return "Ride completed";
      case "CANCELLED":
        return "Ride cancelled";
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
        <span className="text-2xl font-bold">Ride Details</span>
        {status && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* OTP Section */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Shield className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Your OTP</p>
            <p className="text-2xl font-bold text-blue-600">{trip.otp}</p>
            <p className="text-xs text-gray-500 mt-1">
              Share this with your driver to start the ride
            </p>
          </div>
        </div>

        {/* Origin and Destination */}
        <div className="space-y-4">
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
                    Origin
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
        </div>

        {/* Map */}
        {canShowMap && (
          <div className="border rounded-lg overflow-hidden">
            <MapComp
              origin={{
                name: trip.origin,
                latitude: trip.originLat,
                longitude: trip.originLng,
              }}
              destination={{
                name: trip.destination,
                latitude: trip.destLat,
                longitude: trip.destLng,
              }}
              captainLocation={
                trip.captain?.location
                  ? [
                      Number(trip.captain.location.lat),
                      Number(trip.captain.location.lng),
                    ]
                  : null
              }
            />
          </div>
        )}

        {/* Trip Information */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Capacity</p>
            <p className="text-lg font-semibold">
              {trip.capacity} {trip.capacity === 1 ? "person" : "people"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Price</p>
            <p className="text-lg font-semibold">${trip.pricing.toString()}</p>
          </div>
        </div>

        {/* Captain Information */}
        {trip.captain && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Your Driver
            </p>
            <p className="text-lg font-semibold">{trip.captain.name}</p>
            {trip.captain.vehicle && (
              <p className="text-sm text-gray-600">
                Vehicle: {trip.captain.vehicle}
              </p>
            )}
          </div>
        )}

        {/* Status Messages */}
        {status === "REQUESTED" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your ride request has been sent. We're looking for a driver
              nearby...
            </p>
          </div>
        )}

        {status === "ACCEPTED" && !trip.captain && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              A driver has accepted your ride! Driver details will appear
              shortly.
            </p>
          </div>
        )}

        {status === "ON_TRIP" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Your ride is in progress. Enjoy your trip!
            </p>
          </div>
        )}

        {status === "COMPLETED" && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-800">
              Your ride has been completed. Thank you for using our service!
            </p>
          </div>
        )}

        {status === "CANCELLED" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              This ride has been cancelled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
