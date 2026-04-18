import { Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const T = [
  {
    quote: "El bot atiende mejor que mi cuñado en recepción. Llevamos 3 meses sin tocar WhatsApp y la agenda llena.",
    name: "Iván Castaño",
    role: "Dueño · BlackComb Barber, Madrid",
  },
  {
    quote: "Pasé de perder 6 citas al día por no contestar a tener todos los huecos cubiertos. Solo eso ya me paga el plan x10.",
    name: "Diego Ferrer",
    role: "Dueño · Studio27, Valencia",
  },
  {
    quote: "El calendario es bestial y los clientes flipan con la voz del bot por teléfono. Parece de verdad.",
    name: "Mauro Giménez",
    role: "Dueño · Brothers&Co, Buenos Aires",
  },
];

export function Testimonials() {
  return (
    <section id="testimonios" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Clientes</span>
            <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              Barberos exigentes, no influencers.
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {T.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <figure className="h-full rounded-2xl glass-panel p-6 hover-lift">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-foreground text-foreground" />
                  ))}
                </div>
                <blockquote className="mt-4 text-pretty text-sm leading-relaxed text-foreground/90">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                    {t.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
