import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  DollarSign,
  MapPin,
  Shield,
  Smartphone,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: MapPin,
    title: "Real-time tracking",
    description: "Track your ride live with accurate ETA and driver location",
  },
  {
    icon: Shield,
    title: "Safe rides",
    description:
      "Verified drivers and background checks for your peace of mind",
  },
  {
    icon: Clock,
    title: "Fast pickup",
    description: "Get matched with nearby drivers in minutes",
  },
  {
    icon: DollarSign,
    title: "Transparent pricing",
    description: "See estimated fares upfront with no hidden charges",
  },
  {
    icon: Star,
    title: "Rate your ride",
    description: "Rate drivers and help us maintain quality service",
  },
  {
    icon: Smartphone,
    title: "Easy payments",
    description: "Pay seamlessly with multiple payment options",
  },
];

export default function Home() {
  return (
    <main className="p-4">
      <nav className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Uber</h1>
        <div className="flex gap-2">
          <Link href="/auth/signin">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="default">Sign Up</Button>
          </Link>
        </div>
      </nav>
      <section className="px-6 py-16 mx-auto grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">
        <div className="space-y-6">
          <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
            Get where you're going
          </h2>
          <p className="text-xl text-muted-foreground">
            Request a ride, hop in, and go. Your destination is just a tap away.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-md aspect-square bg-gradient-to-br from-accent to-muted rounded-3xl flex items-center justify-center">
            <MapPin className="size-24 text-primary opacity-50" />
          </div>
        </div>
      </section>
      <section className="px-6 py-16 bg-accent/30">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">
            Why choose Uber?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="bg-card border-none shadow-sm"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-16 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h3 className="text-3xl font-bold">Ready to ride?</h3>
          <p className="text-xl text-muted-foreground">
            Join millions of riders who trust Uber to get them where they need
            to go.
          </p>
          <Link href="/auth/signup" className="inline-block">
            <Button size="lg" className="gap-2">
              Create Account <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
      <footer className="px-6 py-8 border-t">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Uber Clone. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/auth/forgot" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/auth/forgot" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/auth/forgot" className="hover:text-foreground">
              Help
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
