// Batalla naval en sala (openspec: juegos-tablero): el servidor guarda las flotas, valida y resuelve cada disparo y
// nunca entrega la flota del rival (ni en el GET, ni en Realtime, ni al admin) mientras la partida sigue.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas } from "./salas.ts";
import { MemoryStore } from "./store.ts";
import { estadoNaval, validarFlota } from "./naval.ts";

const ingles = [
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
  { alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] },
  { alumno: "Jesus", userEmails: ["jesus@example.com"], userNames: ["Jesus"] },
];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const M = "marisol@example.com", A = "angel@example.com";
const FLOTA_M = [[0, 1, 2, 3, 4], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]];
const FLOTA_A = [[10, 11, 12, 13, 14], [29, 39, 49, 59], [70, 71, 72], [76, 77, 78], [95, 96]];

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  let t = Date.parse("2026-09-30T18:00:00.000Z");
  const avisos: any[] = [];
  const fetchFalso = ((_url: string | URL | Request, init?: RequestInit) => {
    avisos.push(JSON.parse(String(init?.body)).messages[0].payload);
    return Promise.resolve(new Response("{}", { status: 202 }));
  }) as typeof fetch;
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-09-30", ahora: () => new Date(t).toISOString(),
    realtime: { url: "https://proj.supabase.co", publica: "sb_publishable_x", servicio: "sb_secret_y", fetch: fetchFalso },
  };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    clearCacheSalas();
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { call, avisos, avanzar: (ms: number) => { t += ms; } };
}

async function salaNaval(c: ReturnType<typeof ctx>, flotas = true) {
  const codigo = (await c.call("POST", "/sala", M, { juego: "naval" })).body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, A);
  await c.call("POST", `/sala/${codigo}/empezar`, M);
  c.avanzar(6000);
  if (flotas) {
    assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, M, { flota: FLOTA_M })).status, 200);
    assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, A, { flota: FLOTA_A })).status, 200);
  }
  const tiro = (email: string, n: number, cc: number) => c.call("POST", `/sala/${codigo}/respuesta`, email, { jugada: { n, accion: "disparar", c: cc } });
  return { codigo, tiro };
}
const flotaDe = (r: any, id: string) => r.body.jugadores.find((j: any) => j.id === id)?.flota;
const idDe = (r: any, nombre: string) => r.body.jugadores.find((j: any) => j.nombre === nombre).id;

Deno.test("naval: validarFlota del servidor", () => {
  assert(validarFlota(FLOTA_M) && validarFlota(FLOTA_A));
  assert(!validarFlota([[0, 1, 2, 3, 4], [20, 30, 40, 50], [8, 9, 10], [62, 63, 64], [97, 98]]), "da la vuelta de fila");
  assert(!validarFlota([[0, 1, 2, 3, 4], [4, 14, 24, 34], [7, 8, 9], [62, 63, 64], [97, 98]]), "encimados");
  assert(!validarFlota({ x: 1 }) && !validarFlota([]) && !validarFlota([[0, 11, 22, 33, 44], [20, 30, 40, 50], [7, 8, 9], [62, 63, 64], [97, 98]]));
});

Deno.test("naval: la flota se valida y se guarda una sola vez", async () => {
  const c = ctx();
  const { codigo, tiro } = await salaNaval(c, false);
  assertEquals((await tiro(M, 0, 55)).body.error, "falta_flota");
  const mala = await c.call("POST", `/sala/${codigo}/respuesta`, M, { flota: [[0, 1, 2]] });
  assertEquals([mala.status, mala.body.error], [400, "flota_invalida"]);
  assertEquals((await c.call("POST", `/sala/${codigo}/respuesta`, M, { flota: FLOTA_M })).status, 200);
  const otra = await c.call("POST", `/sala/${codigo}/respuesta`, M, { flota: FLOTA_A });
  assertEquals([otra.status, otra.body.error], [409, "flota_lista"]);
  assertEquals((await tiro(M, 0, 55)).body.error, "falta_flota", "el rival aún no acomoda");
});

Deno.test("naval: nadie más ve tu flota (GET, Realtime y admin) hasta que termina", async () => {
  const c = ctx();
  const { codigo } = await salaNaval(c);
  const gm = await c.call("GET", `/sala/${codigo}`, M), ga = await c.call("GET", `/sala/${codigo}`, A);
  const im = idDe(gm, "Marisol"), ia = idDe(gm, "Angel");
  assertEquals(flotaDe(gm, im), FLOTA_M);
  assertEquals(flotaDe(gm, ia), undefined, "Marisol no ve la flota de Angel");
  assertEquals(flotaDe(ga, ia), FLOTA_A);
  assertEquals(flotaDe(ga, im), undefined, "Angel no ve la flota de Marisol");
  const adm = await c.call("GET", `/sala/${codigo}`, "admin@example.com");
  assertEquals(adm.body.jugadores.map((j: any) => j.flota), [undefined, undefined], "ni el admin");
  assert(c.avisos.length > 0);
  for (const p of c.avisos) for (const j of p.jugadores) assertEquals(j.flota, undefined, "Realtime sin flotas");
  // La respuesta del disparo tampoco trae flotas.
  const r = await c.call("POST", `/sala/${codigo}/respuesta`, M, { jugada: { n: 0, accion: "disparar", c: 10 } });
  assertEquals(JSON.stringify(r.body).includes("\"flota\""), false);
  assertEquals(r.body.jugadas[0].r, "tocado");
  const resumen = await c.call("GET", "/admin/resumen", "admin@example.com");
  assertEquals(JSON.stringify(resumen.body).includes("\"flota\""), false);
});

Deno.test("naval: turnos, agua, tocado (repite), hundido, casilla repetida y fin", async () => {
  const c = ctx();
  const { codigo, tiro } = await salaNaval(c);
  assertEquals((await tiro(A, 0, 0)).body.error, "no_es_tu_turno", "empieza quien creó la sala");
  assertEquals((await tiro(M, 0, 100)).body.error, "jugada_invalida");
  const agua = await tiro(M, 0, 55);
  assertEquals([agua.status, agua.body.jugadas[0].r], [200, "agua"]);
  assertEquals((await tiro(M, 1, 56)).body.error, "no_es_tu_turno", "tras agua cambia el turno");
  const toc = await tiro(A, 1, 97);
  assertEquals(toc.body.jugadas[0].r, "tocado");
  assertEquals((await tiro(A, 2, 97)).body.error, "ya_disparaste");
  assertEquals((await tiro(A, 5, 98)).body.error, "turno_tomado", "n debe ser el siguiente paso");
  const hun = await tiro(A, 2, 98);
  assertEquals([hun.body.jugadas[1].r, hun.body.jugadas[1].barco], ["hundido", [97, 98]]);
  // Angel hunde el resto de la flota de Marisol sin fallar.
  let n = 3;
  for (const cc of FLOTA_M.slice(0, 4).flat()) assertEquals((await tiro(A, n++, cc)).status, 200);
  const est = await c.call("GET", `/sala/${codigo}`, M);
  const e = estadoNaval(est.body.jugadores);
  assertEquals(e.fin, { gana: idDe(est, "Angel"), por: "hundidos" });
  assertEquals((await tiro(M, n, 56)).body.error, "partida_terminada");
  assertEquals(flotaDe(est, idDe(est, "Angel")), FLOTA_A, "al terminar se revelan las flotas");
  assertEquals((await c.call("GET", `/sala/${codigo}`, "jesus@example.com")).status, 403);
});

Deno.test("naval: rendirse y reclamar tras 90 s sin jugar", async () => {
  const c = ctx();
  const s1 = await salaNaval(c);
  assertEquals((await c.call("POST", `/sala/${s1.codigo}/respuesta`, A, { jugada: { n: 0, accion: "rendirse" } })).status, 200);
  const g1 = await c.call("GET", `/sala/${s1.codigo}`, M);
  assertEquals(estadoNaval(g1.body.jugadores).fin, { gana: idDe(g1, "Marisol"), por: "rendicion" });
  assertEquals((await s1.tiro(M, 1, 55)).body.error, "partida_terminada");

  const s2 = await salaNaval(c);
  const reclamar = (email: string, n: number) => c.call("POST", `/sala/${s2.codigo}/respuesta`, email, { jugada: { n, accion: "reclamar" } });
  assertEquals((await reclamar(A, 0)).body.error, "aun_no", "antes de 90 s");
  c.avanzar(91_000);
  assertEquals((await reclamar(M, 0)).body.error, "aun_no", "no se reclama en tu propio turno");
  assertEquals((await reclamar(A, 0)).status, 200);
  const g2 = await c.call("GET", `/sala/${s2.codigo}`, A);
  assertEquals(estadoNaval(g2.body.jugadores).fin, { gana: idDe(g2, "Angel"), por: "abandono" });

  // El rival que nunca acomodó su flota también se puede reclamar.
  const s3 = await salaNaval(c, false);
  await c.call("POST", `/sala/${s3.codigo}/respuesta`, M, { flota: FLOTA_M });
  c.avanzar(91_000);
  assertEquals((await c.call("POST", `/sala/${s3.codigo}/respuesta`, M, { jugada: { n: 0, accion: "reclamar" } })).status, 200);
});
