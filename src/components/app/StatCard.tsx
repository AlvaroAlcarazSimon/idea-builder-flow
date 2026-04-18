import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  hint?: string;
}) {
  return (
    <div className="group rounded-2xl glass-panel p-5 hover-lift">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/10">
          <Icon className="h-4 w-4" />
        </span>
        {trend && <span className="text-xs text-success">{trend}</span>}
      </div>
      <div className="mt-4 font-display text-3xl font-semibold">{value}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
