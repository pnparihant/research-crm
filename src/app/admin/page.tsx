import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return <AdminDashboard session={session} />;
}
