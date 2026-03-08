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
    const search = typeof window !== "undefined" ? window.location.search : "";
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
    const tabletMinWidth = 768;
    const meetsKioskRequirements = viewportW >= tabletMinWidth;
    // #region agent log
    if (search.includes("kiosk=") || search.includes("kiosk")) {
      const payload = {
        sessionId: "146b76",
        location: "app/login/page.tsx:useEffect",
        message: "effect run",
        data: {
          viewportWidth: viewportW,
          viewportHeight: viewportH,
          meetsKioskRequirements,
          tabletMinWidth,
          isTablet,
          kioskAttempted: kioskAttempted.current,
          search: search.slice(0, 80),
        },
        hypothesisId: "H3",
        timestamp: Date.now(),
      };
      fetch("/api/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
      fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "146b76" }, body: JSON.stringify(payload) }).catch(() => {});
    }
    // #endregion
    // Kiosk only on tablet; phones get standard mobile (Google sign-in only)
    if (!isTablet || kioskAttempted.current) return;

    // URLSearchParams decodes + as space; base64 tokens often contain +. Parse manually.
    let kioskToken: string | null = null;
    const queryString = search ? search.slice(1) : "";
    if (queryString) {
      for (const pair of queryString.split("&")) {
        const eq = pair.indexOf("=");
        if (eq > 0 && pair.slice(0, eq) === "kiosk") {
          kioskToken = decodeURIComponent(pair.slice(eq + 1));
          break;
        }
      }
    }
    if (!kioskToken && typeof window !== "undefined") {
      kioskToken = localStorage.getItem("kioskToken");
    }

    if (kioskToken) {
      kioskAttempted.current = true;
      const tokenForForm = encodeURIComponent(kioskToken);
      // #region agent log
      const beforePayload = {
        sessionId: "146b76",
        location: "app/login/page.tsx:useEffect",
        message: "before signIn",
        data: {
          viewportWidth: viewportW,
          viewportHeight: viewportH,
          meetsKioskRequirements,
          tabletMinWidth,
          isTablet,
          kioskTokenLen: kioskToken?.length,
          tokenForFormLen: tokenForForm?.length,
        },
        hypothesisId: "H1,H3",
        timestamp: Date.now(),
      };
      fetch("/api/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(beforePayload) }).catch(() => {});
      fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "146b76" }, body: JSON.stringify(beforePayload) }).catch(() => {});
      // #endregion
      signIn("kiosk", {
        token: tokenForForm,
        callbackUrl: "/dashboard",
        redirect: true,
      }).then((res) => {
        // #region agent log
        const resPayload = { sessionId: "146b76", location: "app/login/page.tsx:signIn.then", message: "signIn result", data: { ok: res?.ok, error: res?.error, status: res?.status, url: res?.url?.slice(0, 60) }, hypothesisId: "H4,H5", timestamp: Date.now() };
        fetch("/api/debug-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resPayload) }).catch(() => {});
        fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "146b76" }, body: JSON.stringify(resPayload) }).catch(() => {});
        // #endregion
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
