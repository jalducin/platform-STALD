// Copia ai-specs/agents y ai-specs/skills a .claude/ y .gemini/ (openspec: hook-y-subagentes; base-standards §6).
// En Windows los symlinks de git quedan como archivos de texto con la ruta y los agentes no los leen, así que los
// espejos son copias reales. Uso: node ai-specs/scripts/sincronizar-espejos.mjs  (idempotente).
// Borra del espejo lo que ya no está en ai-specs, salvo las skills de otras herramientas (openspec-*), que no se tocan.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ajena = (tipo, nombre) => tipo === "skills" && nombre.startsWith("openspec-");
let copiadas = 0, borradas = 0;

for (const espejo of [".claude", ".gemini"]) {
  for (const tipo of ["agents", "skills"]) {
    const fuente = join(RAIZ, "ai-specs", tipo), destinoTipo = join(RAIZ, espejo, tipo);
    const nombres = new Set(readdirSync(fuente));
    mkdirSync(destinoTipo, { recursive: true });
    for (const nombre of readdirSync(destinoTipo)) {
      if (!nombres.has(nombre) && !ajena(tipo, nombre)) {
        rmSync(join(destinoTipo, nombre), { recursive: true, force: true });
        borradas++;
      }
    }
    for (const nombre of nombres) {
      const destino = join(destinoTipo, nombre);
      // Se reemplaza entero: así desaparecen archivos sobrantes y los viejos "archivo con la ruta" de los symlinks.
      if (existsSync(destino)) rmSync(destino, { recursive: true, force: true });
      cpSync(join(fuente, nombre), destino, { recursive: true });
      copiadas++;
    }
  }
}
console.log(`Espejos sincronizados: ${copiadas} copiadas y ${borradas} sobrantes borradas en .claude/ y .gemini/`);
