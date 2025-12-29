"use client";

import api from "@repo/eden";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CaptainInfo from "@/components/captain";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function CaptainDashboard() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isTracking, error, lastLocation } = useLocationTracking({
    enabled: isOnline,
  });

  const onlineMutation = useMutation({
    mutationFn: async () => {
      const res = await api.captain.online.post();
      if (res.status !== 200) {
        throw new Error("Failed to go online");
      }
    },
  });

  const offlineMutation = useMutation({
    mutationFn: async () => {
      const res = await api.captain.offline.post();
      if (res.status !== 200) {
        throw new Error("Failed to go offline");
      }
    },
  });

  const handleToggleOnline = async () => {
    try {
      if (!isOnline) {
        await onlineMutation.mutateAsync();
        setIsOnline(true);
        toast.success("You are now online and accepting trips");
      } else {
        await offlineMutation.mutateAsync();
        setIsOnline(false);
        toast.info("You are now offline");
      }
    } catch (err) {
      toast.error("Failed to toggle online status");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    router.push("/auth/signin");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-emerald-600">
            Captain Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CaptainInfo />

          <div className="space-y-2">
            <Link href="/trips" className="w-full">
              <Button
                className="w-full"
                variant={isOnline ? "default" : "secondary"}>
                Available Trips
              </Button>
            </Link>
            <Link href="/history" className="w-full">
              <Button className="w-full">Trip History</Button>
            </Link>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-lg font-semibold">
                  {isOnline ? "🟢 Online" : "⚫ Offline"}
                </p>
                <p className="text-sm text-gray-500">
                  {isOnline ? "Accepting trips" : "Not accepting"}
                </p>
              </div>
              <Button
                onClick={handleToggleOnline}
                disabled={onlineMutation.isPending || offlineMutation.isPending}
                variant={isOnline ? "destructive" : "default"}>
                {(onlineMutation.isPending || offlineMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isOnline ? "Go Offline" : "Go Online"}
              </Button>
            </div>
          </div>

          {isOnline && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-800">
                {isTracking ? "✓ Tracking active" : "⚠ Waiting for location..."}
              </p>
              {lastLocation && (
                <p className="text-xs text-gray-600 mt-1">
                  Lat: {lastLocation.lat.toFixed(4)}, Lng:{" "}
                  {lastLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              Error: {error}
            </div>
          )}

          <div className="pt-4 border-t">
            <Link href="/auth/signout" className="w-full">
              <Button variant="ghost" className="w-full">
                Sign out
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
