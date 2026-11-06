export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,61,62,0.06)] backdrop-blur">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-teal-900/50">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-[#0F3D3E]">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}
