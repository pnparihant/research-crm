import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Setup2FAClient from "./Setup2FAClient";

export default async function Setup2FAPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");
  // Already set up — skip this page
  if (session.user.twoFactorEnabled) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }
  return <Setup2FAClient />;
}
