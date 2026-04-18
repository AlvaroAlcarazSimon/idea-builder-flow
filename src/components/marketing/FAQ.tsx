import { Reveal } from "@/components/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  { q: "¿Necesito instalar algo?", a: "No. Tijera.ai es 100% web. Funciona en tu portátil, tablet o móvil con cualquier navegador moderno." },
  { q: "¿Cómo conecto WhatsApp?", a: "Te guiamos en 2 clics para conectar tu WhatsApp Business oficial. No usamos números personales ni baneables." },
  { q: "¿La IA realmente reserva sola?", a: "Sí. Lee tu agenda, los servicios disponibles y la duración de cada uno. Reserva, mueve y cancela sin avisarte. Solo te interrumpe si el cliente pide algo fuera de lo normal." },
  { q: "¿Y si quiero contestar yo?", a: "Puedes tomar el control de cualquier conversación en cualquier momento desde el panel. La IA te cede el turno al instante." },
  { q: "¿Qué idiomas habla?", a: "Español de España, mexicano y rioplatense. Ajustamos el tono y vocabulario al de tu barbería." },
  { q: "¿Hay permanencia?", a: "Ninguna. Cancelas con un clic, sin papeleo ni llamadas. Te exportamos todos tus datos." },
  { q: "¿Mis datos están seguros?", a: "Cifrado en reposo y en tránsito. Servidores en Europa. Cumplimos GDPR." },
  { q: "¿Hay prueba gratis?", a: "Sí, 14 días gratis con todas las funciones. No pedimos tarjeta para empezar." },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preguntas</span>
            <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              Lo que todos preguntan.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Accordion type="single" collapsible className="mt-10 rounded-2xl glass-panel px-2">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-border/60 px-4">
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
