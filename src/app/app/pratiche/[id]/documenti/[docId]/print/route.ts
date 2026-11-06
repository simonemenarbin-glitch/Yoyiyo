import { NextResponse } from "next/server";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; docId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const membership = primaryMembership(user);
  if (!membership) return new NextResponse("Forbidden", { status: 403 });

  const { id, docId } = await ctx.params;
  const practice = await prisma.practice.findFirst({
    where: { id, organizationId: membership.organizationId },
    select: { id: true },
  });
  if (!practice) return new NextResponse("Not found", { status: 404 });

  const doc = await prisma.practiceDocument.findFirst({
    where: { id: docId, practiceId: practice.id },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(doc.bodyHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
