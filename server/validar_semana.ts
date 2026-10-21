// CLI: valida una semana de la copia local del repo de datos antes de subirla.
// Uso: deno run --allow-read server/validar_semana.ts <dir-datos> <lunes AAAA-MM-DD> [--profe | --secundaria]
// Con --profe valida una semana de la ruta del profe (contenido/profe/, patrón lun/mié/jue/sáb). La ruta del profe va a
// su ritmo (openspec: profe-ruta-abierta): disponibleDesde puede ser anterior al lunes y el examen no espera su día.
// Con --secundaria valida una semana de Secundaria (contenido/secundaria/, openspec: secundaria-mis-clases): sin patrón
// de días, el examen mensual puede tener ventana y `materia` fuera de las 8 conocidas es aviso.
// Sale con código 1 si hay errores; los avisos no bloquean.
import { AMBITO_CLASE, AMBITO_PROFE, AMBITO_SECUNDARIA } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { MemoryStore } from "./store.ts";

const USO = "Uso: deno run --allow-read server/validar_semana.ts <dir-datos> <lunes AAAA-MM-DD> [--profe | --secundaria]";
const BANDERAS = ["--profe", "--secundaria"];
const banderas = Deno.args.filter((a) => a.startsWith("--"));
const [dir, lunes] = Deno.args.filter((a) => !a.startsWith("--"));
const desconocidas = banderas.filter((b) => !BANDERAS.includes(b));
if (!dir || !lunes || desconocidas.length || banderas.length > 1) {
  if (desconocidas.length) console.error(`Bandera desconocida: ${desconocidas.join(", ")}`);
  if (banderas.length > 1) console.error("Usa solo una bandera: --profe o --secundaria");
  console.error(USO);
  Deno.exit(2);
}
const ambito = banderas[0] === "--profe" ? AMBITO_PROFE : banderas[0] === "--secundaria" ? AMBITO_SECUNDARIA : AMBITO_CLASE;
const { errores, avisos } = await validarSemana(await MemoryStore.fromDir(dir), lunes, ambito);
for (const e of errores) console.log(`❌ ${e}`);
for (const a of avisos) console.log(`⚠️  ${a}`);
console.log(`Semana ${lunes}: ${errores.length} error(es), ${avisos.length} aviso(s)`);
Deno.exit(errores.length ? 1 : 0);
