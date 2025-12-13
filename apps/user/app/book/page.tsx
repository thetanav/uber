"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@repo/eden";
import { useMutation } from "@tanstack/react-query";
import { LocationEdit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import UserInfo from "@/components/user";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

export default function Book() {
  const [select, setSelect] = useState("Bike");
  const { mutate: requestTrip } = useMutation({
    mutationFn: async () => {
      const res = await api.user.request.post({
        origin: {
          name: "San Francisco",
          latitude: 37.7749295,
          longitude: -122.4194155,
        },
        destination: {
          name: "San Francisco",
          latitude: 37.7749295,
          longitude: -122.4194155,
        },
        capacity: 2,
      });
      if (res.status === 200) {
        toast.success("Trip Requested");
      } else {
        toast.error("Invalid request");
      }
    },
  });
  return (
    <Card className="max-w-xl mx-auto mt-4">
      <CardHeader className="text-xl font-bold">Plan your ride</CardHeader>
      <CardContent>
        <div>
          <UserInfo />
        </div>
        <div className="space-y-1">
          <div className="flex gap-2">
            <Input type="text" placeholder="Enter pickup location" />
            <Button>
              <LocationEdit />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input type="text" placeholder="Where to?" />
            <Button>
              <LocationEdit />
            </Button>
          </div>
        </div>
        <div className="mt-8 border rounded-lg overflow-hidden">
          <Map from={[12.9716, 77.5946]} to={[12.935, 77.62]} />
        </div>
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-3">Choose a Ride</h3>
          <div className="space-y-2">
            <VehicleSelect
              src="https://img.icons8.com/ios-filled/100/motorcycle.png"
              name="Bike"
              price="1x"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              src="https://img.icons8.com/ios-filled/100/fiat-500.png
"
              name="Auto"
              price="3x"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              src="https://img.icons8.com/ios-filled/100/hatchback.png"
              name="Hatchback"
              price="4x"
              select={select}
              setSelect={setSelect}
            />
            <VehicleSelect
              src="https://img.icons8.com/ios-filled/100/sedan.png"
              name="Sedan"
              price="5x"
              select={select}
              setSelect={setSelect}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  );
}

const VehicleSelect = ({ src, name, price, select, setSelect }: any) => {
  return (
    <div
      className={`border p-3 rounded-md shadow flex transition cursor-pointer gap-3 ${select == name && "ring-3 ring-primary bg-accent"}`}
      onClick={() => setSelect(name)}>
      <img
        src={src}
        className="p-2 w-12 h-12 bg-blue-200 rounded-xl select-none pointer-events-none"
      />
      <div className="flex-2">
        <h4 className="text-lg">{name}</h4>
      </div>
      <div className="flex items-center justify-center">
        <p className="text-green-600 text-lg font-bold">${price}</p>
      </div>
    </div>
  );
};
