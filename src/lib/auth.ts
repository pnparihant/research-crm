import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log(`[auth] authorize — email=${credentials?.email}`);
        if (!credentials?.email || !credentials?.password) {
          console.log("[auth] authorize FAIL — missing credentials");
          return null;
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user) {
          console.log(`[auth] authorize FAIL — user not found, email=${credentials.email}`);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          console.log(`[auth] authorize FAIL — wrong password, email=${credentials.email}`);
          return null;
        }

        console.log(`[auth] authorize OK — email=${user.email} role=${user.role} 2fa=${user.twoFactorEnabled}`);
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role ?? "user",
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        console.log(`[auth] jwt callback — new session for email=${user.email} role=${(user as { role?: string }).role}`);
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false;
        token.twoFactorVerified = false;
      }
      if (trigger === "update" && session?.twoFactorVerified) {
        console.log(`[auth] jwt callback — 2FA verified update for token id=${token.id}`);
        token.twoFactorVerified = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "user" | "admin" | "master_admin";
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.twoFactorVerified = token.twoFactorVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
