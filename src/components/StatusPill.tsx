export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#0F3D3E]/10 px-2.5 py-1 text-xs font-medium text-[#0F3D3E]">
      {children}
    </span>
  );
}
