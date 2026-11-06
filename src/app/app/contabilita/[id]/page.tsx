import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionCard, btnDark, btnSecondary } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";
import { eur, shortDate } from "@/lib/format";
import { issueFiscalDocument, sendFiscalToSdiStub } from "@/lib/actions/accounting";

export default async function FiscalDocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orgId = primaryMembership(user)!.organizationId;
  const { id } = await params;

  const doc = await prisma.fiscalDocument.findFirst({
    where: { id, organizationId: orgId },
    include: { practice: true },
  });
  if (!doc) notFound();

  let sdiJson: unknown = null;
  if (doc.sdiResponseJson) {
    try {
      sdiJson = JSON.parse(doc.sdiResponseJson);
    } catch {
      sdiJson = doc.sdiResponseJson;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="74-ter"
        title={doc.number}
        description={`${doc.kind} · ${doc.customerName}`}
        backHref="/app/contabilita"
        backLabel="Contabilità"
        actions={
          <div className="flex flex-wrap gap-2">
            {doc.status === "DRAFT" ? (
              <form action={issueFiscalDocument}>
                <input type="hidden" name="documentId" value={doc.id} />
                <button className={btnDark}>Emetti</button>
              </form>
            ) : null}
            {doc.status === "ISSUED" || doc.status === "SENT_SDI_STUB" ? (
              <form action={sendFiscalToSdiStub}>
                <input type="hidden" name="documentId" value={doc.id} />
                <button className={btnSecondary}>Invia SdI (stub)</button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusPill>{doc.status}</StatusPill>
        <StatusPill>SdI {doc.sdiStatus}</StatusPill>
        <span className="text-sm text-slate-500">Emessa {shortDate(doc.issueDate)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Corrispettivi e costi">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Corrispettivo cliente</dt>
              <dd className="font-medium">{eur(doc.totalSell)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Costi servizi viaggio</dt>
              <dd className="font-medium">{eur(doc.totalCost)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt>Margine lordo</dt>
              <dd className="font-semibold">{eur(doc.totalSell - doc.totalCost)}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard title="IVA sul margine (74-ter)">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Base imponibile</dt>
              <dd className="font-medium">{eur(doc.marginBase)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Aliquota</dt>
              <dd className="font-medium">{doc.vatRate}%</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt>IVA</dt>
              <dd className="text-lg font-semibold text-[#0F3D3E]">{eur(doc.vatAmount)}</dd>
            </div>
          </dl>
          {doc.notes ? <p className="mt-3 text-xs text-slate-500">{doc.notes}</p> : null}
        </SectionCard>
      </div>

      {doc.practice ? (
        <SectionCard title="Pratica collegata">
          <p className="text-sm">
            <a href={`/app/pratiche/${doc.practice.id}`} className="font-medium text-teal-800 underline">
              {doc.practice.reference}
            </a>{" "}
            — {doc.practice.title}
          </p>
        </SectionCard>
      ) : null}

      {sdiJson ? (
        <SectionCard title="Risposta SdI stub" hint="Nessun certificato / API reale">
          <pre className="max-h-64 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">
            {JSON.stringify(sdiJson, null, 2)}
          </pre>
          {doc.sdiMessageId ? (
            <p className="mt-2 text-xs text-slate-500">MessageId demo: {doc.sdiMessageId}</p>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
