import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Users, MessageSquareText, TrendingUp, Plus, Bot } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge, ChannelBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { appointments, services, barbers, conversations } from "@/lib/mockData";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter((a) => a.date === today);
  const ingresos = todayAppts.filter((a) => a.status === "completada" || a.status === "confirmada").reduce((s, a) => s + a.price, 0);
  const iaCount = todayAppts.filter((a) => a.channel.startsWith("ia")).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Buenas tardes, Iván 👋"
        subtitle="Esto es lo que está pasando hoy en tu barbería."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" /> Nueva cita
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Citas hoy" value={todayAppts.length} trend="+18% vs ayer" />
        <StatCard icon={Bot} label="Atendidas por IA" value={iaCount} trend={`${Math.round((iaCount / Math.max(1, todayAppts.length)) * 100)}%`} hint="WhatsApp + llamadas" />
        <StatCard icon={TrendingUp} label="Ingresos previstos" value={`${ingresos}€`} trend="+12%" />
        <StatCard icon={Users} label="Clientes únicos" value={new Set(todayAppts.map((a) => a.clientName)).size} hint="Hoy" />
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {/* Today's appts */}
        <div className="lg:col-span-2 rounded-2xl glass-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Próximas citas</h3>
              <p className="text-xs text-muted-foreground">{todayAppts.length} citas para hoy</p>
            </div>
            <Button variant="ghost" size="sm">Ver calendario</Button>
          </div>
          <ul className="space-y-2">
            {todayAppts.map((a) => {
              const svc = services.find((s) => s.id === a.serviceId)!;
              const barber = barbers.find((b) => b.id === a.barberId)!;
              return (
                <li key={a.id} className="flex items-center gap-4 rounded-xl border border-border bg-background/40 px-4 py-3 transition-colors hover:bg-background/60">
                  <span className="font-mono text-sm text-muted-foreground w-12">{a.start}</span>
                  <span className="h-8 w-1 rounded-full" style={{ backgroundColor: svc.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.clientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{svc.name} · {svc.duration} min</p>
                  </div>
                  <span className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold">{barber.initials}</span>
                  <StatusBadge status={a.status} />
                  <span className="hidden md:inline-flex"><ChannelBadge channel={a.channel} /></span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Services + barbers summary */}
        <div className="space-y-4">
          <div className="rounded-2xl glass-panel p-5">
            <h3 className="font-display text-lg font-semibold">Top servicios</h3>
            <ul className="mt-4 space-y-3">
              {services.slice(0, 4).map((s) => {
                const count = appointments.filter((a) => a.serviceId === s.id).length;
                const max = appointments.length;
                return (
                  <li key={s.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl glass-panel p-5">
            <h3 className="font-display text-lg font-semibold">Barberos hoy</h3>
            <ul className="mt-4 space-y-2">
              {barbers.filter((b) => b.active).map((b) => {
                const count = todayAppts.filter((a) => a.barberId === b.id).length;
                return (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">{b.initials}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.role}</p>
                    </div>
                    <span className="text-sm font-semibold">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* IA recent */}
      <div className="mt-7 rounded-2xl glass-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" />
            <h3 className="font-display text-lg font-semibold">Últimas conversaciones IA</h3>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> bot activo
            </span>
          </div>
          <Button variant="ghost" size="sm">Ver todas</Button>
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {conversations.slice(0, 4).map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.clientName}</span>
                <span>{c.startedAt}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm">{c.preview}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {c.channel === "whatsapp" ? "WhatsApp" : "Llamada"} · {c.duration} · {c.outcome.replace("-", " ")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
