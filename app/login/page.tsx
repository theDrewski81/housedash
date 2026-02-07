"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useIsTablet } from "@/lib/hooks/useIsTablet";

export default function LoginPage() {
  const router = useRouter();
  const isTablet = useIsTablet();
  const kioskAttempted = useRef(false);

  useEffect(() => {
    // Kiosk only on tablet; phones get standard mobile (Google sign-in only)
    if (!isTablet || kioskAttempted.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const kioskToken =
      urlParams.get("kiosk") ?? (typeof window !== "undefined" ? localStorage.getItem("kioskToken") : null);

    if (kioskToken) {
      kioskAttempted.current = true;
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
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
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
