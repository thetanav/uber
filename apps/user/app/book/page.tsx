"use client";

import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle,
  LocationEdit,
  MapPin,
  Navigation,
  Pen,
  Pencil,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import UserInfo from "@/components/user";
import { LocationDialog } from "@/components/location-picker";
import { MButton } from "@/components/mutation-button";
import api from "@repo/eden";
import { useRouter } from "next/navigation";
import MapComp from "@/components/map";

export default function Book() {
  const router = useRouter();
  const [select, setSelect] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const [choose, setChoose] = useState(true); // set origin
  const [origin, setOrigin] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  }>();
  const [destination, setDestination] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  }>();

  const { data: expectedPrice } = useQuery({
    queryKey: ["price", origin, destination, select],
    queryFn: async () => {
      if (origin === undefined || destination === undefined) return;
      const res = await api.price.post({
        origin,
        destination,
        capacity: select,
      });
      if (res.status === 200) {
        return res.data?.price;
      }
      throw new Error("Failed to fetch price");
    },
    enabled: !!origin && !!destination,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          name: "Your Location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setOrigin(location);
        console.log("User location set:", location);
      },
      (err) => {
        console.error("Geolocation error:", err.message);
        toast.error(
          "Unable to get your location. Please enable location permissions."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (origin === undefined || destination === undefined) return;
      const res = await api.user.request.post({
        origin,
        destination,
        capacity: select,
      });
      if (res.status === 200) {
        router.push(`/book/${res.data?.id}`);
        toast.success("Trip Requested");
      } else {
        console.log(res.data);
        toast.error("Invalid request");
      }
    },
  });
  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Plan your ride</h1>
      <div>
        <UserInfo />

        <div className="divide-y border rounded-xl shadow">
          <div className="flex gap-2 items-center justify-center px-4 py-3">
            <MapPin className="w-6 h-6 text-muted-foreground" />
            <h2 className="px-2 py-1 w-full">
              {origin?.name || "From Where?"}
            </h2>
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              className="text-muted-foreground"
              onClick={() => {
                setOpen(true);
                setChoose(true);
              }}>
              <Pencil />
            </Button>
          </div>
          <div className="flex gap-2 items-center justify-center px-4 py-3">
            <Navigation className="w-6 h-6 text-muted-foreground" />
            <h2 className="px-2 py-1 w-full">
              {destination?.name || "From Where?"}
            </h2>
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              className="text-muted-foreground"
              onClick={() => {
                setOpen(true);
                setChoose(false);
              }}>
              <Pencil />
            </Button>
          </div>
        </div>

        <LocationDialog
          origin={origin}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          setOrigin={setOrigin}
          setDestination={setDestination}
          choose={choose}
        />

        {origin && destination && (
          <div className="mt-8 border rounded-lg overflow-hidden">
            <MapComp origin={origin} destination={destination} />
          </div>
        )}

        <div className="my-8">
          {expectedPrice && (
            <h1 className="text-xl font-bold mb-3">
              Estimated price ${expectedPrice.toFixed(2)}
            </h1>
          )}
          <div className="space-y-4">
            <VehicleSelect
              capacity={1}
              src="https://img.icons8.com/ios-filled/100/motorcycle.png"
              name="Bike"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              capacity={2}
              src="https://img.icons8.com/ios-filled/100/fiat-500.png"
              name="Auto"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              capacity={3}
              src="https://img.icons8.com/ios-filled/100/hatchback.png"
              name="Hatchback"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              capacity={4}
              src="https://img.icons8.com/ios-filled/100/sedan.png"
              name="Sedan"
              select={select}
              setSelect={setSelect}
            />
          </div>
        </div>
      </div>
      <div className="mt-4">
        <MButton mutation={mutation}>Find Drivers</MButton>
      </div>
    </div>
  );
}

const VehicleSelect = ({ src, name, select, setSelect, capacity }: any) => {
  return (
    <Card
      className={`cursor-pointer select-none transition-all ${select == capacity ? "ring-2 ring-primary border-primary" : ""}`}
      onClick={() => {
        setSelect(capacity);
      }}>
      <CardContent className="px-6">
        <div className="flex items-center gap-3">
          <img
            src={src}
            className="w-12 h-12 rounded-lg bg-blue-100 p-2"
            alt={name}
          />
          <div className="flex-1">
            <h4 className="font-semibold">{name}</h4>
            <p className="text-sm text-muted-foreground">
              Capacity: {capacity}
            </p>
          </div>
          {select == capacity && (
            <div>
              <Check className="w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
