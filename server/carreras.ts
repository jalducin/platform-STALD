// Carreras de Arcade en partida (openspec: juegos-plataformas-karts): cada persona juega el mismo nivel o pista y
// envía su tiempo una sola vez. Los límites deben coincidir con Arcade.LIMITE_SALA / MIN_SALA de juegos/arcade.js.
// karts-pistas-grandes: en karts el mínimo y el límite son los de la pista de la sala. Para no copiar números, el
// servidor importa las mismas definiciones que el juego (como server/personajes.ts importa juegos/personajes.js):
// juegos/karts-pistas.js (trazados) y juegos/arcade.js (referencia y límites). Ninguno toca el DOM al cargar.
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/mesas.js"; // karts-salida-y-puntos: cuántos bots completan la sala (igual que la página)
import type { Store } from "./store.ts";

interface Limites { minMs: number; limiteMs: number }
interface FilaPodio { id: string; ms: number | null; t?: number; avance?: number; lugar?: number; total?: number }
const ARCADE = (globalThis as unknown as {
  Arcade: {
    limitesKarts(id: string): Limites | null; LIMITE_SALA: Record<string, number>; MIN_SALA: Record<string, number>;
    limiteSala(juego: string, mapa?: string): number; GRACIA_SALA: number; BOTS_SALA: { id: string }[]; mapaDeSala(juego: string, seed: number): string;
    tiempoBot(juego: string, mapa: string, seed: number, botId: string): number; podioCarrera(filas: FilaPodio[]): FilaPodio[];
  };
}).Arcade;
const MESAS = (globalThis as unknown as { Mesas: { botsEnMesa(juego: string, humanos: number, conBots: boolean, opciones?: Record<string, string>): number | null } }).Mesas;

// Reglas generales por juego (karts: el menor mínimo y el mayor límite de sus pistas).
export const CARRERAS: Record<string, Limites> = {
  plataformas: { minMs: ARCADE.MIN_SALA.plataformas, limiteMs: ARCADE.LIMITE_SALA.plataformas },
  karts: { minMs: ARCADE.MIN_SALA.karts, limiteMs: ARCADE.LIMITE_SALA.karts },
};
// Mínimo y límite de la carrera de una sala: en karts los de su pista (si se conoce); null si el juego no es carrera.
export function reglasCarrera(juego: string, mapa?: string): Limites | null {
  if (!CARRERAS[juego]) return null;
  if (juego === "karts" && mapa) return ARCADE.limitesKarts(mapa) ?? CARRERAS.karts;
  return CARRERAS[juego];
}
// Mapas de sala: niveles normales de los mundos jugables y pistas (igual que Arcade.mapaDeSala / PISTAS). El mapa
// vive en sala.opciones.mapa para que la revancha lo herede.
export const MAPAS_SALA: Record<string, string[]> = {
  plataformas: ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"],
  karts: ["pradera", "desierto", "hielo", "volcan", "tenochtitlan", "teotihuacan", "chichen", "laventa"], // juegos-en-vivo: también las mesoamericanas
};
// Mapa pedido (si es válido) o uno al azar; null si se pidió uno que no existe.
export function mapaDeSala(juego: string, pedido: unknown, azar: number): string | null {
  const lista = MAPAS_SALA[juego];
  if (pedido === undefined || pedido === "" || pedido === null) return lista[azar % lista.length];
  return lista.includes(String(pedido)) ? String(pedido) : null;
}
const ADELANTO_MS = 3_000; // el tiempo no puede pasar del reloj del servidor más este margen
const ATRASO_MS = 20_000; // ni quedarse más corto que el reloj menos este margen (envío tardío o red lenta)

export interface Carrera {
  ms: number | null; // null = no terminó
  monedas: number;
  avance?: number; // karts-salida-y-puntos: ‰ de la carrera recorrido, solo si no terminó (orden de quien no llegó)
}

const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;

// Valida { ms, monedas } (o { ms: null, monedas, avance? }) contra los límites del juego (y de la pista) y el reloj
// del servidor (ahora − inicio). Devuelve la carrera o null.
export function validarCarrera(juego: string, crudo: unknown, inicio: number, ahora: number, mapa?: string): Carrera | null {
  const reglas = reglasCarrera(juego, mapa);
  if (!reglas || !crudo || typeof crudo !== "object" || Array.isArray(crudo)) return null;
  const c = crudo as Record<string, unknown>;
  const k = Object.keys(c);
  const conAvance = k.length === 3 && k.includes("avance") && c.ms === null;
  if (!(k.length === 2 || conAvance) || !k.includes("ms") || !k.includes("monedas") || !entero(c.monedas, 0, 999)) return null;
  if (conAvance && !entero(c.avance, 0, 999)) return null;
  if (c.ms === null) return { ms: null, monedas: c.monedas as number, ...(conAvance ? { avance: c.avance as number } : {}) };
  if (!entero(c.ms, reglas.minMs, reglas.limiteMs)) return null;
  const transcurrido = ahora - inicio;
  const ms = c.ms as number;
  if (ms > transcurrido + ADELANTO_MS || ms < transcurrido - ATRASO_MS) return null;
  return { ms, monedas: c.monedas as number };
}

// karts-salida-y-puntos: puntos de partida de `jugadorId` en una carrera suelta de sala (karts sin copa y Axo), con el
// podio del servidor (Arcade.podioCarrera: personas por orden de entrada + los bots que completan la sala, igual que
// la página). null si la sala no es una carrera suelta; "en_curso" si todavía falta alguien y no vence el límite + la
// gracia. La página nunca decide los puntos: POST /juegos/partida guarda estos.
interface SalaCarrera { juego: string; opciones?: Record<string, string>; seed: number; inicio: number | null; bots: boolean }
interface AsientoCarrera { id: string; unido: number; carrera?: Carrera & { t: number } }
export async function rankingCarreraSala(store: Store, codigo: string, jugadorId: string, ahora: number): Promise<number | "en_curso" | null> {
  const sala = (await store.get<SalaCarrera>(`juegos/salas/${codigo}/sala.json`))?.data;
  if (!sala || !CARRERAS[sala.juego] || sala.inicio === null || sala.opciones?.modo === "copa") return null;
  const nombres = (await store.list(`juegos/salas/${codigo}`)).filter((n) => n.endsWith(".json") && n !== "sala.json");
  const personas = (await Promise.all(nombres.map((n) => store.get<AsientoCarrera>(`juegos/salas/${codigo}/${n}`))))
    .filter((d) => d?.data?.id).map((d) => d!.data).sort((a, b) => a.unido - b.unido);
  const mapa = sala.opciones?.mapa || ARCADE.mapaDeSala(sala.juego, sala.seed);
  const vence = sala.inicio + ARCADE.limiteSala(sala.juego, mapa) + ARCADE.GRACIA_SALA;
  if (ahora < vence && !personas.every((p) => p.carrera)) return "en_curso";
  const nb = MESAS.botsEnMesa(sala.juego, personas.length, sala.bots, sala.opciones) ?? (sala.bots ? ARCADE.BOTS_SALA.length : 0);
  const filas: FilaPodio[] = [
    ...personas.map((p) => ({ id: p.id, ms: p.carrera ? p.carrera.ms : null, t: p.carrera?.t, avance: p.carrera?.avance })),
    ...ARCADE.BOTS_SALA.slice(0, nb).map((b) => ({ id: b.id, ms: ARCADE.tiempoBot(sala.juego, mapa, sala.seed, b.id) })),
  ];
  return ARCADE.podioCarrera(filas).find((f) => f.id === jugadorId)?.total ?? 0;
}
