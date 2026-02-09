"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900" data-dashboard-layout="with-admin-nav">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white hover:text-gray-200"
              >
                Home Dashboard
              </Link>
              <nav className="flex items-center gap-4" aria-label="Admin">
                <Link
                  href="/dashboard/admin/users"
                  className={`text-sm font-medium ${
                    pathname?.startsWith("/dashboard/admin/users")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  User management
                </Link>
                <Link
                  href="/dashboard/admin/logs"
                  className={`text-sm font-medium ${
                    pathname?.startsWith("/dashboard/admin/logs")
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Logs
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-gray-300">{session.user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
