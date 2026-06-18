import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  if (session.user.role === "master_admin") redirect("/master-admin");
  if (session.user.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
