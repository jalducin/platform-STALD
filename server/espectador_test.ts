// Modo espectador en las partidas (openspec: espectador-partidas). Almacén en memoria, reloj controlado y Realtime falso.
// deno-lint-ignore-file no-explicit-any require-await
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, ESPECTADOR_EN_VIVO, MAX_ESPECTADORES } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import { palabraDibuja } from "./salas_grandes.ts";

// 40 personas de ejemplo (sin datos reales): p0…p39.
const ingles = Array.from({ length: 40 }, (_, i) => ({ alumno: `Persona ${i}`, userEmails: [`p${i}@example.com`], userNames: [`P${i}`] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const P = (i: number) => `p${i}@example.com`;
const ADMIN = "admin@example.com";
const FLOTA_A = [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]];
const FLOTA_B = [[10, 11, 12, 13, 14], [29, 39, 49, 59], [70, 71, 72], [76, 77, 78], [95, 96]];

function ctx(conRealtime = true) {
  clearCacheJuegos();
  const store = new MemoryStore();
  const avisos: any[] = [];
  const fetchFalso = (async (_u: string | URL | Request, init?: RequestInit) => {
    for (const m of JSON.parse(String(init?.body)).messages) avisos.push(m.payload);
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  let t = Date.parse("2026-10-17T18:00:00.000Z");
  const deps: any = {
    store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-17", ahora: () => new Date(t).toISOString(),
    ...(conRealtime ? { realtime: { url: "https://proj.supabase.co", publica: "sb_publishable_x", servicio: "sb_secret_y", fetch: fetchFalso } } : {}),
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call, avisos, avanzar: (ms: number) => { t += ms; }, ahora: () => t };
}
type C = ReturnType<typeof ctx>;

async function sala(c: C, juego: string, personas: string[], opciones: Record<string, unknown> = {}, bots = true, empezar = true) {
  const r = await c.call("POST", "/sala", personas[0], { juego, opciones, bots });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  const codigo = r.body.codigo as string;
  for (const p of personas.slice(1)) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, p)).status, 200);
  if (empezar) {
    assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, personas[0])).status, 200);
    c.avanzar(9000);
  }
  return codigo;
}
const espectar = (c: C, codigo: string, email: string, body: unknown = {}) => c.call("POST", `/sala/${codigo}/espectar`, email, body);

Deno.test("espectador: espectar una sala llena y una empezada (no ocupa asiento)", async () => {
  const c = ctx();
  const llena = await sala(c, "ajedrez", [P(0), P(1)], {}, false, false);
  assertEquals((await c.call("POST", `/sala/${llena}/unirse`, P(2))).body.error, "sala_llena");
  const e = await espectar(c, llena, P(2));
  assertEquals([e.status, e.body.ok, e.body.codigo], [200, true, llena]);
  const g = await c.call("GET", `/sala/${llena}`, P(2));
  assertEquals([g.status, g.body.espectador, g.body.soyHost, g.body.viendo, g.body.jugadores.length], [200, true, false, 1, 2]);
  assertEquals(JSON.stringify(g.body).includes("@"), false, "sin correos");
  // Quien juega ve «1 viendo» y la sala sigue con 2 jugadores.
  const gj = await c.call("GET", `/sala/${llena}`, P(0));
  assertEquals([gj.body.espectador, gj.body.viendo, gj.body.jugadores.length], [undefined, 1, 2]);
  assertEquals((await c.call("POST", `/sala/${llena}/empezar`, P(0))).status, 200, "el anfitrión empieza igual");

  const empezada = await sala(c, "cultura", [P(3)], { cat: "todas" });
  assertEquals((await c.call("POST", `/sala/${empezada}/unirse`, P(4))).body.error, "ya_empezo");
  assertEquals((await espectar(c, empezada, P(4))).status, 200);
  const ge = await c.call("GET", `/sala/${empezada}`, P(4));
  assertEquals([ge.status, ge.body.espectador, ge.body.jugadores.map((j: any) => j.nombre)], [200, true, ["Persona 3"]]);
});

Deno.test("espectador: no puede jugar (403), ni empezar, ni revancha, ni ranking", async () => {
  const c = ctx();
  const codigo = await sala(c, "cultura", [P(0)], { cat: "todas" });
  await espectar(c, codigo, P(1));
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, P(1), { q: 0, correcta: true, puntos: 150, ms: 900 });
  assertEquals([r.status, r.body.error], [403, "no_en_sala"]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, P(1), { final: 900 })).status, 403);
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, P(1))).status, 403);
  assertEquals((await c.call("POST", `/sala/${codigo}/revancha`, P(1))).status, 403);
  const pts = await c.call("POST", "/partida", P(1), { juego: "cultura", puntos: 900, aciertos: 9, total: 10, segundos: 0, sala: codigo });
  assertEquals([pts.status, pts.body.error], [403, "no_en_sala"], "no suma al ranking");
  // El podio y el final solo tienen a quien juega.
  await c.call("POST", `/sala/${codigo}/respuesta`, P(0), { final: 300, podio: [{ nombre: "P0", total: 300 }] });
  const g = await c.call("GET", `/sala/${codigo}`, P(1));
  assertEquals(g.body.jugadores.map((j: any) => j.nombre), ["Persona 0"]);
  const resumen = await c.call("GET", "/admin/resumen", ADMIN);
  const s = resumen.body.salas.find((x: any) => x.codigo === codigo);
  assertEquals(s.jugadores.map((j: any) => j.nombre), ["Persona 0"], "el admin no ve a quien especta como jugador");
});

Deno.test("espectador: no cuenta para la mesa (bots) ni para el mínimo", async () => {
  const c = ctx();
  const codigo = await sala(c, "brisca", [P(0), P(1)], {}, true, false);
  for (const k of [2, 3, 4]) assertEquals((await espectar(c, codigo, P(k))).status, 200);
  const g = await c.call("GET", `/sala/${codigo}`, P(0));
  assertEquals([g.body.jugadores.length, g.body.viendo], [2, 3]);
  // Siguen cabiendo 2 personas más en la mesa de 4.
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, P(5))).status, 200);
  // Un ajedrez con una persona y un espectador no se puede empezar (faltan jugadores).
  const aj = await sala(c, "ajedrez", [P(6)], {}, false, false);
  await espectar(c, aj, P(7));
  assertEquals((await c.call("POST", `/sala/${aj}/empezar`, P(6))).body.error, "faltan_jugadores");
});

Deno.test("espectador: cupo de 30, ya en sala, salir, sin registro, inexistente y vencida", async () => {
  const c = ctx();
  const codigo = await sala(c, "bingo", [P(0)], {}, true, false);
  assertEquals(MAX_ESPECTADORES, 30);
  for (let k = 1; k <= 30; k++) assertEquals((await espectar(c, codigo, P(k))).status, 200, `p${k}`);
  const otra = await espectar(c, codigo, P(31));
  assertEquals([otra.status, otra.body.error], [409, "espectadores_llenos"]);
  assertEquals((await espectar(c, codigo, P(5))).status, 200, "volver a espectar es idempotente");
  const yaDentro = await espectar(c, codigo, P(0));
  assertEquals([yaDentro.status, yaDentro.body.error], [409, "ya_en_sala"]);
  const sale = await espectar(c, codigo, P(5), { salir: true });
  assertEquals([sale.status, sale.body.ok], [200, true]);
  assertEquals((await c.call("GET", `/sala/${codigo}`, P(5))).status, 403, "ya no especta");
  assertEquals((await espectar(c, codigo, P(31))).status, 200, "se liberó un lugar");
  assertEquals((await c.call("GET", `/sala/${codigo}`, P(35))).body.error, "no_en_sala", "sin espectar no ve la sala");
  assertEquals((await espectar(c, codigo, "nadie@example.com")).status, 403, "sin cuenta de Juegos");
  assertEquals((await espectar(c, "ZZZZ", P(36))).status, 404);
  c.avanzar(3 * 3600 * 1000 + 1000);
  assertEquals((await espectar(c, codigo, P(37))).status, 410);
});

Deno.test("espectador: al unirse como jugador deja de ser espectador", async () => {
  const c = ctx();
  const codigo = await sala(c, "cultura", [P(0)], { cat: "todas" }, true, false);
  await espectar(c, codigo, P(1));
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, P(1))).status, 200);
  const g = await c.call("GET", `/sala/${codigo}`, P(1));
  assertEquals([g.body.espectador, g.body.viendo, g.body.jugadores.length], [undefined, 0, 2]);
});

Deno.test("espectador: el topic del canal solo en juegos en vivo (solo escucha)", async () => {
  const c = ctx();
  assertEquals([...ESPECTADOR_EN_VIVO].sort(), ["futbol", "futbolito-arena", "karts"]);
  const cartas = await sala(c, "poker", [P(0)]);
  await espectar(c, cartas, P(1));
  const gc = await c.call("GET", `/sala/${cartas}`, P(1));
  assertEquals(gc.body.rt, undefined, "en póker se usa sondeo: sin topic");
  assertEquals(JSON.stringify(gc.body).includes("canal"), false);
  const karts = await sala(c, "karts", [P(2), P(3)]);
  await espectar(c, karts, P(4));
  const gk = await c.call("GET", `/sala/${karts}`, P(4));
  const canal = (await c.store.get<any>(`juegos/salas/${karts}/sala.json`))!.data.canal;
  assertEquals(gk.body.rt, { url: "https://proj.supabase.co", key: "sb_publishable_x", topic: `sala-${canal}` });
  assertEquals(gk.body.sala.canal, undefined);
  // El admin usa la misma vista pública.
  const adm = await c.call("GET", `/sala/${cartas}`, ADMIN);
  assertEquals([adm.status, adm.body.espectador, adm.body.rt], [200, true, undefined]);
});

// ---- Tabla de juegos con secretos: el espectador nunca ve lo que un jugador no ve ----
Deno.test("espectador: Batalla naval sin flotas hasta el final", async () => {
  const c = ctx();
  const codigo = await sala(c, "naval", [P(0), P(1)], {}, false);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, P(0), { flota: FLOTA_A })).status, 200);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, P(1), { flota: FLOTA_B })).status, 200);
  await espectar(c, codigo, P(2));
  const g = await c.call("GET", `/sala/${codigo}`, P(2));
  assertEquals(g.body.jugadores.map((j: any) => j.flota), [undefined, undefined]);
  assertEquals(JSON.stringify(g.body).includes("\"flota\""), false);
  for (const p of c.avisos) assertEquals(JSON.stringify(p).includes("\"flota\""), false, "el canal tampoco");
});

Deno.test("espectador: Piedra-papel-tijera oculta la elección hasta que la ronda está completa", async () => {
  const c = ctx();
  const codigo = await sala(c, "ppt", [P(0), P(1)], {}, false);
  await espectar(c, codigo, P(2));
  const eleccion = (g: any, nombre: string) => (g.body.jugadores.find((j: any) => j.nombre === nombre).jugadas || []).find((x: any) => x.n === 0)?.eleccion;
  await c.call("POST", `/sala/${codigo}/respuesta`, P(0), { jugada: { n: 0, accion: "elegir", eleccion: "papel" } });
  assertEquals(eleccion(await c.call("GET", `/sala/${codigo}`, P(2)), "Persona 0"), "?");
  await c.call("POST", `/sala/${codigo}/respuesta`, P(1), { jugada: { n: 0, accion: "elegir", eleccion: "tijera" } });
  const g = await c.call("GET", `/sala/${codigo}`, P(2));
  assertEquals([eleccion(g, "Persona 0"), eleccion(g, "Persona 1")], ["papel", "tijera"], "ronda completa: visible");
});

Deno.test("espectador: Dibuja y adivina sin la palabra ni el secreto", async () => {
  const c = ctx();
  const codigo = await sala(c, "dibuja", [P(0), P(1), P(2)], {}, false);
  const s = (await c.store.get<any>(`juegos/salas/${codigo}/sala.json`))!.data;
  const p0 = palabraDibuja(s.secreto, 0);
  await espectar(c, codigo, P(3));
  const g = await c.call("GET", `/sala/${codigo}`, P(3));
  assertEquals([g.body.dibuja.turno, g.body.dibuja.palabra, g.body.dibuja.es, g.body.dibuja.letras], [0, undefined, undefined, p0.en.replaceAll(" ", "").length]);
  const txt = JSON.stringify(g.body);
  assertEquals([txt.includes(`"${p0.en}"`), txt.includes(`"${p0.es}"`), txt.includes(s.secreto), txt.includes("secreto")], [false, false, false, false]);
});

Deno.test("espectador: la vista de espectador es la misma que publica el canal (nada extra)", async () => {
  const c = ctx();
  for (const juego of ["poker", "brisca", "una", "conquian", "loteria", "blackjack", "bingo"]) {
    const codigo = await sala(c, juego, [P(0), P(1)], juego === "loteria" ? { modo: "linea" } : {}, true);
    await espectar(c, codigo, P(2));
    const g = await c.call("GET", `/sala/${codigo}`, P(2));
    assertEquals(g.status, 200, juego);
    const ultimo = [...c.avisos].reverse().find((a) => a.sala?.codigo === codigo);
    assert(ultimo, `aviso de ${juego}`);
    assertEquals(g.body.jugadores, ultimo.jugadores, `${juego}: mismos jugadores que el canal`);
    assertEquals(g.body.sala, ultimo.sala, `${juego}: misma sala que el canal`);
    for (const k of ["canal", "secreto", "flota", "@"]) assertEquals(JSON.stringify(g.body).includes(k), false, `${juego}: sin ${k}`);
  }
});

Deno.test("espectador: sin Realtime funciona igual (sondeo)", async () => {
  const c = ctx(false);
  const codigo = await sala(c, "karts", [P(0)]);
  await espectar(c, codigo, P(1));
  const g = await c.call("GET", `/sala/${codigo}`, P(1));
  assertEquals([g.status, g.body.espectador, g.body.rt], [200, true, undefined]);
});
