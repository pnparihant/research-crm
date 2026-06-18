import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import MasterAdminDashboard from "@/components/master-admin/MasterAdminDashboard";

export default async function MasterAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  if (session.user.role !== "master_admin") redirect("/");
  return <MasterAdminDashboard session={session} />;
}
