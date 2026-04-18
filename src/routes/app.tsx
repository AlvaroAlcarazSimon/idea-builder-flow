import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Calendar, ListChecks, Users, Scissors,
  Settings, MessageSquareText, UserCog, Bell, Search, LogOut, ChevronLeft, Menu,
} from "lucide-react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [{ title: "Panel · Tijera.ai" }],
  }),
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/calendario", label: "Calendario", icon: Calendar },
  { to: "/app/citas", label: "Citas", icon: ListChecks },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/barberos", label: "Barberos", icon: UserCog },
  { to: "/app/servicios", label: "Servicios", icon: Scissors },
  { to: "/app/conversaciones", label: "Conversaciones IA", icon: MessageSquareText },
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
] as const;

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="relative flex min-h-screen">
      <AmbientBackground />

      {/* Sidebar - desktop */}
      <aside
        className={`hidden md:flex sticky top-0 h-screen flex-col border-r border-border/60 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
        style={{ backgroundColor: "oklch(0.17 0.006 270 / 0.7)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && <Logo />}
          {collapsed && (
            <Link to="/app" className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl glass-strong">
              <Scissors className="h-4 w-4" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(item.to, "exact" in item ? item.exact : undefined);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 transition-transform ${active ? "" : "group-hover:scale-110"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Salir"}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] glass-strong p-4 md:hidden animate-[fade-in_0.2s_ease-out]">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="p-2"><ChevronLeft className="h-4 w-4" /></button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(item.to, "exact" in item ? item.exact : undefined);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      active ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 md:px-6"
          style={{ backgroundColor: "oklch(0.16 0.005 270 / 0.7)", backdropFilter: "blur(20px)" }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 -ml-2"><Menu className="h-5 w-5" /></button>

          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente, cita, servicio..." className="h-9 pl-9 glass border-border" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-success" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              IC
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
