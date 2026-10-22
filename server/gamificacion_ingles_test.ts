// Gamificación de Inglés (openspec: rpg-fase2-ingles): nick de Juegos, perfil de ranking, ranking por grupo por
// constancia, moderación del profe e interruptor. Almacén en memoria, sin red; personas inventadas y correos
// @example.com.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../comun/constancia.js";
import { CONFIG_POR_DEFECTO, estadoNick, handleGamificacion, handleProfeGamificacion, rankingVisible, revisarNick, RUTA_CONFIG, rutaPerfil } from "./gamificacion.ts";
import { invalidarRanking } from "./cache_ranking.ts";
import type { Item } from "./motor.ts";
import { MemoryStore, type Store } from "./store.ts";
import { storeCon } from "./test_datos.ts";

const C = (globalThis as any).Constancia;
const ADMIN = "admin@example.com";
const HOY = "2026-10-21"; // miércoles; semana 19–25 oct
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const REGISTRO = {
  "marisol@example.com": { nombre: "Marisol Pérez", alta: "2026-09-01" },
  "angel@example.com": { nombre: "Angel Ruiz", alta: "2026-09-01" },
  "laura@example.com": { nombre: "Laura Gómez", alta: "2026-09-01" },
  "fernando@example.com": { nombre: "Fernando Díaz", alta: "2026-09-01" }, // otro grupo
  "jesus@example.com": { nombre: "Jesus Mora", alta: "2026-09-01", baja: "2026-10-01" },
  "sofi@example.com": { nombre: "Sofía Luna", alta: "2026-09-01", baja: "2026-10-01", secundaria: true },
};
const GRUPOS: Record<string, string> = { "marisol-perez": "g1", "angel-ruiz": "g1", "laura-gomez": "g1", "fernando-diaz": "g2", "jesus-mora": "g1" };
const item = (id: string, desde: string, limite: string) => ({ id, tipo: "actividad", titulo: id, disponibleDesde: desde, fechaLimite: limite, banco: [{ id: "x" }], preguntasPorIntento: 1 }) as unknown as Item;
const ITEMS = [item("act-1", "2026-10-19", "2026-10-20"), item("act-2", "2026-10-12", "2026-10-13"), item("act-3", "2026-10-22", "2026-10-23")];
const res = (alumno: string, enviadoEn: string, fueraDeTiempo = false, extra: Record<string, unknown> = {}) => ({
  id: "x", titulo: "x", alumno, intentos: [{ n: 1, enviadoEn, fueraDeTiempo, preguntas: null, respuestas: {}, calificacion: { porcentaje: 95 } }], mejor: { porcentaje: 95, n: 1 }, ...extra,
});

function base(extra: Record<string, unknown> = {}, config: unknown = { ranking: true }): MemoryStore {
  invalidarRanking();
  return storeCon({
    "alumnos.json": REGISTRO,
    "juegos/nicks.json": { "a-marisol-perez": "Estrella Azul", "a-angel-ruiz": "Rayo 77", "a-laura-gomez": "Cometa", "a-fernando-diaz": "Tigre" },
    ...(config ? { [RUTA_CONFIG]: config } : {}),
    // act-1: Marisol a tiempo (10), Angel tarde (5); act-2: Marisol a tiempo el 13 (semana pasada: 0), Laura tarde el 20 (5)
    "resultados/act-1/marisol-perez.json": res("Marisol Pérez", "2026-10-19T18:00:00Z"),
    "resultados/act-1/angel-ruiz.json": res("Angel Ruiz", "2026-10-21T02:00:00Z", true),
    "resultados/act-2/marisol-perez.json": res("Marisol Pérez", "2026-10-13T18:00:00Z"),
    "resultados/act-2/laura-gomez.json": res("Laura Gómez", "2026-10-20T18:00:00Z", true),
    "resultados/act-1/fernando-diaz.json": res("Fernando Díaz", "2026-10-19T18:00:00Z"),
    ...extra,
  });
}
const deps = (store: Store, email: string, extra: Record<string, unknown> = {}) => ({
  email, admin: ADMIN, store,
  registro: async () => ((await store.get<any>("alumnos.json"))?.data ?? {}),
  esSecundaria: (c: string) => Promise.resolve(c === "sofi@example.com" || c === "solo-sec@example.com"),
  grupoDe: (slug: string) => Promise.resolve(GRUPOS[slug] ?? null),
  items: () => Promise.resolve(ITEMS),
  hoy: () => HOY, ahora: () => "2026-10-21T17:00:00.000Z",
  ...extra,
});
async function llamar(store: Store, email: string, metodo: string, ruta: string, body?: unknown, extra: Record<string, unknown> = {}) {
  const req = new Request("http://x" + ruta, { method: metodo, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const sub = ruta.split("?")[0];
  const r = sub.startsWith("/profe")
    ? await handleProfeGamificacion(req, sub.slice("/profe".length), deps(store, email, extra) as any, json)
    : await handleGamificacion(req, sub.slice("/gamificacion".length), deps(store, email, extra) as any, json);
  return { status: r.status, body: await r.json() };
}
const aparecer = (store: Store, email: string, v = true) => llamar(store, email, "PUT", "/gamificacion/perfil", { aparecer: v });
const aprobar = (store: Store, alumno: string, nick: string) => llamar(store, ADMIN, "POST", "/profe/nicks/aprobar", { alumno, nick });

// Recorre todo el JSON: ninguna clave ni valor con datos personales o calificaciones.
const PROHIBIDAS = ["nombre", "alumno", "slug", "email", "correo", "xp", "nivel", "porcentaje", "calificacion"];
function sinDatosPersonales(x: unknown) {
  const texto = JSON.stringify(x).toLowerCase();
  for (const v of ["@example.com", "marisol", "angel", "laura", "fernando", "perez", "ruiz", "gomez"]) {
    assert(!texto.includes(v), `el JSON trae «${v}»: ${texto}`);
  }
  const visitar = (o: unknown) => {
    if (Array.isArray(o)) return o.forEach(visitar);
    if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { assert(!PROHIBIDAS.includes(k.toLowerCase()), `clave prohibida ${k}`); visitar(v); }
  };
  visitar(x);
}

// ---------- Función pura de constancia ----------
Deno.test("constancia: 10 a tiempo, 5 tarde, 20 por paso, solo dentro de la semana (hora de CDMX)", () => {
  const semana = C.semanaDe(HOY);
  assertEquals(semana, { desde: "2026-10-19", hasta: "2026-10-25" });
  const p = C.puntosConstancia({
    actividades: [
      { enviadoEn: "2026-10-19T06:30:00Z", aTiempo: true }, // lunes 00:30 CDMX → cuenta
      { enviadoEn: "2026-10-19T05:30:00Z", aTiempo: true }, // domingo 23:30 CDMX → semana anterior
      { enviadoEn: "2026-10-26T05:00:00Z", aTiempo: false }, // domingo 23:00 CDMX → cuenta (5)
    ],
    pasosMision: [{ enviadoEn: "2026-10-22T18:00:00Z" }],
  }, semana);
  assertEquals(p, 35);
  assertEquals(C.ordenarRanking([{ nick: "b", puntos: 5 }, { nick: "a", puntos: 10 }, { nick: "c", puntos: 5 }]).map((f: any) => [f.nick, f.posicion]), [["a", 1], ["b", 2], ["c", 2]]);
  assertEquals(C.posicionDe(7, [{ puntos: 10 }, { puntos: 5 }]), 2);
});

// ---------- Revisión del nick ----------
Deno.test("nick: rechaza correos, teléfonos, nombres de pila del registro y palabras bloqueadas", () => {
  const nombres = Object.values(REGISTRO).map((a) => a.nombre);
  assertEquals(revisarNick("Estrella Azul", nombres), { ok: true });
  assertEquals(revisarNick("Rayo 77", nombres), { ok: true });
  assertEquals((revisarNick("mari gmail", nombres) as any).motivo, "correo");
  assertEquals((revisarNick("5512345678", nombres) as any).motivo, "telefono");
  assertEquals((revisarNick("LauraStar", nombres) as any).motivo, "nombre"); // nombre de pila de una compañera
  assertEquals((revisarNick("Fern4ndo 10", nombres) as any).motivo, "nombre"); // con números en lugar de letras
  assertEquals((revisarNick("el pendejo", nombres) as any).motivo, "palabra");
  assertEquals(revisarNick("Computo", nombres), { ok: true }); // palabra corta solo como palabra completa
  assertEquals(estadoNick({ aparecer: true, nickAprobado: "A", actualizado: "" }, "A"), "aprobado");
  assertEquals(estadoNick({ aparecer: true, nickAprobado: "A", actualizado: "" }, "B"), "pendiente");
  assertEquals(estadoNick(null, null), "sin_nick");
});

// ---------- Perfil ----------
Deno.test("perfil: interruptor apagado (por defecto) → nada del ranking; PUT → 404 sin_ranking", async () => {
  const s = base({}, null);
  assertEquals(CONFIG_POR_DEFECTO.ranking, false);
  assertEquals(await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil"), { status: 200, body: { ranking: false } });
  assertEquals((await aparecer(s, "marisol@example.com")).status, 404);
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/ranking")).body.error, "sin_ranking");
  assertEquals(await s.get(rutaPerfil("marisol-perez")), null);
});

Deno.test("perfil: aparecer con nick válido → pendiente y no aparece hasta que el profe lo aprueba", async () => {
  const s = base();
  const g = await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil");
  assertEquals(g.body, { ranking: true, aparecer: false, nick: "Estrella Azul", estadoNick: "pendiente" });
  const r = await aparecer(s, "marisol@example.com");
  assertEquals([r.status, r.body.aparecer, r.body.estadoNick], [200, true, "pendiente"]);
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista, []);
  assertEquals((await aprobar(s, "marisol-perez", "Estrella Azul")).body.estado, "aprobado");
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista, [{ posicion: 1, nick: "Estrella Azul", puntos: 10 }]);
});

Deno.test("perfil: sin nick → 400 sin_nick; nick inválido → 400 nick_invalido con motivo", async () => {
  const s = base({ "juegos/nicks.json": { "a-angel-ruiz": "Laura 1" } });
  const sin = await aparecer(s, "marisol@example.com");
  assertEquals([sin.status, sin.body.error], [400, "sin_nick"]);
  const mal = await aparecer(s, "angel@example.com");
  assertEquals([mal.status, mal.body.error, mal.body.motivo], [400, "nick_invalido", "nombre"]);
  assert(!JSON.stringify(mal.body).toLowerCase().includes("laura gómez"));
  assertEquals(await s.get(rutaPerfil("angel-ruiz")), null);
});

Deno.test("perfil: otra persona → 403; admin, invitado y baja → 403; Secundaria → 404; sin sesión → 401", async () => {
  const s = base();
  assertEquals((await llamar(s, "marisol@example.com", "PUT", "/gamificacion/perfil", { aparecer: true, alumno: "angel-ruiz" })).status, 403);
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil?alumno=angel-ruiz")).status, 403);
  assertEquals((await llamar(s, ADMIN, "GET", "/gamificacion/perfil")).status, 403);
  assertEquals((await llamar(s, "invitado@example.com", "PUT", "/gamificacion/perfil", { aparecer: true })).status, 403);
  assertEquals((await llamar(s, "jesus@example.com", "PUT", "/gamificacion/perfil", { aparecer: true })).body.error, "baja_ingles");
  assertEquals((await llamar(s, "sofi@example.com", "GET", "/gamificacion/perfil")).status, 404);
  assertEquals((await llamar(s, "solo-sec@example.com", "GET", "/gamificacion/ranking")).body.error, "sin_ranking");
  assertEquals((await llamar(s, "", "GET", "/gamificacion/perfil")).status, 401);
  assertEquals((await llamar(s, "marisol@example.com", "PUT", "/gamificacion/perfil", { aparecer: "sí" })).status, 400);
});

Deno.test("perfil: cambiar el nick en Juegos lo regresa a pendiente y deja de aparecer", async () => {
  const s = base();
  await aparecer(s, "marisol@example.com");
  await aprobar(s, "marisol-perez", "Estrella Azul");
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista.length, 1);
  // Juegos guarda el nick nuevo e invalida la caché (server/juegos.ts → invalidarRanking)
  const doc = await s.get<any>("juegos/nicks.json");
  await s.put("juegos/nicks.json", { ...doc!.data, "a-marisol-perez": "Luna Roja" }, doc!.sha);
  invalidarRanking();
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil")).body.estadoNick, "pendiente");
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista, []);
});

// ---------- Ranking ----------
Deno.test("ranking: solo su grupo, por constancia, nadie sin activarlo, posición propia privada y JSON sin datos personales", async () => {
  const s = base();
  for (const [c, slug, nick] of [["marisol@example.com", "marisol-perez", "Estrella Azul"], ["laura@example.com", "laura-gomez", "Cometa"], ["fernando@example.com", "fernando-diaz", "Tigre"]]) {
    await aparecer(s, c);
    await aprobar(s, slug, nick);
  }
  // Angel nunca activó aparecer: no sale en la lista, pero ve su posición (5 puntos: empata con Cometa → 2.º)
  const a = await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking");
  assertEquals(a.status, 200);
  assertEquals(a.body.lista, [{ posicion: 1, nick: "Estrella Azul", puntos: 10 }, { posicion: 2, nick: "Cometa", puntos: 5 }]);
  assertEquals(a.body.yo, { posicion: 2, puntos: 5, visible: false });
  assertEquals(a.body.semana, { desde: "2026-10-19", hasta: "2026-10-25" });
  sinDatosPersonales(a.body);
  // Marisol aparece y se ve a sí misma
  const m = await llamar(s, "marisol@example.com", "GET", "/gamificacion/ranking");
  assertEquals(m.body.yo, { posicion: 1, puntos: 10, visible: true });
  sinDatosPersonales(m.body);
  // Otro grupo: no se mezclan
  assertEquals((await llamar(s, "fernando@example.com", "GET", "/gamificacion/ranking")).body.lista, [{ posicion: 1, nick: "Tigre", puntos: 10 }]);
  assertEquals((await llamar(s, "fernando@example.com", "GET", "/gamificacion/ranking?grupo=g1")).status, 403);
});

Deno.test("ranking: quien se oculta desaparece en la siguiente carga y sigue viendo su posición", async () => {
  const s = base();
  await aparecer(s, "laura@example.com");
  await aprobar(s, "laura-gomez", "Cometa");
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista.length, 1); // en caché
  await aparecer(s, "laura@example.com", false);
  assertEquals((await llamar(s, "angel@example.com", "GET", "/gamificacion/ranking")).body.lista, []);
  assertEquals((await llamar(s, "laura@example.com", "GET", "/gamificacion/ranking")).body.yo, { posicion: 1, puntos: 5, visible: false });
});

Deno.test("ranking: baja no aparece (y recibe 403); grupo apagado → 404; sin sesión → 401", async () => {
  const s = base({ [rutaPerfil("jesus-mora")]: { aparecer: true, nickAprobado: "Jaguar", actualizado: "" }, "juegos/nicks.json": { "a-jesus-mora": "Jaguar" } });
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/ranking")).body.lista, []);
  assertEquals((await llamar(s, "jesus@example.com", "GET", "/gamificacion/ranking")).status, 403);
  assertEquals((await llamar(s, "", "GET", "/gamificacion/ranking")).status, 401);
  assertEquals((await llamar(s, ADMIN, "POST", "/profe/ranking", { grupo: "g1", apagado: true })).body.gruposSinRanking, ["g1"]);
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/ranking")).body.error, "sin_ranking");
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil")).body, { ranking: false });
  assertEquals((await llamar(s, "fernando@example.com", "GET", "/gamificacion/ranking")).status, 200);
});

Deno.test("ranking: Postgres caído → 503 sin afectar lo demás", async () => {
  const s = base();
  const roto: Store = { get: (p) => p.startsWith("resultados/") || p.startsWith("gamificacion/perfiles") ? Promise.reject(new Error("postgrest 503")) : s.get(p), put: s.put.bind(s), list: (d) => d.startsWith("resultados") ? Promise.reject(new Error("postgrest 503")) : s.list(d), remove: s.remove.bind(s) };
  const r = await llamar(roto, "angel@example.com", "GET", "/gamificacion/ranking");
  assertEquals([r.status, r.body.error], [503, "ranking_no_disponible"]);
});

// ---------- Panel del profe ----------
Deno.test("profe: cola de nicks con nombre de pila (sin correos), pendientes primero; solo admin", async () => {
  const s = base({ "juegos/nicks.json": { "a-marisol-perez": "Estrella Azul", "a-angel-ruiz": "Laura 1" } });
  await aparecer(s, "marisol@example.com");
  const r = await llamar(s, ADMIN, "GET", "/profe/nicks?grupo=g1");
  assertEquals(r.status, 200);
  assertEquals(r.body.ranking, true);
  assertEquals(r.body.personas[0], { alumno: "marisol-perez", nombre: "Marisol", grupo: "g1", nick: "Estrella Azul", estado: "pendiente", aparecer: true });
  assertEquals(r.body.personas.find((p: any) => p.alumno === "angel-ruiz").revision, "nombre");
  assert(!JSON.stringify(r.body).includes("@"));
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/profe/nicks")).status, 403);
  assertEquals((await llamar(s, "invitado@example.com", "POST", "/profe/nicks/aprobar", {})).status, 403);
  assertEquals((await llamar(s, "", "GET", "/profe/nicks")).status, 401);
});

Deno.test("profe: rechazar con motivo; aprobar un nick que cambió → 409; aprobar uno inválido → 400", async () => {
  const s = base();
  await aparecer(s, "angel@example.com");
  assertEquals((await llamar(s, ADMIN, "POST", "/profe/nicks/rechazar", { alumno: "angel-ruiz", nick: "Rayo 77" })).status, 400);
  assertEquals((await llamar(s, ADMIN, "POST", "/profe/nicks/rechazar", { alumno: "angel-ruiz", nick: "Rayo 77", motivo: "Usa un nick sin números" })).body.estado, "rechazado");
  const p = await llamar(s, "angel@example.com", "GET", "/gamificacion/perfil");
  assertEquals([p.body.estadoNick, p.body.motivo], ["rechazado", "Usa un nick sin números"]);
  assertEquals((await aprobar(s, "angel-ruiz", "Otro")).status, 409);
  const s2 = base({ "juegos/nicks.json": { "a-angel-ruiz": "Marisol fan" } });
  assertEquals((await aprobar(s2, "angel-ruiz", "Marisol fan")).body.error, "nick_invalido");
  assertEquals((await aprobar(s2, "nadie", "x")).status, 404);
});

Deno.test("profe: el interruptor general prende y apaga el ranking al instante", async () => {
  const s = base({}, null);
  assertEquals((await llamar(s, ADMIN, "GET", "/profe/nicks")).body.ranking, false);
  assertEquals((await llamar(s, ADMIN, "POST", "/profe/ranking", { ranking: true })).body.ranking, true);
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil")).body.ranking, true);
  await llamar(s, ADMIN, "POST", "/profe/ranking", { ranking: false });
  assertEquals((await llamar(s, "marisol@example.com", "GET", "/gamificacion/perfil")).body, { ranking: false });
  assertEquals((await llamar(s, ADMIN, "POST", "/profe/ranking", {})).status, 400);
  assertEquals((await llamar(s, "marisol@example.com", "POST", "/profe/ranking", { ranking: true })).status, 403);
});

Deno.test("profe: borra el perfil 30 días después de la baja", async () => {
  const s = base({
    "alumnos.json": { ...REGISTRO, "jesus@example.com": { nombre: "Jesus Mora", alta: "2026-09-01", baja: "2026-09-10" }, "angel@example.com": { nombre: "Angel Ruiz", alta: "2026-09-01", baja: "2026-10-15" } },
    [rutaPerfil("jesus-mora")]: { aparecer: true, actualizado: "" },
    [rutaPerfil("angel-ruiz")]: { aparecer: true, actualizado: "" },
    [rutaPerfil("ya-no-esta")]: { aparecer: true, actualizado: "" },
  });
  await llamar(s, ADMIN, "GET", "/profe/nicks");
  assertEquals(await s.get(rutaPerfil("jesus-mora")), null);
  assertEquals(await s.get(rutaPerfil("ya-no-esta")), null);
  assert(await s.get(rutaPerfil("angel-ruiz"))); // baja de hace 6 días: se conserva
});

Deno.test("rankingVisible: /ingles/actividades solo avisa con el interruptor encendido (sin petición extra si está apagado)", async () => {
  assertEquals(await rankingVisible(base({}, null), "g1"), false);
  assertEquals(await rankingVisible(base({}, { ranking: true, gruposSinRanking: ["g2"] }), "g1"), true);
  assertEquals(await rankingVisible(base({}, { ranking: true, gruposSinRanking: ["g2"] }), "g2"), false);
  assertEquals(await rankingVisible(base({}, { ranking: true }), null), true); // sin base de grupos: un solo grupo
  const roto: Store = { get: () => Promise.reject(new Error("caído")), put: () => Promise.resolve(false), list: () => Promise.resolve([]), remove: () => Promise.resolve() };
  assertEquals(await rankingVisible(roto, "g1"), false);
});
