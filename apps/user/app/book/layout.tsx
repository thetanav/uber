import api from "@repo/eden";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = (await cookies()).toString();
  const res = await api.user.get({
    headers: {
      cookie,
    },
  });
  if (!res.data) redirect("/");
  return children;
}
