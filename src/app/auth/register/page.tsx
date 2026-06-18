import { redirect } from "next/navigation";

// Registration is disabled — users are created externally via scripts/seed-user.js
export default function RegisterPage() {
  redirect("/auth/login");
}
