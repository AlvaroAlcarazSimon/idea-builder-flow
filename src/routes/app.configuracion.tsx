import { createFileRoute } from "@tanstack/react-router";
import { Bot, Building2, Clock, Save, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/app/configuracion")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Configuración"
        subtitle="Datos de la barbería y comportamiento del agente IA."
        actions={
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Negocio */}
        <section className="rounded-2xl glass-panel p-6">
          <header className="mb-5 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <h3 className="font-display text-lg font-semibold">Datos de la barbería</h3>
          </header>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input defaultValue="BlackComb Barber" className="mt-1.5 h-10 glass border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Dirección</Label>
              <Input defaultValue="Calle Fuencarral 88, Madrid" className="mt-1.5 h-10 glass border-border" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                <Input defaultValue="+34 910 23 45 67" className="mt-1.5 h-10 glass border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input defaultValue="hola@blackcomb.es" className="mt-1.5 h-10 glass border-border" />
              </div>
            </div>
          </div>
        </section>

        {/* Horario */}
        <section className="rounded-2xl glass-panel p-6">
          <header className="mb-5 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h3 className="font-display text-lg font-semibold">Horarios</h3>
          </header>
          <ul className="space-y-2 text-sm">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d, i) => (
              <li key={d} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                <span className="w-24">{d}</span>
                <span className="font-mono text-muted-foreground">
                  {i === 6 ? "Cerrado" : "10:00 — 21:00"}
                </span>
                <Switch defaultChecked={i !== 6} />
              </li>
            ))}
          </ul>
        </section>

        {/* IA */}
        <section className="lg:col-span-2 rounded-2xl glass-strong p-6">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <h3 className="font-display text-lg font-semibold">Agente IA</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> activo
              </span>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </header>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre del bot</Label>
                <Input defaultValue="Tijera" className="mt-1.5 h-10 glass border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tono de voz</Label>
                <select className="mt-1.5 h-10 w-full rounded-md border border-border bg-background/40 px-3 text-sm">
                  <option>Cercano y casual</option>
                  <option>Profesional</option>
                  <option>Divertido</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Idioma principal</Label>
                <select className="mt-1.5 h-10 w-full rounded-md border border-border bg-background/40 px-3 text-sm">
                  <option>Español (España)</option>
                  <option>Español (México)</option>
                  <option>Español (Argentina)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Mensaje de bienvenida</Label>
                <Textarea
                  defaultValue="¡Hola! Soy Tijera, el asistente de BlackComb. Dime qué necesitas y te lo soluciono ✂️"
                  rows={4}
                  className="mt-1.5 glass border-border"
                />
              </div>
              <div className="space-y-2">
                {[
                  ["Reservar citas automáticamente", true],
                  ["Mover/cancelar sin confirmación", false],
                  ["Recordar 2h antes", true],
                  ["Atender llamadas con voz IA", true],
                  ["Avisarte si escala", true],
                ].map(([label, def]) => (
                  <div key={label as string} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 text-sm">
                    <span>{label}</span>
                    <Switch defaultChecked={def as boolean} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
