import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Marks a visitor as having left — the second half of the sign-in book
// entry. Anyone signed in can do this, same reasoning as POST /api/visitors.
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  if (!visitor) return NextResponse.json({ message: "Visitor not found" }, { status: 404 });
  if (visitor.timeOut) {
    return NextResponse.json({ message: "This visitor is already signed out." }, { status: 409 });
  }

  const updated = await prisma.visitor.update({
    where: { id },
    data: { timeOut: new Date() },
  });

  return NextResponse.json(updated);
}
