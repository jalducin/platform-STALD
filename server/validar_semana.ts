// CLI: valida una semana de la copia local del repo de datos antes de subirla.
// Uso: deno run --allow-read server/validar_semana.ts <dir-datos> <lunes AAAA-MM-DD>
// Sale con código 1 si hay errores; los avisos no bloquean.
import { validarSemana } from "./semana.ts";
import { MemoryStore } from "./store.ts";

const [dir, lunes] = Deno.args;
if (!dir || !lunes) {
  console.error("Uso: deno run --allow-read server/validar_semana.ts <dir-datos> <lunes AAAA-MM-DD>");
  Deno.exit(2);
}
const { errores, avisos } = await validarSemana(await MemoryStore.fromDir(dir), lunes);
for (const e of errores) console.log(`❌ ${e}`);
for (const a of avisos) console.log(`⚠️  ${a}`);
console.log(`Semana ${lunes}: ${errores.length} error(es), ${avisos.length} aviso(s)`);
Deno.exit(errores.length ? 1 : 0);
