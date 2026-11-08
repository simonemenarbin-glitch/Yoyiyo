import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  declineContractStub,
  markContractViewed,
  signContractStub,
} from "@/lib/actions/contracts";
import { contractStatusLabel } from "@/lib/practices/contract";
import { ensureDatabase } from "@/lib/bootstrap-db";

export const dynamic = "force-dynamic";

export default async function PublicSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await ensureDatabase();
  const { token } = await params;
  const sp = await searchParams;

  if (token === "invalid") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl text-[#0F3D3E]">Link non valido</h1>
      </main>
    );
  }

  await markContractViewed(token);
  const contract = await prisma.practiceContract.findFirst({
    where: { signToken: token },
    include: { practice: { include: { brand: true } } },
  });
  if (!contract) notFound();

  const brand = contract.practice.brand?.name || "Yoyiyo";
  const locked = ["SIGNED", "DECLINED", "CANCELLED", "EXPIRED"].includes(contract.status);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ef,#eef3f2)] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <div className="text-sm uppercase tracking-[0.18em] text-teal-900/50">{brand}</div>
          <h1
            className="mt-2 text-3xl text-[#0F3D3E]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Firma contratto
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {contract.title} · stato {contractStatusLabel[contract.status]}
          </p>
        </header>

        {sp.signed ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Contratto firmato in sandbox. Grazie.
          </div>
        ) : null}
        {sp.declined ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            Contratto rifiutato.
          </div>
        ) : null}
        {sp.err ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            Spunta l’accettazione e digita il nome.
          </div>
        ) : null}
        {sp.already ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            Già firmato.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-sm">
          <iframe
            title="Contratto"
            srcDoc={contract.bodyHtml}
            className="h-[55vh] w-full border-0"
          />
        </div>

        {!locked ? (
          <div className="rounded-2xl border border-teal-900/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0F3D3E]">Firma elettronica (stub)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Nessun provider live (DocuSign/Yousign). Digita il nome per simulare la firma.
            </p>
            <form action={signContractStub} className="mt-4 space-y-3">
              <input type="hidden" name="token" value={token} />
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">Nome e cognome</span>
                <input
                  name="typedName"
                  required
                  defaultValue={contract.signerName || ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="accept" value="1" className="mt-1" required />
                <span>Ho letto e accetto il contratto e le penali indicate.</span>
              </label>
              <button className="inline-flex min-h-11 items-center rounded-xl bg-[#B33A2B] px-5 py-2.5 text-sm font-semibold text-white">
                Firma ora
              </button>
            </form>
            <form action={declineContractStub} className="mt-3">
              <input type="hidden" name="token" value={token} />
              <button className="text-sm text-slate-500 underline">Rifiuta</button>
            </form>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500">
            Questo link non accetta altre firme ({contractStatusLabel[contract.status]}).
          </p>
        )}
      </div>
    </main>
  );
}
