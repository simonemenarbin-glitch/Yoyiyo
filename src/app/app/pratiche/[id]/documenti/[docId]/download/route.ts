import { NextResponse } from "next/server";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Word-friendly download: HTML with Yoyiyo styles (#B33A2B) served as .doc.
 * Opens in Microsoft Word / LibreOffice without a native DOCX dependency.
 */
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
    select: { id: true, reference: true },
  });
  if (!practice) return new NextResponse("Not found", { status: 404 });

  const doc = await prisma.practiceDocument.findFirst({
    where: { id: docId, practiceId: practice.id },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const safeName = `${doc.type.toLowerCase()}-${practice.reference}-v${doc.version}`
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");

  // Word HTML envelope — preserves bordeaux titles when opened in Word.
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
</head>
<body>${doc.bodyHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}</body>
</html>`;

  return new NextResponse(wordHtml, {
    status: 200,
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.doc"`,
      "Cache-Control": "private, no-store",
    },
  });
}
