// Categorías divertidas de Basta y robo de ¡Una! hasta poder tirar (openspec: basta-divertida-una-robo).
// Los motores puros (juegos/basta.js y juegos/una.js) son los mismos archivos que carga juegos.html.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/basta.js";
import "../juegos/una.js";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, EXTRAS_BASTA, MAX_EXTRAS_BASTA } from "./salas.ts";
import { MemoryStore } from "./store.ts";

const Basta = (globalThis as any).Basta;
const Una = (globalThis as any).Una;
const datosBasta = JSON.parse(await Deno.readTextFile(new URL("../juegos/datos/basta.json", import.meta.url)));

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Sisifo"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-09-30T18:00:00.000Z");
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avanzar: (ms: number) => { t += ms; } };
}

// ---- Basta: categorías divertidas ----
Deno.test("basta-extra: la lista del servidor, la del módulo y la de basta.json coinciden (10, máximo 2)", () => {
  const ids = datosBasta.extras.map((x: any) => x.id);
  assertEquals(ids.length, 10);
  assertEquals([...EXTRAS_BASTA], ids);
  assertEquals(Basta.CONOCIDAS, ids);
  assertEquals(MAX_EXTRAS_BASTA, 2);
  assertEquals(Basta.MAX_EXTRAS, MAX_EXTRAS_BASTA);
  for (const x of datosBasta.extras) {
    assert(x.emoji && x.titulo && Array.isArray(x.palabras) && x.palabras.length >= 15, x.id);
    assert(x.palabras.every((w: string) => w.length <= 40), x.id + ": palabras de 40 letras o menos");
    assert(!datosBasta.es.categorias.some((c: any) => c.id === x.id) && !datosBasta.en.categorias.some((c: any) => c.id === x.id), x.id + ": id distinto de las categorías de siempre");
  }
});

Deno.test("basta-extra: crear sala con categorías divertidas (arreglo o texto) y validarlas", async () => {
  const c = ctx();
  const crear = (opciones: unknown, juego = "basta-es") => c.call("POST", "/sala", "marisol@example.com", { juego, opciones, bots: true });
  const a = await crear({ rondas: "5", extra: ["pokemon", "antojito"] });
  assertEquals([a.status, a.body.sala.opciones], [200, { rondas: "5", extra: "pokemon,antojito" }]);
  assertEquals((await crear({ extra: "flor" }, "basta-en")).body.sala.opciones.extra, "flor");
  assertEquals((await crear({ extra: [] })).body.sala.opciones.extra, undefined, "sin extras no hay clave");
  assertEquals((await crear({})).body.sala.opciones.extra, undefined);
  for (const extra of [["pokemon", "dragones"], "nada", ["pokemon", "flor", "anime"], ["flor", "flor"], [3], { a: 1 }]) {
    const r = await crear({ extra });
    assertEquals([r.status, r.body.error], [400, "extras_invalidas"], JSON.stringify(extra));
  }
  assertEquals((await c.call("POST", "/sala", "marisol@example.com", { juego: "cultura", opciones: { cat: "todas", extra: ["pokemon"] } })).body.sala.opciones.extra, undefined, "solo Basta");
});

Deno.test("basta-extra: la revancha hereda las categorías divertidas y acepta las palabras de la columna extra", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol@example.com", { juego: "basta-es", opciones: { rondas: "5", extra: ["pokemon", "refri"] }, bots: true });
  const codigo = r.body.codigo as string;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(20_000);
  // 7 de siempre + 2 divertidas = 9 columnas (el servidor guarda hasta 10)
  const palabras = { nombre: "Pedro", apellido: "Pérez", animal: "Perro", fruta: "Pera", lugar: "Puebla", cosa: "Pelota", color: "Plata", pokemon: "Pikachu", refri: "Pollo" };
  const p = await c.call("POST", `/sala/${codigo}/respuesta`, "angel@example.com", { ronda: 0, palabras });
  assertEquals([p.status, p.body.rondasBasta["0"].palabras], [200, palabras]);
  c.avanzar(60_000);
  await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { final: 900, podio: [{ nombre: "Marisol", total: 900 }] });
  const rev = await c.call("POST", `/sala/${codigo}/revancha`, "angel@example.com");
  assertEquals(rev.status, 200, JSON.stringify(rev.body));
  const g = await c.call("GET", `/sala/${rev.body.codigo}`, "angel@example.com");
  assertEquals(g.body.sala.opciones, { rondas: "5", extra: "pokemon,refri" });
});

Deno.test("basta-extra: conExtras agrega las columnas al final con su banco de respuestas", () => {
  const d = datosBasta.es;
  const con = Basta.conExtras(d, datosBasta.extras, Basta.extrasDe({ extra: "pokemon,antojito" }));
  assertEquals(con.categorias.map((c: any) => c.id), [...d.categorias.map((c: any) => c.id), "pokemon", "antojito"]);
  assert(con.palabras.pokemon.includes("Pikachu"));
  assertEquals(d.categorias.length, 7, "no cambia los datos originales");
  assertEquals(Basta.extrasDe({}), []);
  assertEquals(Basta.extrasDe({ extra: "pokemon,dragones,flor,anime" }), ["pokemon", "flor"], "ignora desconocidas y respeta el máximo");
  assertEquals(Basta.conExtras(d, datosBasta.extras, []), d);
});

Deno.test("basta-extra: la columna divertida se califica igual (única 100, repetida 50, no verificada 25/10, vacía u otra letra 0)", () => {
  const d = Basta.conExtras(datosBasta.es, datosBasta.extras, ["pokemon"]);
  const pts = (ps: Record<string, string>[]) => {
    const res = Basta.puntuar(d, "P", ps.map((palabras, i) => ({ id: "j" + i, nombre: "J" + i, palabras })));
    return ps.map((_, i) => res.find((x: any) => x.id === "j" + i).detalle.pokemon);
  };
  const [a, b, c2, e, f] = pts([{ pokemon: "Pikachu" }, { pokemon: "Psyduck" }, { pokemon: "psyduck" }, { pokemon: "" }, { pokemon: "Charmander" }]);
  assertEquals([a.pts, a.estado], [100, "única"]);
  assertEquals([b.pts, c2.pts, b.estado], [50, 50, "repetida"]);
  assertEquals([e.pts, f.pts, f.estado], [0, 0, "inválida"]);
  const [g, h, k] = pts([{ pokemon: "Pokemonazo" }, { pokemon: "Pokemonazo" }, { pokemon: "Pancho" }]);
  assertEquals([g.pts, h.pts, k.pts, k.estado], [10, 10, 25, "no verificada"]);
  // Total: la columna extra suma como las de siempre
  const res = Basta.puntuar(d, "P", [{ id: "x", nombre: "X", palabras: { nombre: "Pedro", pokemon: "Pikachu" } }]);
  assertEquals(res[0].total, 200);
});

// ---- ¡Una!: robar hasta poder tirar ----
// Cartas de prueba: { c, v }. El mazo se roba del final (pop), igual que en los motores.
const C = (s: string) => ({ c: s[0], v: s.slice(1) });
const validaContra = (top: { c: string; v: string }) => (x: { c: string | null; v: string }) => !x.c || x.c === top.c || x.v === top.v;

Deno.test("una-robo: roba hasta sacar una que se pueda tirar y para ahí", () => {
  const mazo = [C("g1"), C("r5"), C("b2"), C("y7"), C("b9")]; // se roba b9, y7, b2, r5…
  const mano = [C("b3")];
  const r = Una.robarHastaPoder(mazo, mano, validaContra(C("r4")));
  assertEquals(r.robadas.map((x: any) => x.c + x.v), ["b9", "y7", "b2", "r5"]);
  assertEquals(r.jugable.c + r.jugable.v, "r5");
  assertEquals(mazo.map((x: any) => x.c + x.v), ["g1"], "quedan las que no se robaron");
  assertEquals(mano.length, 5, "las robadas pasan a la mano");
});

Deno.test("una-robo: la primera robada ya sirve → roba solo 1; el comodín siempre sirve", () => {
  const mazo = [C("y1"), { c: null, v: "wild" }];
  const r = Una.robarHastaPoder(mazo, [], validaContra(C("r4")));
  assertEquals([r.robadas.length, r.jugable?.v], [1, "wild"]);
});

Deno.test("una-robo: si el mazo se acaba sin una jugable, roba todo lo que hay, no rebaraja y no hay jugable", () => {
  const mazo = [C("g1"), C("b2")];
  const pila = [C("y8"), C("r4")];
  const mano: unknown[] = [];
  const r = Una.robarHastaPoder(mazo, mano, validaContra(pila[pila.length - 1]));
  assertEquals([r.robadas.length, r.jugable, mazo.length, pila.length, mano.length], [2, null, 0, 2, 2]);
  const vacio = Una.robarHastaPoder([], mano, () => true);
  assertEquals([vacio.robadas.length, vacio.jugable], [0, null], "sin mazo no roba nada");
});

Deno.test("una-robo: determinista (mismo mazo y misma mano → mismas robadas), también con ids numéricos", () => {
  const hacer = () => {
    const mazo = Array.from({ length: 40 }, (_, k) => (k * 7) % 40); // ids
    const mano = [1, 2];
    const r = Una.robarHastaPoder(mazo, mano, (id: number) => id % 9 === 0 && id > 0);
    return JSON.stringify([r.robadas, r.jugable, mazo, mano]);
  };
  assertEquals(hacer(), hacer());
  const mazo = [9, 4, 3];
  const r = Una.robarHastaPoder(mazo, [], (id: number) => id === 9);
  assertEquals([r.robadas, r.jugable], [[3, 4, 9], 9]);
});

Deno.test("una-robo: aviso con el número de cartas (también si la carta jugable es el id 0)", () => {
  assertEquals(Una.avisoRobo(3, 17, "es"), "Robaste 3 cartas hasta encontrar una que sí puedes tirar");
  assertEquals(Una.avisoRobo(3, 0, "es"), "Robaste 3 cartas hasta encontrar una que sí puedes tirar", "el 0 rojo sí es carta");
  assertEquals(Una.avisoRobo(1, 0, "es"), "Robaste 1 carta y sí la puedes tirar");
  assertEquals(Una.avisoRobo(2, null, "es"), "Robaste 2 cartas y se acabó el mazo sin una que sirva. Sigue el siguiente");
  assertEquals(Una.avisoRobo(0, null, "es"), "No quedan cartas para robar. Sigue el siguiente");
  assertEquals(Una.avisoRobo(4, 5, "en"), "You drew 4 cards until you found one you can play");
});

Deno.test("una-robo: el servidor acepta robar sin carta y rechaza robar o pasar con carta o color", async () => {
  const c = ctx();
  const codigo = (await c.call("POST", "/sala", "marisol@example.com", { juego: "una", bots: true })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel@example.com");
  await c.call("POST", `/sala/${codigo}/empezar`, "marisol@example.com");
  c.avanzar(6000);
  for (const jugada of [{ n: 0, accion: "robar", carta: 3 }, { n: 0, accion: "pasar", color: "r" }] as Record<string, unknown>[]) {
    const r = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada });
    assertEquals([r.status, r.body.error], [400, "jugada_invalida"], JSON.stringify(jugada));
  }
  const ok = await c.call("POST", `/sala/${codigo}/respuesta`, "marisol@example.com", { jugada: { n: 0, accion: "robar" } });
  assertEquals([ok.status, ok.body.jugadas.map((j: any) => [j.n, j.accion, j.carta])], [200, [[0, "robar", undefined]]]);
});
