import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Phone, Star } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clients } from "@/lib/mockData";

export const Route = createFileRoute("/app/clientes")({
  component: ClientsPage,
});

function ClientsPage() {
  const [q, setQ] = useState("");
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Clientes"
        subtitle="CRM básico con historial de visitas."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="h-10 pl-9 glass border-border" />
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="rounded-full glass px-3 py-1.5">{clients.length} clientes</span>
          <span className="rounded-full glass px-3 py-1.5">{clients.filter((c) => c.visits >= 10).length} VIP</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <article key={c.id} className="group rounded-2xl glass-panel p-5 hover-lift">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold">
                {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{c.name}</h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {c.phone}
                </p>
              </div>
              {c.visits >= 10 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
                  <Star className="h-3 w-3 fill-current" /> VIP
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Visitas</p>
                <p className="text-base font-semibold">{c.visits}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-muted-foreground">Última</p>
                <p className="text-sm font-medium">{c.lastVisit}</p>
              </div>
            </div>
            {c.favorite && (
              <p className="mt-3 text-xs text-muted-foreground">
                Favorito: <span className="text-foreground">{c.favorite}</span>
              </p>
            )}
            {c.notes && (
              <p className="mt-2 line-clamp-2 rounded-lg border border-border bg-background/40 p-2 text-xs text-muted-foreground">
                {c.notes}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
