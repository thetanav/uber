"use client";

import { Input } from "@/components/ui/input";
import { useState, Suspense } from "react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import api from "@repo/eden";

function ResetForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [token] = useQueryState("token");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.auth.reset.post(
        {
          password: newPassword,
        },
        {
          query: {
            token,
          },
        },
      );
      if (res.status === 200) {
        toast.success("Password updated successfully");
        router.push("/auth/login");
      } else {
        toast.error("An error occurred");
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            onClick={() => mutate()}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Reset Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reset() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
