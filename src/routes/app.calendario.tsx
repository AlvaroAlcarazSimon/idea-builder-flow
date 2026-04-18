import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { appointments, barbers, services } from "@/lib/mockData";

export const Route = createFileRoute("/app/calendario")({
  component: CalendarPage,
});

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9..20
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function CalendarPage() {
  const [view, setView] = useState<"semana" | "dia">("semana");

  const startOfWeek = new Date();
  const day = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - day);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const today = new Date().toISOString().slice(0, 10);
  const dayAppts = (iso: string) => appointments.filter((a) => a.date === iso);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Calendario"
        subtitle="Tus citas a la vista, con drag & drop visual."
        actions={
          <>
            <div className="inline-flex rounded-lg glass p-1">
              <button onClick={() => setView("semana")} className={`rounded-md px-3 py-1 text-xs ${view === "semana" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Semana</button>
              <button onClick={() => setView("dia")} className={`rounded-md px-3 py-1 text-xs ${view === "dia" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Día</button>
            </div>
            <Button className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="mr-2 h-4 w-4" /> Nueva cita
            </Button>
          </>
        }
      />

      <div className="rounded-2xl glass-panel p-2 md:p-4">
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm">Hoy</Button>
            <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {days[0].toLocaleDateString("es", { day: "numeric", month: "short" })} – {days[6].toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            {/* Header */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
              <div />
              {days.map((d, i) => {
                const iso = d.toISOString().slice(0, 10);
                const isToday = iso === today;
                return (
                  <div key={i} className={`p-2 text-center text-xs ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                    <div>{DAY_LABELS[i]}</div>
                    <div className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${isToday ? "bg-foreground text-background font-semibold" : ""}`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hours */}
            <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
              {HOURS.map((h) => (
                <>
                  <div key={`l-${h}`} className="h-16 border-b border-border/50 pr-2 pt-1 text-right text-[10px] text-muted-foreground">
                    {h}:00
                  </div>
                  {days.map((d, di) => (
                    <div key={`c-${h}-${di}`} className="h-16 border-b border-l border-border/50 first:border-l-0" />
                  ))}
                </>
              ))}

              {/* Appointments overlay */}
              {days.map((d, di) => {
                const iso = d.toISOString().slice(0, 10);
                return dayAppts(iso).map((a) => {
                  const svc = services.find((s) => s.id === a.serviceId)!;
                  const barber = barbers.find((b) => b.id === a.barberId)!;
                  const [sh, sm] = a.start.split(":").map(Number);
                  const top = (sh - 9) * 64 + (sm / 60) * 64 + 28; /* +28 for header row offset within grid */
                  const dur = svc.duration;
                  const height = (dur / 60) * 64 - 4;
                  const left = `calc(60px + (100% - 60px) / 7 * ${di} + 2px)`;
                  const width = `calc((100% - 60px) / 7 - 4px)`;
                  return (
                    <button
                      key={a.id}
                      className="absolute rounded-lg border p-1.5 text-left text-[10px] transition-all hover:scale-[1.02] hover:z-10"
                      style={{
                        top, left, width, height,
                        backgroundColor: `color-mix(in oklab, ${svc.color} 22%, oklch(0.18 0.006 270))`,
                        borderColor: svc.color,
                      }}
                    >
                      <div className="font-mono text-[9px] opacity-70">{a.start}</div>
                      <div className="truncate font-medium">{a.clientName}</div>
                      <div className="truncate opacity-70">{svc.name} · {barber.initials}</div>
                    </button>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl glass-panel p-4">
        <span className="text-xs text-muted-foreground">Servicios:</span>
        {services.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
