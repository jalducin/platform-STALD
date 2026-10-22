// Retención de entregas de misiones (openspec: rpg-fase2-misiones, requisito «Privacidad y retención de entregables»):
// cada 31 de agosto (fin de ciclo 31 de julio + 30 días) se borra el TEXTO de todas las entregas y se conserva solo la
// evaluación (puntos, XP y fecha). Corre a mano o programado con las variables de Deno Deploy:
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… deno run -A server/retencion_entregas.ts            (simulación: no escribe)
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… deno run -A server/retencion_entregas.ts --confirmar (borra)
// STALD_TABLAS elige el prefijo (stald_test_ en pruebas). Sin llaves, sale con código 2.
import { createDb, type Db, v } from "./db.ts";
import { type Entrega, sinContenido } from "./misiones.ts";

interface FilaEntrega { path: string; data: Entrega; version: number }

// Entregas que aún tienen texto y cómo quedan sin él (pura; la usan el script y sus pruebas).
export function conRetencion(filas: FilaEntrega[], ahora: string): FilaEntrega[] {
  return filas.filter((f) => Object.values(f.data?.pasos || {}).some((p) => p.texto !== null))
    .map((f) => ({ ...f, data: sinContenido(structuredClone(f.data), ahora, "retencion") }));
}

export async function aplicarRetencion(db: Db, ahora: string, confirmar: boolean): Promise<{ revisadas: number; borradas: number }> {
  const filas = await db.select<FilaEntrega>("docs", `path=like.${v("entregas/*")}&select=path,data,version`);
  const cambios = conRetencion(filas, ahora);
  if (confirmar) {
    for (const f of cambios) await db.update("docs", `path=eq.${v(f.path)}&version=eq.${f.version}`, { data: f.data, version: f.version + 1, actualizado: ahora });
  }
  return { revisadas: filas.length, borradas: cambios.length };
}

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
}
