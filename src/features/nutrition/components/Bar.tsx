export function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  const p = Math.min(100, Math.max(0, (value / target) * 100)) || 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-steel/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  );
}
