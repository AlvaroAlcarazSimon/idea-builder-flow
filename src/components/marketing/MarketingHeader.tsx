import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";

const NAV = [
  { href: "/#features", label: "Producto" },
  { href: "/#ia", label: "Agente IA" },
  { href: "/#pricing", label: "Precios" },
  { href: "/#testimonios", label: "Clientes" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2.5" : "py-4"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 ${
            scrolled ? "glass-strong" : "glass"
          }`}
        >
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/login">Probar gratis</Link>
            </Button>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden rounded-lg p-2 text-foreground"
            aria-label="Menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="mt-2 glass-strong rounded-2xl p-4 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  <Link to="/login">Probar gratis</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
