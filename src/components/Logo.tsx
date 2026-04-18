import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl glass-strong">
        <Scissors className="h-4 w-4 text-foreground" strokeWidth={2.2} />
        <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "var(--shadow-glow)" }} />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Tijera<span className="text-muted-foreground">.ai</span>
      </span>
    </Link>
  );
}
