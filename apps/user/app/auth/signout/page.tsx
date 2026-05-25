"use client";

import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.get("/auth/logout");
      if (res.status !== 200) {
        throw new Error("Failed to sign out");
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Successfully signed out");
      router.push("/auth/signin");
    },
    onError: () => {
      toast.error("There was an error signing out");
      router.push("/auth/signin");
    },
  });

  useEffect(() => {
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Signing you out...</p>
      </div>
    </div>
  );
}
