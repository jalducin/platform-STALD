// Ranking de los juegos más jugados de la semana (openspec: ranking-juegos-populares).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos, juegosPopulares } from "./juegos.ts";
import { MemoryStore } from "./store.ts";
import { politicaCache } from "./http_cache.ts";

const ingles = ["Marisol", "Angel", "Jesus", "Laura"].map((n) => ({ alumno: n, userEmails: [`${n.toLowerCase()}@example.com`], userNames: [n] }));
const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

// Almacén que cuenta lecturas, para verificar que el top no relee la semana en cada petición.
class StoreContado extends MemoryStore {
  lecturasSemana = 0;
  override get<T>(path: string) {
    if (path.startsWith("juegos/semanas/")) this.lecturasSemana++;
    return super.get<T>(path);
  }
  override list(dir: string) {
    if (dir.startsWith("juegos/semanas/")) this.lecturasSemana++;
    return super.list(dir);
  }
}

function ctx(hoy = "2026-09-30") {
  clearCacheJuegos();
  const store = new StoreContado();
  const deps = { store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]), hoy: () => hoy, ahora: () => `${hoy}T12:00:00.000Z` };
  const call = async (method: string, sub: string, email: string, body?: unknown, query = "") => {
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}${query}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json(), texto: "" };
  };
  return { store, call };
}
const partida = (juego: string, puntos: number, extra: Record<string, unknown> = {}) => ({ juego, puntos, aciertos: 5, total: 10, segundos: 60, ...extra });
const doc = (id: string, nombre: string, partidas: { juego: string; puntos: number; modo?: "sala"; en?: string }[], tipo = "alumno") =>
  ({ id, nombre, tipo, partidas: partidas.map((p, i) => ({ aciertos: 1, total: 1, segundos: 1, en: p.en ?? `2026-09-29T10:0${i}:00Z`, ...p })), mejores: {}, total: 0 }) as any;

Deno.test("ranking-juegos: agregado por juego con jugadores distintos, partidas y mejor puntaje", () => {
  const r = juegosPopulares([
    doc("a-angel", "Angel", [{ juego: "mente-sopa", puntos: 300 }, { juego: "es-ordena", puntos: 100 }, { juego: "es-ordena", puntos: 900, en: "2026-09-29T09:00:00Z" }, { juego: "es-ordena", puntos: 50 }]),
    doc("a-jesus", "Chuy Star", [{ juego: "mente-sopa", puntos: 800 }, { juego: "es-ordena", puntos: 900 }, { juego: "conquian", puntos: 400, modo: "sala" }]),
    doc("a-laura", "Laura", [{ juego: "mente-sopa", puntos: 10 }, { juego: "conquian", puntos: 600, modo: "sala" }, { juego: "no-existe", puntos: 5 }]),
  ]);
  assertEquals(r.map((x) => [x.pos, x.id, x.jugadores, x.partidas]), [
    [1, "mente-sopa", 3, 3],
    [2, "es-ordena", 2, 4],
    [3, "conquian", 2, 2],
  ], "por jugadores; empate de 2 jugadores lo rompe el número de partidas; el juego desconocido no sale");
  assertEquals(r[0].titulo, "Sopa de letras");
  assertEquals(r[0].mejor, { nombre: "Chuy Star", puntos: 800 }, "el mejor puntaje con el nombre visible (nick)");
  assertEquals(r[1].mejor, { nombre: "Angel", puntos: 900 }, "empate en el mejor puntaje: gana la partida más antigua");
  assertEquals(r[2].mejor, { nombre: "Laura", puntos: 600 }, "las partidas de sala también cuentan");
});

Deno.test("ranking-juegos: empate total se ordena por título; mejor nulo con 0 puntos; documentos que no son personas no cuentan", () => {
  const r = juegosPopulares([
    doc("a-angel", "Angel", [{ juego: "loteria", puntos: 0 }, { juego: "brisca", puntos: 0 }]),
    doc("bot-1", "Bot", [{ juego: "loteria", puntos: 999 }], "bot"),
  ]);
  assertEquals(r.map((x) => x.titulo), ["Brisca", "Lotería"]);
  assertEquals([r[0].mejor, r[1].mejor, r[1].jugadores], [null, null, 1]);
  assertEquals(juegosPopulares([]), []);
});

Deno.test("ranking-juegos: ruta con individuales y una sala con bots; solo cuentan las personas", async () => {
  const { call } = ctx();
  for (const e of ["angel", "jesus", "laura"]) assertEquals((await call("POST", "/partida", `${e}@example.com`, partida("mente-sopa", 500))).status, 200);
  for (let i = 0; i < 3; i++) await call("POST", "/partida", "angel@example.com", partida("es-ordena", 200));
  await call("POST", "/partida", "jesus@example.com", partida("es-ordena", 700));
  const sala = await call("POST", "/sala", "jesus@example.com", { juego: "conquian", bots: true });
  const codigo = sala.body.codigo;
  assertEquals(sala.body.sala.bots, true);
  assertEquals((await call("POST", `/sala/${codigo}/unirse`, "laura@example.com")).status, 200);
  assertEquals((await call("POST", `/sala/${codigo}/empezar`, "jesus@example.com")).status, 200);
  assertEquals((await call("POST", "/partida", "jesus@example.com", partida("conquian", 900, { sala: codigo }))).status, 200);
  assertEquals((await call("POST", "/partida", "laura@example.com", partida("conquian", 300, { sala: codigo }))).status, 200);

  const r = await call("GET", "/ranking/juegos", "marisol@example.com");
  assertEquals(r.status, 200);
  assertEquals(r.body.semana, "2026-09-28");
  assertEquals(r.body.jugadores, 3);
  assertEquals(r.body.juegos.map((x: any) => [x.pos, x.id, x.jugadores, x.partidas]), [[1, "mente-sopa", 3, 3], [2, "es-ordena", 2, 4], [3, "conquian", 2, 2]]);
  assertEquals(r.body.juegos[1].mejor, { nombre: "Jesus", puntos: 700 });
  assertEquals(JSON.stringify(r.body).includes("@"), false, "sin correos");
  assertEquals(JSON.stringify(r.body).includes("a-jesus"), false, "sin ids de jugador");
});

Deno.test("ranking-juegos: semana vacía, semana anterior, semana inválida y sin registro", async () => {
  const { call } = ctx();
  const vacia = await call("GET", "/ranking/juegos", "angel@example.com");
  assertEquals([vacia.status, vacia.body.juegos, vacia.body.jugadores], [200, [], 0]);
  await call("POST", "/partida", "angel@example.com", partida("cultura", 100));
  const otra = await call("GET", "/ranking/juegos", "angel@example.com", undefined, "&semana=2026-09-21");
  assertEquals([otra.body.semana, otra.body.juegos], ["2026-09-21", []]);
  const conFecha = await call("GET", "/ranking/juegos", "angel@example.com", undefined, "&semana=2026-10-02");
  assertEquals([conFecha.body.semana, conFecha.body.juegos.length], ["2026-09-28", 1], "cualquier día se lleva a su lunes");
  assertEquals((await call("GET", "/ranking/juegos", "angel@example.com", undefined, "&semana=ayer")).body.error, "semana_invalida");
  const x = await call("GET", "/ranking/juegos", "nadie@example.com");
  assertEquals([x.status, x.body.error], [403, "no_registrado"]);
  assertEquals((await call("POST", "/ranking/juegos", "angel@example.com")).status, 404);
});

Deno.test("ranking-juegos: se calcula una vez por carga de la semana; una partida nueva lo refresca", async () => {
  const { call, store } = ctx();
  await call("POST", "/partida", "angel@example.com", partida("cultura", 100));
  await call("GET", "/ranking/juegos", "angel@example.com");
  const antes = store.lecturasSemana;
  const r2 = await call("GET", "/ranking/juegos", "angel@example.com");
  assertEquals(store.lecturasSemana, antes, "la segunda petición no lee la semana");
  assertEquals(r2.body.juegos[0].jugadores, 1);
  await call("POST", "/partida", "laura@example.com", partida("cultura", 300));
  const r3 = await call("GET", "/ranking/juegos", "angel@example.com");
  assertEquals([r3.body.juegos[0].jugadores, r3.body.juegos[0].partidas, r3.body.juegos[0].mejor.nombre], [2, 2, "Laura"]);
});

Deno.test("ranking-juegos: misma política de caché HTTP que el ranking", () => {
  assertEquals(politicaCache("/juegos/ranking/juegos"), politicaCache("/juegos/ranking"));
  assert(politicaCache("/juegos/ranking/juegos") !== null);
  assertEquals(politicaCache("/juegos/ranking/otra"), null);
});
