"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's missing default icon issue
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

export default function Map({
  from,
  to,
}: {
  from: [number, number];
  to: [number, number];
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  //@ts-ignore
  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current).setView(from, 13);

    // Tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Fetch and draw route
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!data.routes?.length) return;

        const route = data.routes[0].geometry.coordinates;
        const latlngs = route.map(([lng, lat]: number[]) => [lat, lng]);

        const line = L.polyline(latlngs, { color: "blue", weight: 5 }).addTo(
          map
        );

        L.marker(from).addTo(map);
        L.marker(to).addTo(map);

        map.fitBounds(line.getBounds());
      })
      .catch((err) => console.log("OSRM ERROR", err));

    return () => map.remove();
  }, [from, to]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "100%",
        width: "100%",
        minHeight: "400px", // Force height so map is visible
      }}
    />
  );
}
