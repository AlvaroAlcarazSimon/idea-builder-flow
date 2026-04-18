import { channelLabel, statusLabel, type ApptChannel, type ApptStatus } from "@/lib/mockData";

const STATUS_STYLES: Record<ApptStatus, string> = {
  confirmada: "bg-success/15 text-success border-success/30",
  pendiente: "bg-warning/15 text-warning border-warning/30",
  completada: "bg-foreground/10 text-foreground border-border",
  cancelada: "bg-muted text-muted-foreground border-border",
  "no-show": "bg-destructive/15 text-destructive border-destructive/30",
};

const CHANNEL_STYLES: Record<ApptChannel, string> = {
  "ia-whatsapp": "bg-foreground/10 text-foreground",
  "ia-llamada": "bg-foreground/10 text-foreground",
  manual: "bg-muted text-muted-foreground",
  web: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ApptStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: ApptChannel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CHANNEL_STYLES[channel]}`}>
      {channelLabel[channel]}
    </span>
  );
}
