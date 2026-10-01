// Plataforma de juegos (openspec: juegos-plataforma), con almacén en memoria y sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { AVATARES, CATALOGO, clearCacheJuegos, COLORES, handleJuegos, lunesDe, resolverJugador } from "./juegos.ts";
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

Deno.test("juegos: todo suma a los puntos individuales; el récord por juego se conserva (puntos-por-tipo)", async () => {
  const { call, store } = ctx();
  const p1 = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 850));
  assertEquals([p1.status, p1.body.puntos, p1.body.modo, p1.body.totalIndividual, p1.body.nuevoRecord], [200, 850, "individual", 850, true]);
  const p2 = await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 400));
  assertEquals([p2.body.totalIndividual, p2.body.nuevoRecord, p2.body.mejor], [1250, false, 850], "volver a jugar suma aunque no sea récord");
  const p3 = await call("POST", "/partida", "marisol@example.com", partida("cultura", 300));
  assertEquals([p3.body.totalIndividual, p3.body.totalPartidas, p3.body.total], [1550, 0, 1550]);
  const doc = (await store.get<any>("juegos/semanas/2026-09-28/a-marisol.json"))!.data;
  assertEquals([doc.nombre, doc.partidas.length, doc.mejores["en-vocab"], doc.totalIndividual, doc.total], ["Marisol", 3, 850, 1550, 1550]);
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

Deno.test("juegos: Responde en inglés en el catálogo", async () => {
  const { call } = ctx();
  const r = await call("POST", "/partida", "marisol@example.com", partida("en-preguntas", 99999));
  assertEquals([r.status, r.body.puntos], [200, 2000]);
});

Deno.test("juegos: avatar por defecto, cambio validado y propagado", async () => {
  const { call, store } = ctx();
  const y1 = await call("GET", "/yo", "marisol@example.com");
  const def = y1.body.jugador.avatar;
  assert(AVATARES.includes(def.emoji) && COLORES.includes(def.color), JSON.stringify(def));
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar, def, "estable");
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 500));
  assertEquals((await call("POST", "/avatar", "marisol@example.com", { emoji: "💀💀", color: "#123456" })).status, 400);
  assertEquals((await call("POST", "/avatar", "marisol@example.com", { emoji: AVATARES[0], color: "red" })).status, 400);
  const ok = await call("POST", "/avatar", "marisol@example.com", { emoji: AVATARES[3], color: COLORES[2] });
  assertEquals([ok.status, ok.body.avatar], [200, { emoji: AVATARES[3], color: COLORES[2] }]);
  assertEquals((await store.get<any>("juegos/perfiles/a-marisol.json"))!.data, { emoji: AVATARES[3], color: COLORES[2] });
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar.emoji, AVATARES[3], "la caché se actualiza");
  const rank = await call("GET", "/ranking", "angel@example.com");
  assertEquals(rank.body.top[0].avatar, { emoji: AVATARES[3], color: COLORES[2] }, "el ranking lo muestra de inmediato");
  const res = await call("GET", "/admin/resumen", "admin@example.com");
  assertEquals(res.body.jugadores[0].avatar.emoji, AVATARES[3]);
});

// ---- Foto como avatar (openspec: avatar-foto) ----
const JPEG = "data:image/jpeg;base64," + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9));
async function verFoto(deps: any, token: string) {
  const res = await handleJuegos(new Request(`http://x/juegos/foto/${token}`), `/foto/${token}`, "", deps, json);
  return { status: res.status, tipo: res.headers.get("content-type"), bytes: res.status === 200 ? new Uint8Array(await res.arrayBuffer()) : null };
}

Deno.test("juegos: subir foto con permiso y verla sin correo", async () => {
  const { call, deps, store } = ctx();
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 100));
  const antes = (await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar;
  const r = await call("POST", "/foto", "marisol@example.com", { imagen: JPEG, acepto: true });
  assertEquals(r.status, 200);
  const token = r.body.avatar.foto;
  assert(/^[0-9a-f]{24}$/.test(token), "token aleatorio");
  assertEquals([r.body.avatar.emoji, r.body.avatar.color], [antes.emoji, antes.color], "conserva el personaje");
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar.foto, token);
  assertEquals((await call("GET", "/ranking", "marisol@example.com")).body.top[0].avatar.foto, token);
  const f = await verFoto(deps, token);
  assertEquals([f.status, f.tipo, f.bytes![0], f.bytes![1]], [200, "image/jpeg", 0xff, 0xd8]);
  assertEquals((await verFoto(deps, "0".repeat(24))).status, 404);
  const archivo = (await store.get<any>(`juegos/fotos/${token}.json`))!.data;
  assertEquals([archivo.id, JSON.stringify(archivo).includes("@")], ["a-marisol", false]);
});

Deno.test("juegos: foto sin permiso, no JPEG o grande se rechaza", async () => {
  const { call } = ctx();
  assertEquals((await call("POST", "/foto", "marisol@example.com", { imagen: JPEG })).body.error, "debe_aceptar");
  const png = "data:image/png;base64," + btoa("\x89PNG....");
  assertEquals((await call("POST", "/foto", "marisol@example.com", { imagen: png, acepto: true })).status, 400);
  const falso = "data:image/jpeg;base64," + btoa("hola mundo");
  assertEquals((await call("POST", "/foto", "marisol@example.com", { imagen: falso, acepto: true })).status, 400);
  const grande = JPEG + "A".repeat(41000);
  assertEquals((await call("POST", "/foto", "marisol@example.com", { imagen: grande, acepto: true })).status, 400);
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar.foto, undefined);
});

Deno.test("juegos: nueva foto borra la anterior y elegir personaje la quita", async () => {
  const { call, deps } = ctx();
  const t1 = (await call("POST", "/foto", "marisol@example.com", { imagen: JPEG, acepto: true })).body.avatar.foto;
  const t2 = (await call("POST", "/foto", "marisol@example.com", { imagen: JPEG, acepto: true })).body.avatar.foto;
  assert(t1 !== t2);
  assertEquals([(await verFoto(deps, t1)).status, (await verFoto(deps, t2)).status], [404, 200]);
  const a = await call("POST", "/avatar", "marisol@example.com", { emoji: AVATARES[1], color: COLORES[1] });
  assertEquals(a.body.avatar, { emoji: AVATARES[1], color: COLORES[1] });
  assertEquals((await verFoto(deps, t2)).status, 404);
});

Deno.test("juegos: el admin lista y quita fotos; alumnos 403", async () => {
  const { call, deps, store } = ctx();
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 100));
  const t = (await call("POST", "/foto", "marisol@example.com", { imagen: JPEG, acepto: true })).body.avatar.foto;
  assertEquals((await call("GET", "/fotos", "angel@example.com")).status, 403);
  assertEquals((await call("POST", "/fotos/quitar", "angel@example.com", { id: "a-marisol" })).status, 403);
  const l = await call("GET", "/fotos", ADMIN);
  assertEquals([l.status, l.body.fotos.length, l.body.fotos[0].id, l.body.fotos[0].nombre, l.body.fotos[0].token], [200, 1, "a-marisol", "Marisol", t]);
  const q = await call("POST", "/fotos/quitar", ADMIN, { id: "a-marisol" });
  assertEquals([q.status, q.body.ok], [200, true]);
  assertEquals((await verFoto(deps, t)).status, 404);
  assertEquals((await call("GET", "/fotos", ADMIN)).body.fotos.length, 0);
  assertEquals((await store.get<any>("juegos/perfiles/a-marisol.json"))!.data.foto, undefined);
  assertEquals((await store.get<any>("juegos/semanas/2026-09-28/a-marisol.json"))!.data.avatar.foto, undefined, "semana sin la foto");
  clearCacheJuegos();
  assertEquals((await call("GET", "/yo", "marisol@example.com")).body.jugador.avatar.foto, undefined);
  assertEquals((await call("POST", "/fotos/quitar", ADMIN, { id: "a-nadie" })).status, 404);
});

Deno.test("juegos: la caché de fotos vence a los 60 s (otro isolate pudo borrarla)", async () => {
  const { call, deps, store } = ctx();
  let reloj = 1_000_000;
  (deps as any).ms = () => reloj;
  const t = (await call("POST", "/foto", "marisol@example.com", { imagen: JPEG, acepto: true })).body.avatar.foto;
  assertEquals((await verFoto(deps, t)).status, 200);
  await store.remove(`juegos/fotos/${t}.json`);
  reloj += 30_000;
  assertEquals((await verFoto(deps, t)).status, 200, "aún en memoria");
  reloj += 31_000;
  assertEquals((await verFoto(deps, t)).status, 404, "vencida: se vuelve a leer");
});

Deno.test("juegos: Sudoku por niveles en el catálogo (openspec: sudoku-niveles)", async () => {
  assertEquals(CATALOGO["mente-sudoku"], { categoria: "mente", titulo: "Sudoku", max: 2000 });
  const { call } = ctx();
  const p = await call("POST", "/partida", "marisol@example.com", partida("mente-sudoku", 99999));
  assertEquals([p.status, p.body.puntos], [200, 2000]);
  assert((await call("GET", "/yo", "marisol@example.com")).body.catalogo.some((j: any) => j.id === "mente-sudoku"));
});


// ---- Puntos por tipo: individuales vs. partidas (openspec: puntos-por-tipo) ----
async function salaEmpezada(call: any, juego = "basta-es") {
  const c = await call("POST", "/sala", "marisol@example.com", { juego, opciones: {}, bots: true });
  await call("POST", `/sala/${c.body.codigo}/unirse`, "angel@example.com");
  await call("POST", `/sala/${c.body.codigo}/empezar`, "marisol@example.com");
  return c.body.codigo as string;
}

Deno.test("juegos: partida de sala suma a partidas, con validaciones", async () => {
  const { call } = ctx();
  const codigo = await salaEmpezada(call);
  const r = await call("POST", "/partida", "marisol@example.com", { ...partida("basta-es", 2350), sala: codigo });
  assertEquals([r.status, r.body.modo, r.body.puntos, r.body.totalPartidas, r.body.totalIndividual], [200, "sala", 2350, 2350, 0], "tope de sala 10,000, no el del catálogo");
  assertEquals((await call("POST", "/partida", "marisol@example.com", { ...partida("basta-es", 100), sala: codigo })).body.error, "ya_guardada");
  assertEquals((await call("POST", "/partida", "valeria@example.com", { ...partida("basta-es", 100), sala: codigo })).body.error, "no_en_sala");
  assertEquals((await call("POST", "/partida", "angel@example.com", { ...partida("cultura", 100), sala: codigo })).body.error, "sala_invalida", "otro juego");
  assertEquals((await call("POST", "/partida", "angel@example.com", { ...partida("basta-es", 100), sala: "ZZZZ" })).body.error, "sala_invalida");
  assertEquals((await call("POST", "/partida", "angel@example.com", { ...partida("basta-es", 100), sala: "abc" })).body.error, "sala_invalida");
  const sinEmpezar = (await call("POST", "/sala", "angel@example.com", { juego: "cultura", opciones: {}, bots: true })).body.codigo;
  assertEquals((await call("POST", "/partida", "angel@example.com", { ...partida("cultura", 100), sala: sinEmpezar })).body.error, "sala_invalida", "no ha empezado");
  const big = await call("POST", "/partida", "angel@example.com", { ...partida("basta-es", 99999), sala: codigo });
  assertEquals(big.body.puntos, 10000);
});

Deno.test("juegos: ranking por tipo, yo y resumen del admin con los dos totales", async () => {
  const { call } = ctx();
  const codigo = await salaEmpezada(call);
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 500));
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 500));
  await call("POST", "/partida", "angel@example.com", partida("cultura", 700));
  await call("POST", "/partida", "angel@example.com", { ...partida("basta-es", 3000), sala: codigo });
  await call("POST", "/partida", "marisol@example.com", { ...partida("basta-es", 1200), sala: codigo });
  const ind = await call("GET", "/ranking", "angel@example.com");
  assertEquals(ind.body.tipo, "individual");
  assertEquals(ind.body.top.map((x: any) => [x.pos, x.nombre, x.total, x.totalIndividual, x.totalPartidas]), [[1, "Marisol", 1000, 1000, 1200], [2, "Angel", 700, 700, 3000]]);
  const par = await call("GET", "/ranking", "angel@example.com", undefined, "&tipo=partidas");
  assertEquals(par.body.top.map((x: any) => [x.pos, x.nombre, x.total]), [[1, "Angel", 3000], [2, "Marisol", 1200]]);
  assertEquals([par.body.yo.pos, par.body.yo.totalPartidas], [1, 3000]);
  assertEquals((await call("GET", "/ranking", "angel@example.com", undefined, "&tipo=otro")).status, 400);
  const yo = await call("GET", "/yo", "marisol@example.com");
  assertEquals([yo.body.totalIndividual, yo.body.totalPartidas, yo.body.total, yo.body.pos, yo.body.posPartidas], [1000, 1200, 2200, 1, 2]);
  const res = await call("GET", "/admin/resumen", ADMIN);
  assertEquals(res.body.jugadores.find((j: any) => j.nombre === "Angel").totalPartidas, 3000);
});

Deno.test("juegos: semana guardada con el formato viejo se lee como individual", async () => {
  const { call, store } = ctx();
  const viejas = [700, 300, 900].map((p) => ({ juego: "mente-simon", puntos: p, aciertos: 1, total: 1, segundos: 1, en: "2026-09-29T10:00:00.000Z" }));
  await store.put("juegos/semanas/2026-09-28/a-marisol.json", { id: "a-marisol", nombre: "Marisol", tipo: "alumno", partidas: viejas, mejores: { "mente-simon": 900 }, total: 900 }, null);
  const r = await call("GET", "/ranking", "marisol@example.com");
  assertEquals([r.body.top[0].total, r.body.yo.totalIndividual], [1900, 1900]);
});

Deno.test("juegos: en cada ranking aparece quien jugó ese tipo, aunque sea con 0 puntos", async () => {
  const { call } = ctx();
  await call("POST", "/partida", "marisol@example.com", partida("en-vocab", 500));
  await call("POST", "/partida", "angel@example.com", partida("en-vocab", 0));
  const r = await call("GET", "/ranking", "marisol@example.com", undefined, "&tipo=partidas");
  assertEquals([r.body.top.length, r.body.yo.pos], [0, null], "nadie jugó partidas");
  const i = await call("GET", "/ranking", "angel@example.com");
  assertEquals([i.body.top.map((x: any) => [x.nombre, x.total]), i.body.yo.pos], [[["Marisol", 500], ["Angel", 0]], 2]);
});
