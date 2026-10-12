// Sprint 4 (openspec: juegos-ingles-gramatica): Máquina del tiempo en partida y tema de la sala en Completa y responde.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, JUEGOS_PARTIDA } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function preparar() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps: any = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve([{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }]),
    filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-11", ahora: () => "2026-10-11T18:00:00.000Z",
  };
  const pedir = async (ruta: string, body: unknown, metodo = "POST") => {
    clearCacheSalas();
    const req = new Request("http://x/juegos" + ruta + "?email=marisol@example.com", { method: metodo, ...(metodo === "POST" ? { body: JSON.stringify(body) } : {}) });
    const res = await handleJuegos(req, ruta, "marisol@example.com", deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, pedir };
}

Deno.test("en-tiempos: en el catálogo de Inglés con tope 2,000 y permitido en partida", () => {
  assertEquals((CATALOGO as any)["en-tiempos"], { categoria: "ingles", titulo: "Máquina del tiempo", max: 2000 });
  assert(JUEGOS_PARTIDA.has("en-tiempos"));
});

Deno.test("en-tiempos: se crea la sala, se responde y se guarda como partida", async () => {
  const { pedir } = preparar();
  const c = await pedir("/sala", { juego: "en-tiempos", opciones: {}, bots: true });
  assertEquals(c.status, 200);
  const codigo = c.body.codigo;
  assertEquals((await pedir(`/sala/${codigo}/empezar`, {})).status, 200);
  const r = await pedir(`/sala/${codigo}/respuesta`, { q: 0, correcta: true, puntos: 180, ms: 3000 });
  assertEquals([r.status, r.body.respuestas["0"].puntos], [200, 180]);
  const g = await pedir("/partida", { juego: "en-tiempos", puntos: 180, aciertos: 1, total: 10, segundos: 0, sala: codigo });
  assertEquals([g.status, g.body.modo, g.body.puntos], [200, "sala", 180]);
});

Deno.test("en-frases: el tema va en las opciones de la sala; por omisión «todo»", async () => {
  const { pedir } = preparar();
  for (const tema of ["todo", "tobe", "presente", "pasado", "futuro"]) {
    const r = await pedir("/sala", { juego: "en-frases", opciones: { tema }, bots: true });
    assertEquals([r.status, r.body.sala.opciones.tema], [200, tema], tema);
  }
  const sin = await pedir("/sala", { juego: "en-frases", opciones: {}, bots: true });
  assertEquals(sin.body.sala.opciones.tema, "todo");
});

Deno.test("en-frases: tema inválido → 400 tema_invalido; otros juegos ignoran el tema", async () => {
  const { pedir } = preparar();
  for (const tema of ["marciano", "", 3, "TODO"]) {
    const r = await pedir("/sala", { juego: "en-frases", opciones: { tema }, bots: true });
    assertEquals([r.status, r.body.error], [400, "tema_invalido"], String(tema));
  }
  const v = await pedir("/sala", { juego: "en-vocab", opciones: { tema: "pasado" }, bots: true });
  assertEquals([v.status, v.body.sala.opciones.tema], [200, undefined]);
});
