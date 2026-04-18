import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

export function FinalCTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl glass-strong p-10 text-center sm:p-16"
            style={{ background: "linear-gradient(135deg, oklch(0.22 0.006 270 / 0.7), oklch(0.16 0.005 270 / 0.7))" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.5 0.012 270 / 0.45), transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl font-semibold sm:text-5xl">
                Tu próximo cliente está escribiendo ahora.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Empieza gratis 14 días y deja que la IA conteste por ti desde
                hoy.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-12 px-7">
                  <Link to="/login">
                    Probar Tijera.ai gratis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-12 px-6">
                  <a href="#pricing">Ver precios</a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
