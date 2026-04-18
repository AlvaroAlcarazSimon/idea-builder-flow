import { Bot, MessageCircle, Phone } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const CHAT = [
  { who: "client", text: "Hola, ¿queda algo para mañana por la tarde?" },
  { who: "bot", text: "¡Hola! Mañana a las 17:30 con Iván o a las 18:45 con Diego. ¿Cuál te va?" },
  { who: "client", text: "Las 18:45 con Diego" },
  { who: "bot", text: "Perfecto, te he reservado corte + barba (35 min). Te recuerdo 2h antes 💈" },
  { who: "client", text: "Genial, gracias!" },
];

export function AiSpotlight() {
  return (
    <section id="ia" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
                <Bot className="h-3.5 w-3.5" /> Lo diferencial
              </span>
              <h2 className="mt-5 text-balance font-display text-4xl font-semibold sm:text-5xl">
                Un recepcionista que <span className="text-gradient">no descansa, no falta y no olvida.</span>
              </h2>
              <p className="mt-5 text-pretty text-muted-foreground">
                Atiende WhatsApp y llamadas con voz natural. Conoce tu agenda,
                tus servicios y a tus clientes habituales. Reserva, reprograma,
                confirma y avisa de no-shows — todo solo.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Habla español neutro, mexicano y rioplatense",
                  "Conecta con tu WhatsApp Business en 1 clic",
                  "Aprende del tono de tu barbería",
                  "Te avisa solo si necesita tu intervención",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex gap-2">
                <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </span>
                <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                  <Phone className="h-3.5 w-3.5" /> Llamadas
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div
                className="absolute -inset-6 rounded-3xl opacity-50 blur-2xl"
                style={{ background: "radial-gradient(ellipse, oklch(0.55 0.012 270 / 0.4), transparent 70%)" }}
              />
              <div className="relative rounded-3xl glass-strong p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">Tijera AI</p>
                      <p className="text-[10px] text-success">en línea</p>
                    </div>
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2.5">
                  {CHAT.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                        m.who === "bot"
                          ? "ml-auto rounded-br-sm bg-foreground text-background"
                          : "rounded-bl-sm bg-muted text-foreground"
                      }`}
                      style={{ animation: `fade-up 0.5s cubic-bezier(0.25,0.1,0.25,1) ${i * 0.18}s both` }}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>Cita creada · mañana 18:45 · Diego</span>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-success">auto</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
