import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "user" | "admin" | "master_admin";
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
  }
}
