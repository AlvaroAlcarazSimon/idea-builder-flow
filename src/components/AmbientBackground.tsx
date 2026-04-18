export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.012 270 / 0.55), transparent 70%)",
          animation: "float 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.45 0.01 270 / 0.5), transparent 70%)",
          animation: "float 14s ease-in-out 1s infinite reverse",
        }}
      />
      <div
        className="absolute top-1/3 -left-32 h-[380px] w-[380px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.6 0.012 270 / 0.4), transparent 70%)",
          animation: "float 16s ease-in-out 2s infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 80%)",
        }}
      />
    </div>
  );
}
