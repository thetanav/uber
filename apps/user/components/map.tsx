"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, memo, useState } from "react";
import { Map, MapMarker, MapRoute, MarkerContent, MarkerLabel } from "./ui/map";

export default function MapComp({
  origin,
  destination,
  captainLocation,
}: {
  origin: any;
  destination: any;
  captainLocation?: [number, number] | null;
}) {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRoute() {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (data.routes?.[0]?.geometry?.coordinates) {
          setRoute(data.routes[0].geometry.coordinates);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoute();
  }, []);

  return (
    <div className="h-[400px] w-full relative">
      <Map center={[origin.longitude, origin.latitude]} zoom={12.5}>
        {route && (
          <MapRoute
            coordinates={route}
            color="#6366f1"
            width={5}
            opacity={0.85}
          />
        )}

        <MapMarker longitude={origin.longitude} latitude={origin.latitude}>
          <MarkerContent>
            <div className="size-5 rounded-full bg-green-500 border-2 border-white shadow-lg" />
            <MarkerLabel
              position="bottom"
              className="text-xs px-2 py-1 border rounded-md bg-white opacity-80">
              {origin.name.substring(0, 20)}
            </MarkerLabel>
          </MarkerContent>
        </MapMarker>

        <MapMarker
          longitude={destination.longitude}
          latitude={destination.latitude}>
          <MarkerContent>
            <div className="size-5 rounded-full bg-red-500 border-2 border-white shadow-lg" />
            <MarkerLabel
              position="bottom"
              className="text-xs px-2 py-1 border rounded-md bg-white opacity-80">
              {destination.name.substring(0, 20)}
            </MarkerLabel>
          </MarkerContent>
        </MapMarker>
      </Map>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
