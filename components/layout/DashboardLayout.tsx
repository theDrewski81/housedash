"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { AppSession } from "@/lib/session";
import HourlyPageRefresh from "@/components/layout/HourlyPageRefresh";

interface DashboardLayoutProps {
  children: ReactNode;
  /** When provided (e.g. from server layout for kiosk), used instead of useSession so kiosk users see the header and can sign out. */
  session?: AppSession | null;
}

function useIsStandaloneOrFullscreen(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqStandalone = window.matchMedia("(display-mode: standalone)");
    const mqFullscreen = window.matchMedia("(display-mode: fullscreen)");
    const check = () => setValue(mqStandalone.matches || mqFullscreen.matches);
    check();
    mqStandalone.addEventListener("change", check);
    mqFullscreen.addEventListener("change", check);
    return () => {
      mqStandalone.removeEventListener("change", check);
      mqFullscreen.removeEventListener("change", check);
    };
  }, []);
  return value;
}

export default function DashboardLayout({ children, session: sessionProp }: DashboardLayoutProps) {
  const { data: nextAuthSession, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const session = sessionProp ?? nextAuthSession;
  const isOnSettings =
    pathname?.startsWith("/dashboard/admin/") ?? false;
  const isAdmin = session?.user?.role === "admin";
  const isKiosk = session != null && "isKiosk" in session && (session as AppSession).isKiosk === true;
  const isStandaloneOrFullscreen = useIsStandaloneOrFullscreen();
  const [kioskHintDismissed, setKioskHintDismissed] = useState(false);
  const showKioskInstallHint = isKiosk && !isStandaloneOrFullscreen && !kioskHintDismissed;

  if (sessionProp === undefined && status === "loading") {
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

  const handleSignOut = () => {
    if (isKiosk) {
      fetch("/api/auth/kiosk-signout", { method: "POST", credentials: "include" })
        .then(() => router.push("/login"))
        .catch(() => router.push("/login"));
    } else {
      signOut({ callbackUrl: "/login" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900" data-dashboard-layout="with-admin-nav">
      <HourlyPageRefresh />
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              {isAdmin ? (
                <Link
                  href={isOnSettings ? "/dashboard" : "/dashboard/admin/settings"}
                  className="text-2xl font-bold text-white hover:text-gray-200"
                >
                  {isOnSettings ? "Dashboard" : "Settings"}
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-2xl font-bold text-white hover:text-gray-200"
                >
                  Home Dashboard
                </Link>
              )}
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
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      {showKioskInstallHint && (
        <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-amber-200 text-sm">
            For full-screen kiosk (no browser bar): add this app to your home screen, then open it from there.
          </p>
          <button
            type="button"
            onClick={() => setKioskHintDismissed(true)}
            className="text-amber-400 hover:text-amber-200 text-sm shrink-0"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
