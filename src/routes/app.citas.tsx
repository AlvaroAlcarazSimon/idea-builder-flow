import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge, ChannelBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appointments, barbers, services, type ApptStatus, type ApptChannel } from "@/lib/mockData";

export const Route = createFileRoute("/app/citas")({
  component: CitasPage,
});

const STATUSES: (ApptStatus | "todas")[] = ["todas", "confirmada", "pendiente", "completada", "cancelada", "no-show"];
const CHANNELS: (ApptChannel | "todos")[] = ["todos", "ia-whatsapp", "ia-llamada", "manual", "web"];

function CitasPage() {
  const [status, setStatus] = useState<ApptStatus | "todas">("todas");
  const [channel, setChannel] = useState<ApptChannel | "todos">("todos");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return appointments.filter((a) =>
      (status === "todas" || a.status === status) &&
      (channel === "todos" || a.channel === channel) &&
      (q === "" || a.clientName.toLowerCase().includes(q.toLowerCase()))
    );
  }, [status, channel, q]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Citas"
        subtitle="Filtra por estado, canal y barbero."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" /> Nueva cita
          </Button>
        }
      />

      <div className="rounded-2xl glass-panel p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." className="h-10 pl-9 glass border-border" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${
                  status === s ? "bg-foreground text-background" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  channel === c ? "bg-foreground text-background" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "todos" ? "Todos canales" : c.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Barbero</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => {
                const svc = services.find((s) => s.id === a.serviceId)!;
                const barber = barbers.find((b) => b.id === a.barberId)!;
                return (
                  <tr key={a.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{a.date}</td>
                    <td className="px-4 py-3 font-mono">{a.start}</td>
                    <td className="px-4 py-3 font-medium">{a.clientName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: svc.color }} />
                        {svc.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">{barber.name}</td>
                    <td className="px-4 py-3"><ChannelBadge channel={a.channel} /></td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold">{a.price}€</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Sin citas con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} citas</p>
      </div>
    </div>
  );
}
