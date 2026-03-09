import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ReactNode } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function DashboardLayoutServer({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const status = (session.user as { status?: string })?.status;
  if (status === "pending_approval") {
    redirect("/login/pending");
  }
  return <DashboardLayout session={session}>{children}</DashboardLayout>;
}
