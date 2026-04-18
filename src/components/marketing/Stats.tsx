import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";

const STATS = [
  { value: 71, suffix: "%", label: "Citas reservadas por la IA sin tocar el móvil" },
  { value: 8, suffix: " min", label: "Tiempo medio de configuración inicial" },
  { value: 1200, suffix: "+", label: "Barberías activas en España y LATAM" },
  { value: 35, suffix: "%", label: "Menos no-shows con recordatorios automáticos" },
];

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const start = performance.now();
            const dur = 1500;
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.round(to * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref} aria-label={`${to}${suffix}`}>{n}{suffix}</span>;
}

export function Stats() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl glass-panel p-8 sm:p-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div>
                  <div className="font-display text-4xl font-semibold sm:text-5xl text-gradient">
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
