import { Logo } from "../Logo";

export function MarketingFooter() {
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              La plataforma con agente de IA que reserva citas por WhatsApp y
              llamadas mientras tú cortas pelo.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Producto</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="/#features" className="hover:text-foreground">Funciones</a></li>
              <li><a href="/#ia" className="hover:text-foreground">Agente IA</a></li>
              <li><a href="/#pricing" className="hover:text-foreground">Precios</a></li>
              <li><a href="/#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Compañía</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Sobre nosotros</a></li>
              <li><a href="#" className="hover:text-foreground">Contacto</a></li>
              <li><a href="#" className="hover:text-foreground">Privacidad</a></li>
              <li><a href="#" className="hover:text-foreground">Términos</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Tijera.ai — Hecho para barberos exigentes.</p>
          <p>Todos los datos cifrados. Hosting en Europa.</p>
        </div>
      </div>
    </footer>
  );
}
