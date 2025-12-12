"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@repo/eden";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.auth.user.signup.post({
        email,
        name,
        password,
        confirmPassword,
      });
      if (res.status === 200) {
        toast.success("Signup Successful");
      } else {
        toast.error("Invalid credentials");
      }
    },
  });
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>Signup</CardHeader>
      <CardContent>
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
        <Button onClick={() => mutate()}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Signup
        </Button>
      </CardContent>
    </Card>
  );
}
