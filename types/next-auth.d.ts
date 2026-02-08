import "next-auth";
import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole | null;
      status?: UserStatus | null;
    } & DefaultSession["user"];
  }
}
