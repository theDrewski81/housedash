import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ isAdmin: false });
  }
  if (user.role === "admin") {
    return NextResponse.json({ isAdmin: true });
  }
  const userCount = await prisma.user.count();
  const isAdmin = userCount === 1;
  return NextResponse.json({ isAdmin });
}
