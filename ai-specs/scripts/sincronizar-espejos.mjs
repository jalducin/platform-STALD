// Copia ai-specs/agents y ai-specs/skills a .claude/ y .gemini/ (openspec: hook-y-subagentes; base-standards §6).
// En Windows los symlinks de git quedan como archivos de texto con la ruta y los agentes no los leen, así que los
// espejos son copias reales. Uso: node ai-specs/scripts/sincronizar-espejos.mjs  (idempotente).
// Solo reemplaza lo que existe en ai-specs: skills propias de otras herramientas (openspec-*) no se tocan.
import { cpSync, existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let cambios = 0;

for (const espejo of [".claude", ".gemini"]) {
  for (const tipo of ["agents", "skills"]) {
    const fuente = join(RAIZ, "ai-specs", tipo);
    for (const nombre of readdirSync(fuente)) {
      const origen = join(fuente, nombre), destino = join(RAIZ, espejo, tipo, nombre);
      // Un espejo viejo puede ser un archivo con la ruta en lugar de la carpeta de la skill: se reemplaza entero.
      if (existsSync(destino) && lstatSync(destino).isDirectory() !== lstatSync(origen).isDirectory()) {
        rmSync(destino, { recursive: true, force: true });
      }
      cpSync(origen, destino, { recursive: true, force: true });
      cambios++;
    }
  }
}
console.log(`Espejos sincronizados: ${cambios} entradas en .claude/ y .gemini/`);
