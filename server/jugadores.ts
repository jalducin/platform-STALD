// Jugadores registrados y registros pendientes para el admin (openspec: jugadores-admin). Función pura: recibe las
// filas, los invitados, la semana de juegos y las cuentas de Auth; la identidad sale de resolverJugador (misma
// prioridad que al jugar: alumno de Inglés > Secundaria > invitado).
import { type Invitados, resolverJugador } from "./juegos.ts";

type Filas = Parameters<typeof resolverJugador>[2];

export interface Cuenta {
  email: string;
  creada: string;
  confirmada: boolean;
  ultimoAcceso: string | null;
  ultimoEnvio: string | null;
}

export interface Jugador {
  email: string;
  nombre: string;
  id: string;
  tipo: "alumno" | "invitado";
  espacio: "Inglés" | "Secundaria" | "Juegos";
  puntosSemana: number;
  partidasSemana: number;
  ultimaVisita: string | null;
  nick?: string; // openspec: nick-jugadores
}

export interface Pendiente {
  email: string;
  creada: string;
  ultimoEnvio: string | null;
  estado: "sin confirmar" | "sin apodo";
}

export async function armarJugadores(e: {
  admin: string;
  ingles: Filas;
  secundaria: Filas;
  invitados: Invitados;
  semana: { id: string; total: number; partidas?: unknown[] }[];
  cuentas: Cuenta[];
  nicks?: Record<string, string>;
}): Promise<{ jugadores: Jugador[]; pendientes: Pendiente[] }> {
  const porCorreo = new Map(e.cuentas.map((c) => [c.email, c]));
  const correos = [...new Set([...e.ingles.flatMap((r) => r.userEmails), ...e.secundaria.flatMap((r) => r.userEmails), ...Object.keys(e.invitados)])];
  const jugadores: Jugador[] = [];
  for (const email of correos) {
    const j = await resolverJugador(email, e.admin, e.ingles, e.secundaria, e.invitados);
    if (!j || j.tipo === "admin") continue;
    const sem = e.semana.find((d) => d.id === j.id);
    const inv = j.tipo === "invitado" ? e.invitados[email] : null;
    jugadores.push({
      email, nombre: j.nombre, id: j.id, tipo: j.tipo,
      espacio: j.tipo === "invitado" ? "Juegos" : j.id.startsWith("s-") ? "Secundaria" : "Inglés",
      puntosSemana: sem?.total ?? 0, partidasSemana: sem?.partidas?.length ?? 0,
      ultimaVisita: inv?.ultimaVisita ?? porCorreo.get(email)?.ultimoAcceso ?? null,
      ...(e.nicks?.[j.id] ? { nick: e.nicks[j.id] } : {}),
    });
  }
  const orden = { "Inglés": 0, "Secundaria": 1, "Juegos": 2 };
  jugadores.sort((a, b) => orden[a.espacio] - orden[b.espacio] || a.nombre.localeCompare(b.nombre, "es"));
  const registrados = new Set(jugadores.map((j) => j.email));
  const pendientes: Pendiente[] = e.cuentas
    .filter((c) => c.email !== e.admin && !registrados.has(c.email))
    .map((c) => ({ email: c.email, creada: c.creada, ultimoEnvio: c.ultimoEnvio, estado: c.confirmada ? "sin apodo" as const : "sin confirmar" as const }))
    .sort((a, b) => b.creada.localeCompare(a.creada) || a.email.localeCompare(b.email));
  return { jugadores, pendientes };
}
