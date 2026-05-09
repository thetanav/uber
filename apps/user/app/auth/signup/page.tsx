"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@repo/eden";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { MButton } from "@/components/mutation-button";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.auth.signup.post({
        role: "user",
        email,
        name,
        password,
        confirmPassword,
      });
      console.log(res.data);
      if (res.status === 200) {
        toast.success("Signup Successful");
      } else {
        toast.error(res.data.summary || "Unkown error!");
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign Up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
          />
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm Password"
          />
          <MButton mutation={mutation} className="w-full">
            Sign Up
          </MButton>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
