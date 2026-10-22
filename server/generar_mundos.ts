// CLI: escribe contenido/secundaria/mundos.json en una copia local del repo de datos a partir de comun/gamificacion.js
// (fuente de nombres y fechas; openspec: rpg-fase2-misiones). Conserva `misionPrincipal` si el archivo ya la trae.
// Uso: deno run --allow-read --allow-write server/generar_mundos.ts <dir-datos>
// deno-lint-ignore-file no-explicit-any
import "../comun/gamificacion.js";

const G = (globalThis as any).Gamificacion;
const dir = Deno.args[0];
if (!dir) {
  console.error("Uso: deno run --allow-read --allow-write server/generar_mundos.ts <dir-datos>");
  Deno.exit(2);
}
const ruta = `${dir}/contenido/secundaria/mundos.json`;
let previo: { mundos?: { id: string; misionPrincipal?: string }[] } = {};
try { previo = JSON.parse(await Deno.readTextFile(ruta)); } catch { /* aún no existe */ }
const mundos = G.catalogoDeMundos().map((w: any) => {
  const mp = previo.mundos?.find((p) => p.id === w.id)?.misionPrincipal;
  return { id: w.id, materia: w.materia, nombre: w.nombre, emoji: w.emoji, etapa: w.etapa, desde: w.desde, hasta: w.hasta, ...(mp ? { misionPrincipal: mp } : {}) };
});
await Deno.writeTextFile(ruta, JSON.stringify({ mundos }, null, 2) + "\n");
console.log(`${ruta}: ${mundos.length} mundos`);
