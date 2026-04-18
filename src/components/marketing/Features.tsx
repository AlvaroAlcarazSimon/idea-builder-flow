import { Bot, Calendar, Users, Scissors, MessageSquare, Settings2, BarChart3, Phone } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const FEATURES = [
  { icon: Bot, title: "Agente IA 24/7", desc: "Reserva, mueve y cancela citas por WhatsApp y llamadas sin tu intervención." },
  { icon: Calendar, title: "Calendario inteligente", desc: "Vista diaria y semanal con drag & drop y huecos optimizados por barbero." },
  { icon: Users, title: "CRM de clientes", desc: "Historial, preferencias y notas. Sabes quién es cada cliente antes de que llegue." },
  { icon: Scissors, title: "Servicios y precios", desc: "Catálogo con duración y color. Cambios en segundos, se sincroniza con el bot." },
  { icon: MessageSquare, title: "Conversaciones IA", desc: "Revisa cada chat del bot, intervén si quieres y mejora respuestas con un clic." },
  { icon: Phone, title: "Llamadas atendidas", desc: "Voz natural en español que entiende acentos y no deja a nadie en espera." },
  { icon: BarChart3, title: "Analítica del día", desc: "Ingresos, ocupación, no-shows y rendimiento por barbero, en tiempo real." },
  { icon: Settings2, title: "Configuración total", desc: "Horarios, festivos, recordatorios y tono del bot. Tú mandas, la IA ejecuta." },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plataforma</span>
            <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              Todo lo que necesitas. Nada que sobre.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Una sola herramienta para gestionar tu equipo, tus clientes y a tu
              recepcionista virtual.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="group h-full rounded-2xl glass-panel p-5 hover-lift">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10 transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
