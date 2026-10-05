// Migra los datos vivos de Inglés del repo de datos (JSON) a Postgres (openspec: ingles-grupos).
// Uso:   deno run -A herramientas/migrar-ingles.ts --datos <copia del repo de datos> [--prueba | --delta] [--forzar]
// Env:   SUPABASE_URL, SUPABASE_SERVICE_KEY (solo en el proceso, nunca en archivos) y STALD_TABLAS (stald_ / stald_test_).
//  --prueba  solo cuenta lo que copiaría (no escribe).
//  (normal)  copia todo 1 a 1, verifica conteos y 3 documentos al azar, y escribe la marca meta/migrado.
//            Se niega si la marca ya existe (para no pisar datos nuevos), salvo con --forzar.
//  --delta   segunda pasada tras el corte: agrega lo que falte y actualiza resultados con más intentos en GitHub.
//  --juegos  migra juegos/** (salas, partidas, perfiles, fotos, invitados) con la marca meta/migrado-juegos
//            (openspec: cierre-tecnico). En --delta solo agrega lo que falte.
import { createDb, v } from "../server/db.ts";

const args = Deno.args;
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const datos = arg("--datos");
if (!datos) { console.error("Falta --datos <carpeta>"); Deno.exit(2); }
const modo = args.includes("--prueba") ? "prueba" : args.includes("--delta") ? "delta" : "normal";
const juegos = args.includes("--juegos");
const MARCA = juegos ? "meta/migrado-juegos" : "meta/migrado";
const env = (k: string) => Deno.env.get(k) || "";
if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_KEY")) { console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el entorno"); Deno.exit(2); }
const db = createDb({ url: env("SUPABASE_URL"), key: env("SUPABASE_SERVICE_KEY"), prefijo: env("STALD_TABLAS") || "stald_" });

// Archivos a migrar: alumnos.json, resultados/**/*.json y avance/**/*.json
async function* recorrer(dir: string, rel = ""): AsyncGenerator<string> {
  for await (const e of Deno.readDir(dir + (rel ? "/" + rel : ""))) {
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory) yield* recorrer(dir, r);
    else if (e.name.endsWith(".json")) yield r;
  }
}
const docs: { path: string; data: unknown }[] = [];
if (!juegos) { try { docs.push({ path: "alumnos.json", data: JSON.parse(await Deno.readTextFile(datos + "/alumnos.json")) }); } catch { /* sin registro */ } }
for (const raiz of juegos ? ["juegos"] : ["resultados", "avance"]) {
  try { for await (const r of recorrer(datos + "/" + raiz)) docs.push({ path: raiz + "/" + r, data: JSON.parse(await Deno.readTextFile(datos + "/" + raiz + "/" + r)) }); } catch { /* sin carpeta */ }
}
const cuenta = (pre: string) => docs.filter((d) => d.path.startsWith(pre)).length;
console.log(`Archivos: ${docs.length} (${juegos ? `juegos ${cuenta("juegos/")}` : `alumnos.json ${cuenta("alumnos.json")}, resultados ${cuenta("resultados/")}, avance ${cuenta("avance/")}`}) · tablas ${env("STALD_TABLAS") || "stald_"} · modo ${modo}`);
if (modo === "prueba") Deno.exit(0);

const marca = await db.select("docs", `path=eq.${v(MARCA)}&select=path`);
const ahora = new Date().toISOString();
const intentos = (d: unknown): number => ((d as { intentos?: unknown[] })?.intentos ?? []).length;

if (modo === "normal") {
  if (marca.length && !args.includes("--forzar")) { console.error(`Ya está migrado (${MARCA}). Usa --delta, o --forzar si de verdad quieres pisar todo.`); Deno.exit(1); }
  for (let i = 0; i < docs.length; i += 50) await db.upsert("docs", docs.slice(i, i + 50).map((d) => ({ ...d, version: 1, actualizado: ahora })), "path");
} else {
  const hay = new Map((await db.select<{ path: string; data: unknown; version: number }>("docs", `path=like.${v((juegos ? "juegos/" : "") + "*")}&select=path,data,version`)).map((f) => [f.path, f]));
  let nuevos = 0, actualizados = 0;
  for (const d of docs) {
    const pg = hay.get(d.path);
    if (!pg) { await db.insert("docs", { ...d, version: 1, actualizado: ahora }, { ignorarDuplicados: true }); nuevos++; }
    else if (!juegos && d.path.startsWith("resultados/") && intentos(d.data) > intentos(pg.data)) {
      await db.update("docs", `path=eq.${v(d.path)}&version=eq.${pg.version}`, { data: d.data, version: pg.version + 1, actualizado: ahora }); actualizados++;
    }
  }
  console.log(`Delta: ${nuevos} nuevos, ${actualizados} actualizados (GitHub tenía más intentos)`);
}

// Verificación: conteos y 3 documentos al azar campo por campo
const enPg = new Map((await db.select<{ path: string; data: unknown }>("docs", `path=like.${v((juegos ? "juegos/" : "") + "*")}&select=path,data`)).filter((f) => !f.path.startsWith("meta/") && (juegos ? f.path.startsWith("juegos/") : !f.path.startsWith("juegos/"))).map((f) => [f.path, f.data]));
const faltan = docs.filter((d) => !enPg.has(d.path)).map((d) => d.path);
const muestra = [...docs].sort(() => Math.random() - 0.5).slice(0, 3);
// jsonb reordena las llaves: se compara en forma canónica (llaves ordenadas).
const canon = (x: unknown): string => Array.isArray(x) ? "[" + x.map(canon).join(",") + "]" : x && typeof x === "object" ? "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon((x as Record<string, unknown>)[k])).join(",") + "}" : JSON.stringify(x);
const iguales = muestra.filter((d) => canon(enPg.get(d.path)) === canon(d.data) || (modo === "delta" && intentos(enPg.get(d.path)) >= intentos(d.data))).length;
console.log(`Verificación: ${enPg.size} en Postgres · faltan ${faltan.length} · muestra ${iguales}/${muestra.length} idénticos (${muestra.map((d) => d.path).join(", ")})`);
if (faltan.length || iguales !== muestra.length) { console.error("❌ La verificación falló: NO se escribe la marca.", faltan.slice(0, 5)); Deno.exit(1); }

if (modo === "normal") {
  await db.upsert("docs", { path: MARCA, data: { en: ahora, archivos: docs.length }, version: 1, actualizado: ahora }, "path");
  console.log(`✅ Marca ${MARCA} escrita: el servidor empieza a usar Postgres en ≤ 60 s.`);
}
