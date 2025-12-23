"use client";

import { MButton } from "@/components/mutation-button";
import { useMutation } from "@tanstack/react-query";

export default function Page() {
  const mutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return "success";
    },
    onSuccess: () => {
      console.log("mutation success");
    },
  });
  return (
    <div className="p-8">
      <h2>Mutation Button</h2>
      <MButton mutation={mutation}>Click me</MButton>
    </div>
  );
}
