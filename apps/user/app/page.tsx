import api from "@repo/eden";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function Home() {
  const cookie = (await cookies()).toString();
  const res = await api.user.get({
    headers: {
      cookie,
    },
  });

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Uber Clone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {res.data && (
            <>
              <p>{res.data.name}</p>
              <p>{res.data.email}</p>
              <p>{new Date(res.data.createdAt).toLocaleString()}</p>
            </>
          )}
          <div className="flex flex-col gap-2">
            {res.data ? (
              <>
                <Link href="/book" className="w-full">
                  <Button className="w-full">Book a Ride</Button>
                </Link>
                <Link href="/auth/signout" className="w-full">
                  <Button variant="ghost" className="w-full">
                    Sign out
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="w-full">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="w-full">
                  <Button variant="ghost" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
