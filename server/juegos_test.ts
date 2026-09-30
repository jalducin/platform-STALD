// Plataforma de juegos (openspec: juegos-plataforma), con almacén en memoria y sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos, lunesDe, resolverJugador } from "./juegos.ts";
import { MemoryStore } from "./store.ts";

const ingles = [{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }, { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Sisifo"] }];
const secundaria = [{ userEmails: ["valeria@example.com"], userNames: ["Valeria Gómez"] }];
const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function ctx(hoy = "2026-09-30") {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = { store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve(secundaria), hoy: () => hoy, ahora: () => `${hoy}T12:00:00.000Z` };
  const call = async (method: string, sub: string, email: string, body?: unknown, query = "") => {
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}${query}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, deps, call };
}
const partida = (juego: string, puntos: number) => ({ juego, puntos, aciertos: 5, total: 10, segundos: 60 });

Deno.test("juegos: lunes de la semana (CDMX)", () => {
  assertEquals([lunesDe("2026-09-28"), lunesDe("2026-09-30"), lunesDe("2026-10-04"), lunesDe("2026-10-05")], ["2026-09-28", "2026-09-28", "2026-09-28", "2026-10-05"]);
});

Deno.test("juegos: identidad del jugador", async () => {
  const inv = { "leo@example.com": { nombre: "Leo", registradoEn: "x", ultimaVisita: "x", visitas: 1 } };
  assertEquals(await resolverJugador(ADMIN, ADMIN, ingles, secundaria, inv), { id: "admin", nombre: "Profe", tipo: "admin" });
  assertEquals(await resolverJugador("marisol@example.com", ADMIN, ingles, secundaria, inv), { id: "a-marisol", nombre: "Marisol", tipo: "alumno" });
  assertEquals(await resolverJugador("valeria@example.com", ADMIN, ingles, secundaria, inv), { id: "s-valeria", nombre: "Valeria", tipo: "alumno" });
  const leo = await resolverJugador("leo@example.com", ADMIN, ingles, secundaria, inv);
  assertEquals([leo!.nombre, leo!.tipo, /^i-[0-9a-f]{10}$/.test(leo!.id)], ["Leo", "invitado", true]);
  assertEquals(await resolverJugador("nadie@example.com", ADMIN, ingles, secundaria, inv), null);
});

Deno.test("juegos: partida con récord, mejor por juego y total semanal", async () => {
  const { call, store } = ctx();
  const p1 = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 850));
  assertEquals([p1.status, p1.body.puntos, p1.body.total, p1.body.nuevoRecord], [200, 850, 850, true]);
  const p2 = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 400));
  assertEquals([p2.body.total, p2.body.nuevoRecord, p2.body.mejor], [850, false, 850]);
  const p3 = await call("POST", "/partida", "marisol@example.com", partida("cultura", 300));
  assertEquals(p3.body.total, 1150);
  const doc = (await store.get<any>("juegos/semanas/2026-09-28/a-marisol.json"))!.data;
  assertEquals([doc.nombre, doc.partidas.length, doc.mejores["en-vocab"], doc.total], ["Marisol", 3, 850, 1150]);
  assertEquals(JSON.stringify(doc).includes("@"), false, "sin correos");
});

Deno.test("juegos: tope de puntos, juego inválido y no registrado", async () => {
  const { call } = ctx();
  const p = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 999999));
  assertEquals(p.body.puntos, CATALOGO["en-vocab"].max);
  assertEquals((await call("POST", "/partida", "marisol@example.com", partida("en-vocab", -50))).body.puntos, 0);
  assertEquals((await call("POST", "/partida", "marisol@example.com", partida("no-existe", 10))).status, 400);
  assertEquals((await call("POST", "/partida", "marisol@example.com", { juego: "en-vocab", puntos: "mucho" })).status, 400);
  const x = await call("POST", "/partida", "nadie@example.com", partida("en-vocab", 10));
  assertEquals([x.status, x.body.error], [403, "no_registrado"]);
});

Deno.test("juegos: límite diario de partidas", async () => {
  const { call, store } = ctx();
  const partidas = Array.from({ length: 100 }, () => ({ juego: "en-vocab", puntos: 1, aciertos: 1, total: 1, segundos: 1, en: "2026-09-30T10:00:00.000Z" }));
  await store.put("juegos/semanas/2026-09-28/a-marisol.json", { id: "a-marisol", nombre: "Marisol", tipo: "alumno", partidas, mejores: { "en-vocab": 1 }, total: 1 }, null);
  const r = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 10));
  assertEquals([r.status, r.body.error], [429, "limite_diario"]);
});

Deno.test("juegos: ranking ordenado, con yo y sin correos", async () => {
  const { call } = ctx();
  await call("POST", "/partida", "angel@example.com", partida("en-vocab", 900));
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 700));
  await call("POST", "/partida", "marisol@example.com", partida("cultura", 500));
  const r = await call("GET", "/ranking", "angel@example.com");
  assertEquals(r.body.semana, "2026-09-28");
  assertEquals(r.body.top.map((x: any) => [x.pos, x.nombre, x.total]), [[1, "Marisol", 1200], [2, "Angel", 900]]);
  assertEquals([r.body.yo.pos, r.body.yo.total], [2, 900]);
  assertEquals(JSON.stringify(r.body).includes("@"), false);
  const vacia = await call("GET", "/ranking", "angel@example.com", undefined, "&semana=2026-10-05");
  assertEquals([vacia.body.top.length, vacia.body.yo.pos], [0, null]);
  assertEquals((await call("GET", "/ranking", "nadie@example.com")).status, 403);
});

Deno.test("juegos: semana nueva empieza vacía", async () => {
  const a = ctx("2026-10-04");
  await a.call("POST", "/partida", "angel@example.com", partida("en-vocab", 900));
  const b = { ...a, deps: { ...a.deps, hoy: () => "2026-10-05" } };
  const req = new Request("http://x/juegos/ranking?email=angel@example.com");
  const res = await handleJuegos(req, "/ranking", "angel@example.com", b.deps, json);
  assertEquals((await res.json()).top.length, 0);
});

Deno.test("juegos: registro de invitado y validaciones", async () => {
  const { call, store } = ctx();
  assertEquals((await call("POST", "/invitado", "leo@example.com", { nombre: "Leo", acepto: false })).status, 400);
  assertEquals((await call("POST", "/invitado", "leo@example.com", { nombre: "L", acepto: true })).status, 400);
  assertEquals((await call("POST", "/invitado", "leo@example.com", { nombre: "<script>", acepto: true })).status, 400);
  assertEquals((await call("POST", "/invitado", "no-es-correo", { nombre: "Leo", acepto: true })).status, 400);
  const ok = await call("POST", "/invitado", "Leo@Example.com", { nombre: "Leo", acepto: true });
  assertEquals([ok.status, ok.body.jugador.nombre, ok.body.jugador.tipo], [200, "Leo", "invitado"]);
  const reg = (await store.get<any>("juegos/invitados.json"))!.data;
  assertEquals([reg["leo@example.com"].nombre, reg["leo@example.com"].visitas], ["Leo", 1]);
  await call("POST", "/invitado", "leo@example.com", { nombre: "Leo", acepto: true });
  assertEquals((await store.get<any>("juegos/invitados.json"))!.data["leo@example.com"].visitas, 2);
  const p = await call("POST", "/partida", "leo@example.com", partida("mente-calculo", 300));
  assertEquals(p.status, 200);
  const rank = await call("GET", "/ranking", "leo@example.com");
  assertEquals([rank.body.top[0].nombre, rank.body.top[0].tipo], ["Leo", "invitado"]);
  const al = await call("POST", "/invitado", "marisol@example.com", { nombre: "Mari", acepto: true });
  assertEquals([al.status, al.body.ya], [200, true]);
  assertEquals(Object.keys((await store.get<any>("juegos/invitados.json"))!.data), ["leo@example.com"]);
});

Deno.test("juegos: tope de invitados", async () => {
  const { call, store } = ctx();
  const muchos = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`g${i}@example.com`, { nombre: "G", registradoEn: "x", ultimaVisita: "x", visitas: 1 }]));
  await store.put("juegos/invitados.json", muchos, null);
  assertEquals((await call("POST", "/invitado", "nuevo@example.com", { nombre: "Nuevo", acepto: true })).status, 429);
  assertEquals((await call("POST", "/invitado", "g1@example.com", { nombre: "Gio", acepto: true })).status, 200);
});

Deno.test("juegos: lista de invitados solo para admin", async () => {
  const { call } = ctx();
  await call("POST", "/invitado", "leo@example.com", { nombre: "Leo", acepto: true });
  await call("POST", "/partida", "leo@example.com", partida("cultura", 450));
  assertEquals((await call("GET", "/invitados", "marisol@example.com")).status, 403);
  assertEquals((await call("GET", "/invitados", "leo@example.com")).status, 403);
  const r = await call("GET", "/invitados", ADMIN);
  assertEquals(r.status, 200);
  assertEquals(r.body.invitados.map((x: any) => [x.email, x.nombre, x.visitas, x.puntosSemana]), [["leo@example.com", "Leo", 1, 450]]);
});

Deno.test("juegos: yo (perfil del jugador) con mejores de la semana", async () => {
  const { call } = ctx();
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 600));
  const r = await call("GET", "/yo", "marisol@example.com");
  assertEquals([r.body.jugador.nombre, r.body.total, r.body.mejores["en-vocab"], r.body.pos], ["Marisol", 600, 600, 1]);
  assert(Array.isArray(r.body.catalogo) && r.body.catalogo.length >= 14);
});

Deno.test("juegos: clásicos (Basta, ¡Una!, Lotería) con sus topes", async () => {
  const { call } = ctx();
  const topes: Record<string, number> = { "basta-es": 1500, "basta-en": 1500, "una": 1000, "loteria": 1000 };
  for (const [id, max] of Object.entries(topes)) {
    const r = await call("POST", "/partida", "marisol@example.com", partida(id, 5000));
    assertEquals([r.status, r.body.puntos], [200, max], id);
  }
});

Deno.test("juegos: la identidad se reutiliza 60 s (no recarga Notion en cada sondeo)", async () => {
  const { deps } = ctx();
  let cargas = 0;
  const d = { ...deps, filasIngles: () => { cargas++; return Promise.resolve(ingles); } };
  for (let i = 0; i < 5; i++) await handleJuegos(new Request("http://x/juegos/yo?email=marisol@example.com"), "/yo", "marisol@example.com", d, json);
  assertEquals(cargas, 1);
  await handleJuegos(new Request("http://x/juegos/invitados?email=admin@example.com"), "/invitados", "admin@example.com", d, json);
  await handleJuegos(new Request("http://x/juegos/invitados?email=admin@example.com"), "/invitados", "admin@example.com", d, json);
  assertEquals(cargas, 3, "la lista de invitados siempre es fresca");
});
