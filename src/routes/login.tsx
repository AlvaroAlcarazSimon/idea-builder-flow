import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · Tijera.ai" },
      { name: "description", content: "Accede al panel de tu barbería." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/app" }), 500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AmbientBackground />
      <div className="absolute left-6 top-6">
        <Logo />
      </div>

      <div className="relative w-full max-w-md animate-[scale-in_0.5s_cubic-bezier(0.25,0.1,0.25,1)_both]">
        <div className="rounded-3xl glass-strong p-8 sm:p-10">
          <h1 className="font-display text-3xl font-semibold">Bienvenido de vuelta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entra al panel de tu barbería
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  defaultValue="demo@tijera.ai"
                  className="h-11 pl-10 glass border-border"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Contraseña
                </Label>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">
                  ¿Olvidada?
                </a>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  defaultValue="••••••••"
                  className="h-11 pl-10 glass border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? "Entrando..." : "Entrar al panel"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link to="/" className="text-foreground hover:underline">
              Empieza gratis
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo: cualquier credencial te lleva al panel.
        </p>
      </div>
    </div>
  );
}
