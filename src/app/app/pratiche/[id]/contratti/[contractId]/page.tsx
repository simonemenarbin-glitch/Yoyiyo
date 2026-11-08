import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, primaryMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import {
  cancelContract,
  sendContractForSignature,
} from "@/lib/actions/contracts";
import { contractStatusLabel } from "@/lib/practices/contract";
import { shortDate } from "@/lib/format";
import {
  FlashOk,
  PageHeader,
  SectionCard,
  btnPrimary,
  btnSecondary,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PracticeContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; contractId: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = primaryMembership(user)!;
  const { id, contractId } = await params;
  const sp = await searchParams;

  const contract = await prisma.practiceContract.findFirst({
    where: {
      id: contractId,
      practiceId: id,
      organizationId: membership.organizationId,
    },
    include: { practice: true, quote: true },
  });
  if (!contract) notFound();

  const publicUrl = `/firma/${contract.signToken}`;

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/app/pratiche/${id}`}
        backLabel="Pratica"
        title={contract.title}
        description={`v${contract.version} · ${contract.practice.reference}`}
        actions={
          <>
            <a href={publicUrl} target="_blank" rel="noreferrer" className={btnSecondary}>
              Link firma
            </a>
            {(contract.status === "DRAFT" || contract.status === "SENT" || contract.status === "VIEWED") && (
              <form action={sendContractForSignature}>
                <input type="hidden" name="id" value={contract.id} />
                <button className={btnPrimary}>
                  {contract.status === "DRAFT" ? "Invia per firma" : "Reinvia link firma"}
                </button>
              </form>
            )}
          </>
        }
      />

      {sp.sent ? (
        <FlashOk>
          Link di firma pronto. Condividi{" "}
          <a href={publicUrl} className="font-semibold underline">
            {publicUrl}
          </a>
        </FlashOk>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <StatusPill>{contractStatusLabel[contract.status]}</StatusPill>
        {contract.signerName ? <span className="text-sm text-slate-600">{contract.signerName}</span> : null}
        {contract.signerEmail ? <span className="text-sm text-slate-500">{contract.signerEmail}</span> : null}
        {contract.providerRef ? (
          <span className="font-mono text-xs text-slate-400">{contract.providerRef}</span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-teal-900/10 bg-white p-3 text-sm">
          <div className="text-xs uppercase text-slate-400">Inviato</div>
          <div>{contract.sentAt ? shortDate(contract.sentAt) : "—"}</div>
        </div>
        <div className="rounded-xl border border-teal-900/10 bg-white p-3 text-sm">
          <div className="text-xs uppercase text-slate-400">Visualizzato</div>
          <div>{contract.viewedAt ? shortDate(contract.viewedAt) : "—"}</div>
        </div>
        <div className="rounded-xl border border-teal-900/10 bg-white p-3 text-sm">
          <div className="text-xs uppercase text-slate-400">Firmato</div>
          <div>{contract.signedAt ? shortDate(contract.signedAt) : "—"}</div>
        </div>
        <div className="rounded-xl border border-teal-900/10 bg-white p-3 text-sm">
          <div className="text-xs uppercase text-slate-400">Preventivo</div>
          <div>
            {contract.quote ? (
              <Link href={`/app/preventivi/${contract.quote.id}`} className="text-[#B33A2B]">
                {contract.quote.number}
              </Link>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <SectionCard title="Anteprima contratto (HTML / stampa → PDF)">
        <iframe
          title="Contratto"
          srcDoc={contract.bodyHtml}
          className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
        />
        <p className="mt-2 text-xs text-slate-500">
          Stampa dal browser per Word/PDF. Nessun secret o provider e-sign live.
        </p>
      </SectionCard>

      {contract.status !== "SIGNED" && contract.status !== "CANCELLED" ? (
        <form action={cancelContract}>
          <input type="hidden" name="id" value={contract.id} />
          <button className={btnSecondary}>Annulla contratto</button>
        </form>
      ) : null}
    </div>
  );
}
