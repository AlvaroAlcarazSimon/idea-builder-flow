import { createFileRoute } from "@tanstack/react-router";
import { AmbientBackground } from "@/components/AmbientBackground";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Hero } from "@/components/marketing/Hero";
import { LogoMarquee } from "@/components/marketing/LogoMarquee";
import { Features } from "@/components/marketing/Features";
import { AiSpotlight } from "@/components/marketing/AiSpotlight";
import { Stats } from "@/components/marketing/Stats";
import { Pricing } from "@/components/marketing/Pricing";
import { Testimonials } from "@/components/marketing/Testimonials";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tijera.ai — Tu barbería atiende sola con IA" },
      {
        name: "description",
        content:
          "Sistema de gestión para barberías con agente de IA que reserva citas por WhatsApp y llamadas automáticamente. Calendario, CRM y panel en una sola herramienta.",
      },
      { property: "og:title", content: "Tijera.ai — Tu barbería atiende sola con IA" },
      { property: "og:description", content: "Agente IA que reserva citas por WhatsApp y llamadas. Sin intervención humana." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AmbientBackground />
      <MarketingHeader />
      <main>
        <Hero />
        <LogoMarquee />
        <Features />
        <AiSpotlight />
        <Stats />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
