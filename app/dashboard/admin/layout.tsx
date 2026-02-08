import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
