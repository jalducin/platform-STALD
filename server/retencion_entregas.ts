// Retención de entregas de misiones (openspec: rpg-fase2-misiones, requisito «Privacidad y retención de entregables»):
// cada 31 de agosto (fin de ciclo 31 de julio + 30 días) se borra el TEXTO de todas las entregas y se conserva solo la
// evaluación (puntos, XP y fecha). Programado en Deno Deploy con Deno.cron (server/main.ts, CRON_RETENCION) y, a mano,
// con las variables de Deno Deploy:
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… deno run -A server/retencion_entregas.ts            (simulación: no escribe)
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… deno run -A server/retencion_entregas.ts --confirmar (borra)
// STALD_TABLAS elige el prefijo (stald_test_ en pruebas). Sin llaves, sale con código 2.
import { createDb, type Db, v } from "./db.ts";
import { type Entrega, PREFIJO_BORRADOR_MISION, sinContenido } from "./misiones.ts";

interface FilaEntrega { path: string; data: Entrega; version: number }

// Entregas que aún tienen texto y cómo quedan sin él (pura; la usan el script y sus pruebas).
export function conRetencion(filas: FilaEntrega[], ahora: string): FilaEntrega[] {
  return filas.filter((f) => Object.values(f.data?.pasos || {}).some((p) => p.texto !== null))
    .map((f) => ({ ...f, data: sinContenido(structuredClone(f.data), ahora, "retencion") }));
}

// Escribe una entrega sin texto con concurrencia optimista: si cambió entre la lectura y la escritura (0 filas), la
// vuelve a leer y reintenta hasta 3 veces. true = ya no tiene texto.
async function borrarUna(db: Db, inicial: FilaEntrega, ahora: string): Promise<boolean> {
  let f: FilaEntrega | undefined = inicial;
  for (let i = 0; i < 3; i++) {
    if (!f) return true; // ya no tiene texto (o ya no existe)
    const filtro = `path=eq.${v(f.path)}&version=eq.${f.version}`;
    if ((await db.update("docs", filtro, { data: f.data, version: f.version + 1, actualizado: ahora })).length === 1) return true;
    const frescas: FilaEntrega[] = await db.select<FilaEntrega>("docs", `path=eq.${v(inicial.path)}&select=path,data,version`);
    f = frescas[0] ? conRetencion([frescas[0]], ahora)[0] : undefined;
  }
  return !f;
}

// Con `confirmar`, borra cada una; lo que no se pudo queda en `pendientes` (el script sale con 1).
export async function aplicarRetencion(db: Db, ahora: string, confirmar: boolean): Promise<{ revisadas: number; borradas: number; pendientes: string[] }> {
  const filas = await db.select<FilaEntrega>("docs", `path=like.${v("entregas/*")}&select=path,data,version`);
  const cambios = conRetencion(filas, ahora);
  if (!confirmar) return { revisadas: filas.length, borradas: cambios.length, pendientes: [] };
  const pendientes: string[] = [];
  for (const f of cambios) if (!await borrarUna(db, f, ahora)) pendientes.push(f.path);
  return { revisadas: filas.length, borradas: cambios.length - pendientes.length, pendientes };
}

// Borradores de misiones (texto libre que no se envió; openspec: autoguardado-todo): en la misma retención se borran
// enteros. Con `confirmar` false solo cuenta.
export async function aplicarRetencionBorradores(db: Db, confirmar: boolean): Promise<{ revisados: number; borrados: number }> {
  const filtro = `path=like.${v(PREFIJO_BORRADOR_MISION + "*")}`;
  const filas = await db.select<{ path: string }>("docs", `${filtro}&select=path`);
  if (!confirmar || !filas.length) return { revisados: filas.length, borrados: 0 };
  return { revisados: filas.length, borrados: (await db.remove("docs", filtro)).length };
}

// Cada 31 de agosto a las 12:00 UTC (6:00 en la Ciudad de México), en Deno Deploy (lo programa server/main.ts).
export const CRON_RETENCION = "0 12 31 8 *";

if (import.meta.main) {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_KEY");
  if (!url || !key) {
    console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY");
    Deno.exit(2);
  }
  const confirmar = Deno.args.includes("--confirmar");
  const db = createDb({ url, key, prefijo: Deno.env.get("STALD_TABLAS") || "stald_" });
  const r = await aplicarRetencion(db, new Date().toISOString(), confirmar);
  console.log(`${r.revisadas} entrega(s) revisadas; ${r.borradas} ${confirmar ? "sin contenido ahora" : "se borrarían (simulación; usa --confirmar)"}`);
  const rb = await aplicarRetencionBorradores(db, confirmar);
  console.log(`${rb.revisados} borrador(es) de misiones; ${confirmar ? rb.borrados + " borrados" : "se borrarían (simulación)"}`);
  if (r.pendientes.length) {
    console.error(`No se pudieron borrar ${r.pendientes.length}: vuelve a correrlo.`);
    Deno.exit(1);
  }
}
