import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (session.user.role === "master_admin") redirect("/master-admin");
  if (session.user.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
