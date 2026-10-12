// Clásicos rápidos en partida (openspec: clasicos-rapidos): Gato, Conecta 4, Piedra-papel-tijera, Ahorcado en inglés
// y Serpientes y escaleras. El servidor valida la forma de cada jugada; las reglas y la reproducción de la partida viven
// en juegos/clasicos-rapidos.js (lo prueban server/clasicos_rapidos_motor_test.ts y la página).

export const CLASICOS_RAPIDOS = ["gato", "conecta4", "ppt", "ahorcado", "serpientes"];
export const esClasicoRapido = (juego: string) => CLASICOS_RAPIDOS.includes(juego);

// Títulos para el ranking 🔥 Juegos; mismos ids y textos que las tarjetas de juegos.html.
export const CATALOGO_CLASICOS_RAPIDOS: Record<string, { categoria: string; titulo: string; max: number }> = {
  gato: { categoria: "clasicos", titulo: "Gato", max: 1000 },
  conecta4: { categoria: "clasicos", titulo: "Conecta 4", max: 1000 },
  ppt: { categoria: "clasicos", titulo: "Piedra, papel o tijera", max: 1000 },
  ahorcado: { categoria: "clasicos", titulo: "Ahorcado en inglés", max: 1000 },
  serpientes: { categoria: "clasicos", titulo: "Serpientes y escaleras", max: 1000 },
};

// Mesas (cupo, asientos y mínimo): en MESAS de server/salas.ts y juegos/mesas.js (openspec: mesas-con-bots).

export const RONDAS_PPT = 5; // igual que ClasicosRapidos.PPT_RONDAS
const PPT = ["piedra", "papel", "tijera"];
const MODOS_AHORCADO = ["compite", "coop"];

export interface JugadaClasica {
  n: number;
  accion: string;
  casilla?: number;
  col?: number;
  eleccion?: string;
  letra?: string;
}

const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;

// Valida la jugada (ya con n entero 0–2000) y devuelve solo sus campos permitidos, o null.
export function validarJugadaClasicos(juego: string, j: Record<string, unknown>): JugadaClasica | null {
  const n = j.n as number, accion = String(j.accion ?? "");
  if (juego === "gato") return accion === "marcar" && entero(j.casilla, 0, 8) ? { n, accion, casilla: j.casilla as number } : null;
  if (juego === "conecta4") return accion === "soltar" && entero(j.col, 0, 6) ? { n, accion, col: j.col as number } : null;
  if (juego === "ppt") {
    if (!entero(n, 0, RONDAS_PPT - 1)) return null; // n = ronda
    if (accion === "pasar") return { n, accion };
    return accion === "elegir" && PPT.includes(j.eleccion as string) ? { n, accion, eleccion: j.eleccion as string } : null;
  }
  if (juego === "ahorcado") {
    if (accion === "pasar") return { n, accion };
    return accion === "letra" && typeof j.letra === "string" && /^[a-z]$/.test(j.letra) ? { n, accion, letra: j.letra } : null;
  }
  if (juego === "serpientes") return accion === "tirar" ? { n, accion } : null; // el dado sale de la semilla y del paso
  return null;
}

// Opciones al crear la sala: el modo del Ahorcado (compite por omisión). Devuelve el error si no es válido.
export function opcionesClasicos(juego: string, op: Record<string, unknown>): Record<string, string> | "modo_invalido" {
  if (juego !== "ahorcado") return {};
  if (op.modo !== undefined && !MODOS_AHORCADO.includes(op.modo as string)) return "modo_invalido";
  return { modo: (op.modo as string) ?? "compite" };
}

// En Piedra-papel-tijera todos juegan la misma ronda: el paso n se repite entre personas.
export const sinTurnoUnico = (juego: string) => juego === "ppt";

interface ConJugadas {
  id: string;
  jugadas?: { n: number; accion: string; eleccion?: string }[];
}

// Elección simultánea: la elección de otra persona en la ronda r se ve como "?" mientras quien pregunta (yo) no tenga
// jugada en r y la ronda no esté completa (todas las personas con jugada en r). Sin yo (Realtime), se oculta toda ronda
// incompleta. Otros juegos no cambian.
export function ocultarJugadas<T extends ConJugadas>(juego: string, jugadores: T[], yo?: string): T[] {
  if (juego !== "ppt") return jugadores;
  const tiene = (x: ConJugadas, r: number) => (x.jugadas || []).some((y) => y.n === r);
  const completa = (r: number) => jugadores.every((x) => tiene(x, r));
  const mio = jugadores.find((x) => x.id === yo);
  return jugadores.map((x) => {
    if (x.id === yo || !x.jugadas?.length) return x;
    const jugadas = x.jugadas.map((y) => y.eleccion !== undefined && !completa(y.n) && !(mio && tiene(mio, y.n)) ? { ...y, eleccion: "?" } : y);
    return { ...x, jugadas };
  });
}
