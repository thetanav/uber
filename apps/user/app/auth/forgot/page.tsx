"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MButton } from "@/components/mutation-button";
import api from "@repo/eden";

export default function Reset() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await api.auth.forgot.post({
        email,
      });
      if (res.status === 200) {
        toast.success("Email to reset is sent!");
        router.push("/");
      } else {
        toast.error("Email not found");
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <MButton mutation={forgotMutation} className="w-full">
            Send Reset Email
          </MButton>
          <div className="text-center text-sm">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
