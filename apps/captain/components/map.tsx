"use client";

import { useEffect, useRef, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

function Map({
  from,
  to,
  captainLocation,
}: {
  from: [number, number];
  to: [number, number];
  captainLocation?: [number, number] | null;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const captainMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(from, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.routes?.length || !map) return;

        const route = data.routes[0].geometry.coordinates;
        const latlngs = route.map(([lng, lat]: number[]) => [lat, lng]);

        const line = L.polyline(latlngs, { color: "blue", weight: 5 }).addTo(
          map,
        );
        routeLineRef.current = line;

        const originMarker = L.marker(from).addTo(map);
        const destMarker = L.marker(to).addTo(map);
        markersRef.current = [originMarker, destMarker];

        map.fitBounds(line.getBounds());
      })
      .catch((err) => console.log("OSRM ERROR", err));
  }, [from, to]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (captainMarkerRef.current) {
      captainMarkerRef.current.remove();
      captainMarkerRef.current = null;
    }

    if (captainLocation) {
      const captainIcon = L.divIcon({
        html: '<div style="background-color: #10b981; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
        className: "",
        iconSize: [25, 25],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(captainLocation, { icon: captainIcon }).addTo(
        map,
      );
      captainMarkerRef.current = marker;
    }
  }, [captainLocation]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "100%",
        width: "100%",
        minHeight: "400px",
      }}
    />
  );
}

export default memo(Map, (prevProps, nextProps) => {
  const sameOriginDest =
    prevProps.from[0] === nextProps.from[0] &&
    prevProps.from[1] === nextProps.from[1] &&
    prevProps.to[0] === nextProps.to[0] &&
    prevProps.to[1] === nextProps.to[1];

  const sameCaptainLocation =
    (!prevProps.captainLocation && !nextProps.captainLocation) ||
    (!!prevProps.captainLocation &&
      !!nextProps.captainLocation &&
      prevProps.captainLocation[0] === nextProps.captainLocation[0] &&
      prevProps.captainLocation[1] === nextProps.captainLocation[1]);

  return sameOriginDest && sameCaptainLocation;
});
