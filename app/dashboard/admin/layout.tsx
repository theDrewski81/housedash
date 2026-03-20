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
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) {
      redirect("/login");
    }
    redirect("/dashboard");
  }
  return <>{children}</>;
}
