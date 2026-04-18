import { createFileRoute } from "@tanstack/react-router";
import { Plus, Clock, Euro, Pencil } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { services } from "@/lib/mockData";

export const Route = createFileRoute("/app/servicios")({
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Servicios"
        subtitle="Catálogo con precio, duración y color."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" /> Nuevo servicio
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article key={s.id} className="group relative overflow-hidden rounded-2xl glass-panel p-5 hover-lift">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
            />
            <div className="flex items-start justify-between">
              <span className="h-10 w-10 rounded-xl" style={{ backgroundColor: `color-mix(in oklab, ${s.color} 35%, oklch(0.2 0.006 270))`, border: `1px solid ${s.color}` }} />
              <button className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{s.name}</h3>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {s.duration} min
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Euro className="h-3.5 w-3.5" /> {s.price}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
