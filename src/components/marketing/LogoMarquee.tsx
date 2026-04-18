const LOGOS = [
  "BarberClub", "ElNavaja", "Brothers&Co", "GentlemanCo", "Studio27",
  "BlackComb", "RazorHaus", "OldTown", "FadeLab", "MasterCut",
];

export function LogoMarquee() {
  return (
    <section className="relative py-10">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Confían en Tijera.ai más de 1.200 barberías en España y LATAM
      </p>
      <div
        className="relative mt-8 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="flex w-max animate-[marquee_35s_linear_infinite] gap-12 pr-12">
          {[...LOGOS, ...LOGOS].map((name, i) => (
            <span
              key={i}
              className="font-display text-2xl font-semibold tracking-tight text-muted-foreground/60 grayscale transition hover:text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
