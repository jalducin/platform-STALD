// Espejos de ai-specs (openspec: hook-y-subagentes; base-standards §6). En Windows los symlinks quedaban como archivos de
// texto con la ruta y Claude Code no veía agentes ni skills: ahora .claude/ y .gemini/ son copias exactas de ai-specs/,
// generadas con `node ai-specs/scripts/sincronizar-espejos.mjs`. Si alguien edita la fuente y no sincroniza, esto falla.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { fromFileUrl, join } from "jsr:@std/path@1";

const RAIZ = fromFileUrl(new URL("..", import.meta.url));
const ESPEJOS = [".claude", ".gemini"];

async function archivos(dir: string, base = ""): Promise<string[]> {
  const out: string[] = [];
  for await (const e of Deno.readDir(join(dir, base))) {
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isDirectory) out.push(...await archivos(dir, rel));
    else out.push(rel);
  }
  return out.sort();
}

for (const tipo of ["agents", "skills"]) {
  Deno.test(`espejos: ${tipo} de .claude y .gemini idénticos a ai-specs`, async () => {
    const fuente = join(RAIZ, "ai-specs", tipo);
    for (const rel of await archivos(fuente)) {
      const esperado = await Deno.readFile(join(fuente, rel));
      for (const espejo of ESPEJOS) {
        const ruta = join(RAIZ, espejo, tipo, rel);
        let real: Uint8Array;
        try {
          real = await Deno.readFile(ruta);
        } catch {
          throw new Error(`falta ${espejo}/${tipo}/${rel}: corre node ai-specs/scripts/sincronizar-espejos.mjs`);
        }
        assertEquals(real, esperado, `${espejo}/${tipo}/${rel} difiere de ai-specs: corre el script de espejos`);
      }
    }
  });
}

Deno.test("espejos: no sobra nada en .claude ni .gemini (salvo skills openspec-*)", async () => {
  for (const tipo of ["agents", "skills"]) {
    const fuente = new Set<string>();
    for await (const e of Deno.readDir(join(RAIZ, "ai-specs", tipo))) fuente.add(e.name);
    for (const espejo of ESPEJOS) {
      for await (const e of Deno.readDir(join(RAIZ, espejo, tipo))) {
        if (tipo === "skills" && e.name.startsWith("openspec-")) continue;
        assert(fuente.has(e.name), `${espejo}/${tipo}/${e.name} sobra: ya no existe en ai-specs (corre el script)`);
      }
      for (const nombre of fuente) {
        if (!(await Deno.stat(join(RAIZ, "ai-specs", tipo, nombre))).isDirectory) continue;
        const a = await archivos(join(RAIZ, "ai-specs", tipo), nombre);
        const b = await archivos(join(RAIZ, espejo, tipo), nombre);
        assertEquals(b, a, `${espejo}/${tipo}/${nombre} tiene archivos de más o de menos`);
      }
    }
  }
});

Deno.test("espejos: subagentes del proyecto son de solo lectura", async () => {
  for (const nombre of ["revisor-solo-lectura", "verificador-pruebas"]) {
    const md = await Deno.readTextFile(join(RAIZ, "ai-specs", "agents", nombre + ".md"));
    const front = md.split("---")[1] ?? "";
    assert(front.includes(`name: ${nombre}`), nombre + ": name");
    assert(/description: .{40,}/.test(front), nombre + ": description que diga cuándo usarlo");
    const tools = front.match(/tools: (.*)/)?.[1] ?? "";
    assert(tools.length > 0, nombre + ": tools explícitas");
    assert(!/\b(Edit|Write|NotebookEdit)\b/.test(tools), nombre + ": sin herramientas de edición");
    assert(!/[A-Za-z]:[\\/]|\/c\/Users|\/home\//.test(md), nombre + ": sin rutas absolutas ni usuario local");
  }
});
