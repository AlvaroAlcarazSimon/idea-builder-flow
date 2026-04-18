import { useState } from "react";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

const TIERS = [
  {
    name: "Starter",
    monthly: 29,
    annual: 23,
    desc: "Para barbería de 1 silla que empieza con automatización.",
    features: ["Hasta 200 citas/mes", "1 barbero", "Calendario y CRM", "Recordatorios SMS/Email"],
    cta: "Empezar",
    highlight: false,
  },
  {
    name: "Pro",
    monthly: 69,
    annual: 55,
    desc: "El estándar. Tu agente IA siempre encendido.",
    features: ["Citas ilimitadas", "Hasta 5 barberos", "Agente IA WhatsApp", "Llamadas IA (500 min)", "Analítica avanzada"],
    cta: "Probar 14 días",
    highlight: true,
  },
  {
    name: "Cadena",
    monthly: 149,
    annual: 119,
    desc: "Multi-local con un solo panel.",
    features: ["Todo de Pro", "Locales ilimitados", "Llamadas IA ilimitadas", "API y webhooks", "Soporte dedicado"],
    cta: "Hablar con ventas",
    highlight: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Precios</span>
            <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              Paga por barbería, no por cliente.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Sin comisiones por cita. Cancela cuando quieras.
            </p>
            <div className="mt-7 inline-flex items-center gap-1 rounded-full glass p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                  !annual ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                  annual ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                Anual <span className="ml-1 text-success">-20%</span>
              </button>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div
                className={`relative h-full rounded-3xl p-7 transition-all ${
                  t.highlight
                    ? "glass-strong border-2"
                    : "glass-panel hover-lift"
                }`}
                style={t.highlight ? { borderColor: "oklch(1 0 0 / 0.25)" } : undefined}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-background">
                    Más elegido
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-semibold">
                    {annual ? t.annual : t.monthly}€
                  </span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {annual ? "Facturado anualmente" : "Facturación mensual"}
                </p>
                <Button
                  asChild
                  className={`mt-6 w-full ${
                    t.highlight
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "glass border border-border"
                  }`}
                  variant={t.highlight ? "default" : "outline"}
                >
                  <Link to="/login">{t.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 text-foreground" strokeWidth={2.5} />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
