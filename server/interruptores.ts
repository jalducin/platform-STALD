// Interruptores públicos de la plataforma (openspec: rpg-privacidad). Piezas que ya están en `main` pero que el profe
// enciende cuando quiere, con un cambio de dato y sin redeploy (patrón de `plataforma-rpg`: interruptores en
// `stald_docs`).
//
// - Documento: `config/interruptores.json` = `{ "privacidad": false }`.
//   - Con Postgres (producción): la fila `path = 'config/interruptores.json'` de `stald_docs`.
//   - Sin Postgres (pruebas y servidor local con DATA_DIR): el mismo archivo en el almacén de datos.
// - `GET /interruptores` (pública, sin sesión) devuelve solo las llaves conocidas, siempre booleanas.
// - Falla cerrada: si el documento no existe, no se puede leer o trae otra cosa, todo queda APAGADO.
// - Se guarda en memoria 60 s: encender o apagar tarda a lo más un minuto en notarse (más la caché HTTP de 60 s).

import type { Db } from "./db.ts";
import { v } from "./db.ts";
import type { Store } from "./store.ts";

export const RUTA_INTERRUPTORES = "config/interruptores.json";

// Llaves conocidas y su valor por omisión (todas apagadas). Una llave nueva se agrega aquí y en docs/data-model.md.
export const INTERRUPTORES_POR_OMISION = { privacidad: false } as const;
export type Interruptores = { -readonly [K in keyof typeof INTERRUPTORES_POR_OMISION]: boolean };

const apagados = (): Interruptores => ({ ...INTERRUPTORES_POR_OMISION });

// Solo las llaves conocidas y solo `true` estricto enciende (un "true" de texto o un 1 no cuentan).
export function normalizarInterruptores(data: unknown): Interruptores {
  const r = apagados();
  if (!data || typeof data !== "object" || Array.isArray(data)) return r;
  for (const k of Object.keys(r) as (keyof Interruptores)[]) r[k] = (data as Record<string, unknown>)[k] === true;
  return r;
}

export interface DepsInterruptores {
  db: Db | null;
  store: () => Promise<Store>;
  ahora?: () => number;
}

// Lector con caché de 60 s. Si la lectura falla, responde apagado y lo registra (no guarda el fallo en caché más de
// 60 s, igual que un valor bueno).
export function crearLectorInterruptores(deps: DepsInterruptores, ttlMs = 60_000) {
  const ahora = deps.ahora ?? Date.now;
  let cache: { t: number; valor: Interruptores } | null = null;
  return async function leer(): Promise<Interruptores> {
    if (cache && ahora() - cache.t < ttlMs) return cache.valor;
    let valor: Interruptores;
    try {
      if (deps.db) {
        const filas = await deps.db.select<{ data: unknown }>("docs", `path=eq.${v(RUTA_INTERRUPTORES)}&select=data`);
        valor = normalizarInterruptores(filas[0]?.data);
      } else {
        const doc = await (await deps.store()).get(RUTA_INTERRUPTORES);
        valor = normalizarInterruptores(doc?.data);
      }
    } catch (e) {
      console.error("interruptores:", e instanceof Error ? e.message : e);
      valor = apagados();
    }
    cache = { t: ahora(), valor };
    return valor;
  };
}
