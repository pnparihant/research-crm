import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Setup2FAClient from "./Setup2FAClient";

export default async function Setup2FAPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  // Already set up — skip this page
  if (session.user.twoFactorEnabled) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }
  return <Setup2FAClient />;
}
