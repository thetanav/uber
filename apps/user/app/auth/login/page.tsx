"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@repo/eden";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.auth.user.login.post({
        email,
        password,
      });
      if (res.status === 200) {
        toast.success("Login Successful");
        localStorage.setItem("token", res.data as string);
      } else {
        toast.error("Invalid credentials");
      }
    },
  });
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>Login</CardHeader>
      <CardContent>
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

        <Button onClick={() => mutate()}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Login
        </Button>
      </CardContent>
    </Card>
  );
}
