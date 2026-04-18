import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar, Clock } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { barbers } from "@/lib/mockData";

export const Route = createFileRoute("/app/barberos")({
  component: BarbersPage,
});

function BarbersPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Barberos"
        subtitle="Gestiona el equipo y sus horarios."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" /> Añadir barbero
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((b) => (
          <article key={b.id} className="rounded-2xl glass-panel p-6 hover-lift">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/10 font-display text-lg font-semibold">
                {b.initials}
              </span>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                <p className="text-sm text-muted-foreground">{b.role}</p>
              </div>
              <Switch defaultChecked={b.active} />
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{b.schedule}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{b.citasMes} citas este mes</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 glass border-border">Editar horario</Button>
              <Button variant="ghost" size="sm" className="flex-1">Ver agenda</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
