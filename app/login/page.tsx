"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check for kiosk token in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const kioskToken = urlParams.get("kiosk") || localStorage.getItem("kioskToken");

    if (kioskToken) {
      handleKioskLogin(kioskToken);
    }
  }, []);

  const handleKioskLogin = async (token: string) => {
    try {
      const response = await fetch("/api/auth/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        localStorage.setItem("kioskToken", token);
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Kiosk login failed:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Home Dashboard</h1>
        <div className="bg-gray-800 rounded-lg p-8">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Or use kiosk mode for tablet access
          </p>
        </div>
      </div>
    </main>
  );
}
