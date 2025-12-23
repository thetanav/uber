import { Loader } from "lucide-react";
import { Button } from "./ui/button";
import { ReactNode } from "react";

export function MButton({
  mutation,
  children,
  className,
  variant,
}: {
  mutation: any;
  children: ReactNode;
  className?: string;
  variant?:
    | "link"
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | null;
}) {
  const { mutate, isPending } = mutation;
  return (
    <Button
      onClick={() => mutate()}
      disabled={isPending}
      variant={variant}
      className={
        className +
        " relative disabled:opacity-100 overflow-hidden cursor-pointer select-none"
      }>
      <div
        className={`absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center ${isPending ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"} transition-all duration-100 ease-in-out`}>
        <Loader className="animate-spin" />
      </div>

      <p
        className={
          (isPending
            ? "opacity-0 translate-y-5"
            : "opacity-100 translate-y-0") +
          " transition-all duration-100 ease-in-out"
        }>
        {children}
      </p>
    </Button>
  );
}
