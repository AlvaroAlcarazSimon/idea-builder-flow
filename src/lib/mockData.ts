export type ApptStatus = "confirmada" | "pendiente" | "completada" | "cancelada" | "no-show";
export type ApptChannel = "ia-whatsapp" | "ia-llamada" | "manual" | "web";

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  color: string;
}

export interface Barber {
  id: string;
  name: string;
  initials: string;
  role: string;
  schedule: string;
  active: boolean;
  citasMes: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
  favorite?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  serviceId: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;
  status: ApptStatus;
  channel: ApptChannel;
  price: number;
}

export interface Conversation {
  id: string;
  clientName: string;
  channel: "whatsapp" | "llamada";
  startedAt: string; // ISO
  duration: string;
  outcome: "cita-creada" | "cita-movida" | "cita-cancelada" | "info" | "escalada";
  preview: string;
  messages: { who: "client" | "bot"; text: string; time: string }[];
}

export const services: Service[] = [
  { id: "s1", name: "Corte clásico", duration: 30, price: 18, color: "oklch(0.78 0.04 250)" },
  { id: "s2", name: "Corte + barba", duration: 45, price: 28, color: "oklch(0.78 0.06 30)" },
  { id: "s3", name: "Afeitado a navaja", duration: 30, price: 22, color: "oklch(0.78 0.06 140)" },
  { id: "s4", name: "Arreglo de barba", duration: 20, price: 14, color: "oklch(0.78 0.06 80)" },
  { id: "s5", name: "Corte niño", duration: 25, price: 14, color: "oklch(0.78 0.06 320)" },
  { id: "s6", name: "Tratamiento capilar", duration: 40, price: 32, color: "oklch(0.78 0.05 200)" },
];

export const barbers: Barber[] = [
  { id: "b1", name: "Iván Castaño", initials: "IC", role: "Master barber", schedule: "L-V · 10-20h", active: true, citasMes: 142 },
  { id: "b2", name: "Diego Ferrer", initials: "DF", role: "Senior", schedule: "M-S · 11-21h", active: true, citasMes: 128 },
  { id: "b3", name: "Mauro Giménez", initials: "MG", role: "Junior", schedule: "L-S · 12-20h", active: true, citasMes: 96 },
  { id: "b4", name: "Pablo Ruiz", initials: "PR", role: "Senior", schedule: "X-D · 10-19h", active: false, citasMes: 0 },
];

export const clients: Client[] = [
  { id: "c1", name: "Marcos Romero", phone: "+34 612 33 44 55", visits: 14, lastVisit: "hace 3 días", favorite: "Corte + barba", notes: "Le gusta el degradado bajo." },
  { id: "c2", name: "Adrián Pérez", phone: "+34 622 11 88 90", visits: 8, lastVisit: "hace 1 semana", favorite: "Corte clásico" },
  { id: "c3", name: "Luis García", phone: "+34 633 44 22 11", visits: 22, lastVisit: "ayer", favorite: "Afeitado a navaja", notes: "Cliente VIP." },
  { id: "c4", name: "Joel Núñez", phone: "+34 644 99 11 22", visits: 3, lastVisit: "hace 2 semanas", favorite: "Corte clásico" },
  { id: "c5", name: "Toni Vega", phone: "+34 655 77 88 99", visits: 11, lastVisit: "hace 4 días", favorite: "Corte + barba" },
  { id: "c6", name: "Hugo Martín", phone: "+34 666 22 33 44", visits: 1, lastVisit: "hace 1 mes" },
  { id: "c7", name: "Sergio López", phone: "+34 677 55 66 77", visits: 18, lastVisit: "hace 2 días", favorite: "Arreglo de barba" },
  { id: "c8", name: "Raúl Sanz", phone: "+34 688 33 44 55", visits: 6, lastVisit: "hace 5 días" },
];

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export const appointments: Appointment[] = [
  { id: "a1", clientName: "Marcos Romero", serviceId: "s2", barberId: "b1", date: today, start: "10:30", end: "11:15", status: "confirmada", channel: "ia-whatsapp", price: 28 },
  { id: "a2", clientName: "Adrián Pérez", serviceId: "s1", barberId: "b2", date: today, start: "11:00", end: "11:30", status: "completada", channel: "ia-llamada", price: 18 },
  { id: "a3", clientName: "Luis García", serviceId: "s3", barberId: "b1", date: today, start: "11:30", end: "12:00", status: "confirmada", channel: "manual", price: 22 },
  { id: "a4", clientName: "Joel Núñez", serviceId: "s1", barberId: "b3", date: today, start: "12:30", end: "13:00", status: "confirmada", channel: "ia-whatsapp", price: 18 },
  { id: "a5", clientName: "Toni Vega", serviceId: "s2", barberId: "b2", date: today, start: "13:00", end: "13:45", status: "pendiente", channel: "web", price: 28 },
  { id: "a6", clientName: "Hugo Martín", serviceId: "s4", barberId: "b3", date: today, start: "16:00", end: "16:20", status: "confirmada", channel: "ia-whatsapp", price: 14 },
  { id: "a7", clientName: "Sergio López", serviceId: "s2", barberId: "b1", date: today, start: "17:00", end: "17:45", status: "confirmada", channel: "ia-llamada", price: 28 },
  { id: "a8", clientName: "Raúl Sanz", serviceId: "s1", barberId: "b2", date: today, start: "18:30", end: "19:00", status: "no-show", channel: "manual", price: 18 },
  { id: "a9", clientName: "Marcos Romero", serviceId: "s2", barberId: "b1", date: tomorrow, start: "10:00", end: "10:45", status: "confirmada", channel: "ia-whatsapp", price: 28 },
  { id: "a10", clientName: "Pedro Castro", serviceId: "s6", barberId: "b3", date: tomorrow, start: "11:30", end: "12:10", status: "confirmada", channel: "ia-whatsapp", price: 32 },
  { id: "a11", clientName: "Iker Salas", serviceId: "s1", barberId: "b2", date: tomorrow, start: "13:00", end: "13:30", status: "pendiente", channel: "web", price: 18 },
  { id: "a12", clientName: "Nico Bravo", serviceId: "s2", barberId: "b1", date: tomorrow, start: "16:30", end: "17:15", status: "confirmada", channel: "ia-llamada", price: 28 },
];

export const conversations: Conversation[] = [
  {
    id: "k1",
    clientName: "Marcos Romero",
    channel: "whatsapp",
    startedAt: "Hoy 09:42",
    duration: "1m 12s",
    outcome: "cita-creada",
    preview: "¿Tenéis hueco mañana sobre las 7?",
    messages: [
      { who: "client", text: "Hola, ¿tenéis hueco mañana sobre las 7?", time: "09:42" },
      { who: "bot", text: "¡Hola Marcos! Mañana a las 19:15 con Iván o 19:45 con Diego. ¿Cuál prefieres?", time: "09:42" },
      { who: "client", text: "19:15 con Iván", time: "09:43" },
      { who: "bot", text: "Hecho. Corte + barba (45 min) mañana a las 19:15 con Iván. Te recordaré 2h antes 💈", time: "09:43" },
    ],
  },
  {
    id: "k2",
    clientName: "+34 612 88 33 44",
    channel: "llamada",
    startedAt: "Hoy 10:15",
    duration: "2m 03s",
    outcome: "cita-creada",
    preview: "Llamada entrante atendida por IA",
    messages: [
      { who: "client", text: "Buenas, quería pedir cita para el sábado", time: "10:15" },
      { who: "bot", text: "Por supuesto, ¿qué servicio quieres? Corte, corte y barba o solo barba.", time: "10:15" },
      { who: "client", text: "Corte y barba", time: "10:16" },
      { who: "bot", text: "Tengo el sábado a las 11:30 o las 17:00. ¿Cuál te va mejor?", time: "10:16" },
      { who: "client", text: "Las 11:30", time: "10:17" },
      { who: "bot", text: "Perfecto. ¿Me dices tu nombre y un teléfono de contacto?", time: "10:17" },
    ],
  },
  {
    id: "k3",
    clientName: "Adrián Pérez",
    channel: "whatsapp",
    startedAt: "Hoy 11:08",
    duration: "45s",
    outcome: "cita-movida",
    preview: "¿Puedo cambiar mi cita de hoy a mañana?",
    messages: [
      { who: "client", text: "Hola, ¿puedo cambiar mi cita de hoy a mañana?", time: "11:08" },
      { who: "bot", text: "Claro Adrián. Tu cita de hoy 11:00 se puede mover a mañana 12:00 o 18:30. ¿Cuál prefieres?", time: "11:08" },
      { who: "client", text: "12:00 perfecto", time: "11:09" },
      { who: "bot", text: "Movida. Mañana 12:00 corte clásico con Diego ✂️", time: "11:09" },
    ],
  },
  {
    id: "k4",
    clientName: "Hugo Martín",
    channel: "whatsapp",
    startedAt: "Ayer 18:30",
    duration: "30s",
    outcome: "cita-cancelada",
    preview: "Tengo que cancelar la del jueves",
    messages: [
      { who: "client", text: "Hola, tengo que cancelar la del jueves", time: "18:30" },
      { who: "bot", text: "Sin problema Hugo, tu cita del jueves 17:00 queda cancelada. ¿Te apunto otra?", time: "18:30" },
      { who: "client", text: "La semana que viene te aviso", time: "18:31" },
    ],
  },
  {
    id: "k5",
    clientName: "Pedro Castro",
    channel: "llamada",
    startedAt: "Ayer 16:50",
    duration: "1m 40s",
    outcome: "info",
    preview: "Pregunta sobre precios de tratamiento",
    messages: [
      { who: "client", text: "Hola, ¿cuánto cuesta el tratamiento capilar?", time: "16:50" },
      { who: "bot", text: "El tratamiento capilar son 32€ y dura unos 40 minutos. ¿Quieres que te reserve?", time: "16:50" },
      { who: "client", text: "Lo pienso y te digo, gracias", time: "16:51" },
    ],
  },
  {
    id: "k6",
    clientName: "Anónimo",
    channel: "whatsapp",
    startedAt: "Ayer 14:22",
    duration: "20s",
    outcome: "escalada",
    preview: "Quería preguntar por algo distinto…",
    messages: [
      { who: "client", text: "Quería preguntar si hacéis tatuajes", time: "14:22" },
      { who: "bot", text: "Eso se sale de lo que puedo gestionar. Aviso al equipo y te contactan en breve 🙌", time: "14:22" },
    ],
  },
];

export const statusLabel: Record<ApptStatus, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
  "no-show": "No-show",
};

export const channelLabel: Record<ApptChannel, string> = {
  "ia-whatsapp": "IA · WhatsApp",
  "ia-llamada": "IA · Llamada",
  manual: "Manual",
  web: "Web",
};
