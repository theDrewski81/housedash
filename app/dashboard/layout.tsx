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
  // #region agent log
  const payload = { hypothesisId: "H2,H3", location: "app/dashboard/layout.tsx", message: "dashboard layout getServerSession", data: { hasSession: !!session, userId: session?.user?.id ?? null }, timestamp: Date.now() };
  fetch("http://127.0.0.1:7242/ingest/6192d96a-a422-4919-bc86-ce84fa9cdc63", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
  console.log("[DEBUG]", JSON.stringify(payload));
  // #endregion
  if (!session) {
    redirect("/login");
  }
  return <>{children}</>;
}
