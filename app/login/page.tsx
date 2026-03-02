"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useIsTablet } from "@/lib/hooks/useIsTablet";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const isTablet = useIsTablet();
  const kioskAttempted = useRef(false);
  const errorParam = searchParams.get("error");
  const showAccountCreationDisabled =
    errorParam === "OAuthCreateAccount" || errorParam === "Callback";
  const showConfigError =
    errorParam === "OAuthCallback" || errorParam === "OAuthSignin";
  const showGenericError =
    !!errorParam &&
    !showAccountCreationDisabled &&
    !showConfigError;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    // Kiosk only on tablet; phones get standard mobile (Google sign-in only)
    if (!isTablet || kioskAttempted.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const kioskToken =
      urlParams.get("kiosk") ?? (typeof window !== "undefined" ? localStorage.getItem("kioskToken") : null);

    if (kioskToken) {
      kioskAttempted.current = true;
      // #region agent log
      fetch("/api/debug-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "98863f", location: "app/login/page.tsx", message: "kiosk signIn attempt", data: { tokenLen: kioskToken.length, isTablet }, timestamp: Date.now(), hypothesisId: "client" }),
      }).catch(() => {});
      fetch("/api/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "1bfcef", location: "app/login/page.tsx", message: "kiosk signIn attempt", data: { tokenLen: kioskToken.length, isTablet, hasKioskParam: !!urlParams.get("kiosk") }, timestamp: Date.now(), hypothesisId: "H5" }) }).catch(() => {});
      // #endregion
      signIn("kiosk", {
        token: kioskToken,
        callbackUrl: "/dashboard",
        redirect: true,
      }).then((res) => {
        if (res?.ok) {
          localStorage.setItem("kioskToken", kioskToken);
        }
      });
    }
  }, [isTablet]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Home Dashboard</h1>
        <div className="bg-gray-800 rounded-lg p-8">
          {showAccountCreationDisabled && (
            <p className="text-amber-400 text-sm mb-4 p-3 bg-amber-900/20 border border-amber-700 rounded">
              Sign-in failed. New accounts may not be accepted at this time. Contact an administrator if you need access.
            </p>
          )}
          {showConfigError && (
            <p className="text-amber-400 text-sm mb-4 p-3 bg-amber-900/20 border border-amber-700 rounded">
              Sign-in failed. Check NEXTAUTH_URL and proxy configuration (see
              README troubleshooting).
            </p>
          )}
          {showGenericError && (
            <p className="text-amber-400 text-sm mb-4 p-3 bg-amber-900/20 border border-amber-700 rounded">
              Sign-in failed. Please try again or contact an administrator.
            </p>
          )}
          <button
            onClick={() => {
              router.replace("/login");
              signIn("google", { callbackUrl: "/dashboard" });
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
          {isTablet && (
            <p className="text-sm text-gray-400 mt-4 text-center">
              Or use kiosk mode (tablet): open with <code className="text-gray-300">?kiosk=YOUR_TOKEN</code>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
        <div className="text-gray-400">Loading...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
