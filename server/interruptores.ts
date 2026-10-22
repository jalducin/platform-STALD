// Interruptores públicos de la plataforma (openspec: rpg-privacidad). Piezas que ya están en `main` pero que el profe
// enciende cuando quiere, con un cambio de dato y sin redeploy (patrón de `plataforma-rpg`: interruptores en
// `stald_docs`).
//
// - Documento: `config/interruptores.json` = `{ "privacidad": false, "ranking": false }` (`ranking`: ranking por grupo
//   de Inglés, openspec: rpg-fase2-ingles).
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
export const INTERRUPTORES_POR_OMISION = { privacidad: false, ranking: false } as const;
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
  // `olvidar()`: tras un cambio hecho en este servidor, la siguiente lectura va al dato (openspec: rpg-fase2-ingles); vence
  // la caché sin perder el valor. `ultimo()`: el último valor leído aunque la caché ya venció, o null si aún no se lee;
  // /config lo usa para no esperar la lectura (openspec: fix-e2e-rpg).
  const olvidar = () => { if (cache) cache = { t: -Infinity, valor: cache.valor }; };
  return Object.assign(leer, { olvidar, ultimo: (): Interruptores | null => cache ? { ...cache.valor } : null });
  async function leer(): Promise<Interruptores> {
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
  }
}

// Cambia una llave del documento (solo el admin, desde POST /profe/ranking; openspec: rpg-fase2-ingles). Con Postgres,
// upsert de la fila de stald_docs; sin Postgres, el almacén. Conserva las demás llaves conocidas.
export async function escribirInterruptor(deps: DepsInterruptores, clave: keyof Interruptores, valor: boolean): Promise<Interruptores> {
  if (deps.db) {
    const filas = await deps.db.select<{ data: unknown }>("docs", `path=eq.${v(RUTA_INTERRUPTORES)}&select=data`);
    const nuevo = { ...normalizarInterruptores(filas[0]?.data), [clave]: valor };
    await deps.db.upsert("docs", { path: RUTA_INTERRUPTORES, data: nuevo, actualizado: new Date().toISOString() }, "path");
    return nuevo;
  }
  const store = await deps.store();
  for (let i = 0; i < 3; i++) {
    const doc = await store.get(RUTA_INTERRUPTORES);
    const nuevo = { ...normalizarInterruptores(doc?.data), [clave]: valor };
    if (await store.put(RUTA_INTERRUPTORES, nuevo, doc?.sha ?? null, `interruptores: ${clave}`)) return nuevo;
  }
  throw new Error("conflicto_escritura");
}

// Documentos de configuración propios de una pieza (p. ej. `gamificacion/config.json`, apagado por grupo): se leen en
// cada petición y se cambian con concurrencia optimista.
export async function leerConfigDoc<T extends object>(store: Store, ruta: string, porDefecto: T): Promise<T> {
  const doc = await store.get<Partial<T>>(ruta);
  return { ...porDefecto, ...(doc?.data && typeof doc.data === "object" ? doc.data : {}) };
}
export async function cambiarConfigDoc<T extends object>(store: Store, ruta: string, porDefecto: T, cambio: (actual: T) => T, mensaje: string): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<Partial<T>>(ruta);
    const nueva = cambio({ ...porDefecto, ...(doc?.data ?? {}) });
    if (await store.put(ruta, nueva, doc?.sha ?? null, mensaje)) return nueva;
  }
  return null;
}
