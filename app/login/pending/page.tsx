"use client";

import Link from "next/link";

export default function LoginPendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      <div className="z-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-white">
          Account pending approval
        </h1>
        <p className="text-gray-400 mb-6">
          Your account has been created and is waiting for an administrator to
          approve it. You will be able to sign in once approved.
        </p>
        <Link
          href="/login"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
