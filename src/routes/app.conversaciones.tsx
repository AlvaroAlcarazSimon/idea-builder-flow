import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, MessageCircle, Phone, Search, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { conversations, type Conversation } from "@/lib/mockData";

export const Route = createFileRoute("/app/conversaciones")({
  component: ConversationsPage,
});

const OUTCOME_LABEL: Record<Conversation["outcome"], string> = {
  "cita-creada": "Cita creada",
  "cita-movida": "Cita movida",
  "cita-cancelada": "Cita cancelada",
  info: "Información",
  escalada: "Escalada",
};

const OUTCOME_STYLE: Record<Conversation["outcome"], string> = {
  "cita-creada": "bg-success/15 text-success",
  "cita-movida": "bg-foreground/10 text-foreground",
  "cita-cancelada": "bg-muted text-muted-foreground",
  info: "bg-foreground/10 text-foreground",
  escalada: "bg-destructive/15 text-destructive",
};

function ConversationsPage() {
  const [active, setActive] = useState(conversations[0]);
  const [q, setQ] = useState("");

  const filtered = conversations.filter((c) => c.clientName.toLowerCase().includes(q.toLowerCase()) || c.preview.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Conversaciones IA"
        subtitle="Cada chat y llamada que el bot ha tenido con tus clientes."
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* List */}
        <div className="rounded-2xl glass-panel p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="h-9 pl-9 glass border-border" />
          </div>
          <ul className="mt-3 space-y-1.5 max-h-[640px] overflow-y-auto no-scrollbar">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActive(c)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                    active.id === c.id
                      ? "border-border bg-foreground/10"
                      : "border-transparent hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {c.channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5 text-success" /> : <Phone className="h-3.5 w-3.5 text-foreground" />}
                      <span className="truncate text-sm font-medium">{c.clientName}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{c.startedAt}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.preview}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] ${OUTCOME_STYLE[c.outcome]}`}>
                    {OUTCOME_LABEL[c.outcome]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat */}
        <div className="rounded-2xl glass-panel p-5 min-h-[640px] flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium">{active.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {active.channel === "whatsapp" ? "WhatsApp" : "Llamada"} · {active.startedAt} · {active.duration}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${OUTCOME_STYLE[active.outcome]}`}>
              {OUTCOME_LABEL[active.outcome]}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pt-5">
            {active.messages.map((m, i) => (
              <div key={i} className={`flex ${m.who === "bot" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.who === "bot"
                    ? "rounded-br-sm bg-foreground text-background"
                    : "rounded-bl-sm bg-muted text-foreground"
                }`}>
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.who === "bot" ? "text-background/60" : "text-muted-foreground"}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">bot activo</span>
            <span>Tomar el control</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
