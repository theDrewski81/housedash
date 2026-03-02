import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ReactNode } from "react";

export default async function DashboardLayoutServer({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const status = (session.user as { status?: string })?.status;
  if (status === "pending_approval") {
    redirect("/login/pending");
  }
  return <>{children}</>;
}
