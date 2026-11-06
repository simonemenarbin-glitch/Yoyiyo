import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PracticeDocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id, docId } = await params;

  const practice = await prisma.practice.findFirst({
    where: { id, organizationId: membership.organizationId },
    select: { id: true, reference: true },
  });
  if (!practice) notFound();

  const doc = await prisma.practiceDocument.findFirst({
    where: { id: docId, practiceId: practice.id },
  });
  if (!doc) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/app/pratiche/${practice.id}`} className="text-sm text-teal-800/70">
            ← Torna alla pratica {practice.reference}
          </Link>
          <h1
            className="mt-2 text-2xl text-[#0F3D3E]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {doc.title}
          </h1>
          <p className="text-sm text-slate-500">
            {doc.type} · generato {shortDate(doc.generatedAt)} · v{doc.version}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/app/pratiche/${practice.id}/documenti/${doc.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-[#0F3D3E] px-4 py-2.5 text-sm font-medium text-white"
          >
            Apri / stampa
          </a>
          <a
            href={`/app/pratiche/${practice.id}/documenti/${doc.id}/download`}
            className="rounded-xl border border-[#0F3D3E]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#0F3D3E]"
          >
            Scarica Word (.doc)
          </a>
        </div>
      </div>
      <iframe
        title={doc.title}
        className="min-h-[70vh] w-full rounded-2xl border border-teal-900/10 bg-white"
        srcDoc={doc.bodyHtml}
      />
    </div>
  );
}
