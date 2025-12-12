import api from "@repo/eden";

export default async function Home() {
  const message = await api.get();

  return <main>{message.data}</main>;
}
