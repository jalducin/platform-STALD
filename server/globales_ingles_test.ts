// Los scripts clásicos de ingles.html comparten el ámbito global: dos `function` o `const` de primer nivel con el mismo
// nombre en archivos distintos hacen que el último reemplace al primero sin aviso (pasó con `leerBorrador` del examen y
// el de las misiones, openspec: rpg-fase2-misiones). Esta prueba lo impide.
import { assertEquals } from "jsr:@std/assert@1";

Deno.test("ingles.html: ningún nombre global se declara en dos scripts", async () => {
  const raiz = new URL("../", import.meta.url);
  const html = await Deno.readTextFile(new URL("ingles.html", raiz));
  const scripts = [...html.matchAll(/<script[^>]*src="([^"?]+)/g)].map((m) => m[1]).filter((s) => !s.startsWith("http"));
  const DECL = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  const donde = new Map<string, string>();
  const choques: string[] = [];
  for (const s of scripts) {
    const texto = await Deno.readTextFile(new URL(s, raiz));
    for (const m of texto.matchAll(DECL)) {
      const n = m[1] || m[2];
      if (donde.has(n) && donde.get(n) !== s) choques.push(`${n}: ${donde.get(n)} y ${s}`);
      else donde.set(n, s);
    }
  }
  assertEquals(choques, []);
});
