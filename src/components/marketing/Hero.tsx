import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Phone, MessageCircle, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Nuevo · Agente de IA con voz humana en español
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="mt-6 text-balance font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-gradient">Tu barbería atiende sola.</span>
            <br />
            <span className="text-muted-foreground">Tú solo cortas pelo.</span>
          </h1>
        </Reveal>

        <Reveal delay={220}>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Tijera.ai es el sistema de gestión con un agente de IA que habla por
            WhatsApp y llamadas, reserva citas, las mueve y confirma — sin que
            sueltes la maquinilla.
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-12 px-6 text-sm">
              <Link to="/login">
                Empezar gratis 14 días
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass h-12 px-6 text-sm">
              <a href="#ia">Ver al agente en acción</a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={450}>
          <p className="mt-4 text-xs text-muted-foreground">
            Sin tarjeta · Configuración en 8 minutos · Cancela cuando quieras
          </p>
        </Reveal>

        {/* Mockup */}
        <Reveal delay={520}>
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div
              className="absolute inset-x-10 -top-10 h-40 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(ellipse, oklch(0.6 0.012 270 / 0.5), transparent 70%)" }}
            />
            <div className="relative overflow-hidden rounded-3xl glass-strong p-2">
              <div className="overflow-hidden rounded-2xl bg-card">
                {/* Browser chrome */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  </div>
                  <div className="rounded-md bg-muted px-3 py-0.5 text-[10px] text-muted-foreground">
                    app.tijera.ai/dashboard
                  </div>
                  <span className="h-2.5 w-12" />
                </div>
                {/* Fake dashboard */}
                <div className="grid gap-4 p-6 md:grid-cols-3">
                  <MockStat icon={Calendar} label="Citas hoy" value="24" trend="+18%" />
                  <MockStat icon={MessageCircle} label="Atendidas por IA" value="17" trend="71%" />
                  <MockStat icon={Phone} label="Llamadas resueltas" value="9" trend="solo bot" />
                  <div className="md:col-span-2 rounded-xl border border-border bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-medium">Próximas citas</h4>
                      <span className="text-xs text-muted-foreground">Hoy</span>
                    </div>
                    <ul className="space-y-2">
                      {[
                        ["10:30", "Marcos R.", "Corte + barba", "Iván"],
                        ["11:00", "Adrián P.", "Corte clásico", "Diego"],
                        ["11:30", "Luis G.", "Afeitado navaja", "Iván"],
                      ].map(([h, n, s, b]) => (
                        <li key={n} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                          <span className="font-mono text-muted-foreground">{h}</span>
                          <span className="font-medium">{n}</span>
                          <span className="text-muted-foreground">{s}</span>
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <h4 className="text-sm font-medium">Agente IA</h4>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> activo
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2 text-muted-foreground">
                        Cliente: "¿Tenéis hueco mañana sobre las 7?"
                      </div>
                      <div className="rounded-lg bg-foreground/10 p-2">
                        Bot: "Sí, te dejo a las 19:15 con Iván. ¿Confirmamos?"
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MockStat({ icon: Icon, label, value, trend }: { icon: typeof Calendar; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-success">{trend}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}
