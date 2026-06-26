import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return <DashboardClient session={session} />;
}
