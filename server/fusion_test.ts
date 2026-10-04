// Sprint 4 (openspec: juegos-fusion): juegos fusionados, absorbidos fuera de partidas y cultura con IA y tecnología.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

Deno.test("fusión: los absorbidos ya no se crean en partida; los fusionados sí", async () => {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps: any = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve([{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }]),
    filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-03", ahora: () => "2026-10-03T18:00:00.000Z",
  };
  const crear = async (juego: string) => {
    clearCacheSalas();
    const req = new Request("http://x/juegos/sala?email=marisol@example.com", { method: "POST", body: JSON.stringify({ juego, opciones: {}, bots: true }) });
    const res = await handleJuegos(req, "/sala", "marisol@example.com", deps, json);
    return { status: res.status, body: await res.json() };
  };
  for (const j of ["en-preguntas", "es-acentos", "es-sinonimos", "mente-secuencias"]) {
    const r = await crear(j);
    assertEquals([r.status, r.body.error], [400, "juego_no_permitido"], j);
  }
  for (const j of ["en-frases", "es-ortografia", "mente-calculo"]) assertEquals((await crear(j)).status, 200, j);
  // Los puntos viejos se conservan: el catálogo los sigue conociendo
  for (const j of ["en-preguntas", "es-acentos", "es-sinonimos", "mente-secuencias"]) assert((CATALOGO as any)[j], j);
  assertEquals([(CATALOGO as any)["en-frases"].titulo, (CATALOGO as any)["es-ortografia"].titulo, (CATALOGO as any)["mente-calculo"].titulo],
    ["Completa y responde", "Ortografía", "Cálculo y secuencias"]);
});

Deno.test("fusión: cultura con IA y tecnología (6/6/4 preguntas válidas)", async () => {
  const d = JSON.parse(await Deno.readTextFile(new URL("../juegos/datos/cultura.json", import.meta.url)));
  for (const id of ["ia", "tecnologia"]) {
    assert(d.categorias.some((c: any) => c.id === id && c.titulo && c.emoji), "categoría " + id);
    const ps = d.preguntas.filter((p: any) => p.cat === id);
    assertEquals([1, 2, 3].map((n) => ps.filter((p: any) => p.nivel === n).length), [6, 6, 4], id);
    for (const p of ps) {
      assert(p.pregunta && p.dato && p.opciones.length === 4 && new Set(p.opciones).size === 4, p.pregunta);
      assert(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, p.pregunta);
    }
    // Las respuestas correctas no siempre van en la misma posición
    assert(new Set(ps.map((p: any) => p.correcta)).size >= 3, id + ": posiciones variadas");
  }
});
