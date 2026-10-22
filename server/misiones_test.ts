// Misiones principales (openspec: rpg-fase2-misiones): entrega solo en texto, bandeja básica del profe con rúbrica,
// práctica de la teoría y matriz de acceso. Almacén en memoria y personas inventadas (nunca tablas stald_ reales).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache } from "./actividades.ts";
import { type DepsMisiones, handleMisiones, handlePractica, handleProfeEntregas, limpiarCacheMisiones, type PersonaMision } from "./misiones.ts";
import type { Store } from "./store.ts";
import { storeCon } from "./test_datos.ts";
import { misionValida, mundosValidos } from "./test_misiones.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ID = "mis-mate-valle-de-los-numeros";
const ALUMNA: PersonaMision = { tipo: "secundaria", slug: "ana", nombre: "Ana" };
const ADMIN: PersonaMision = { tipo: "admin" };

function datos(extra: Record<string, unknown> = {}) {
  return storeCon({
    "contenido/secundaria/mundos.json": mundosValidos(),
    [`contenido/secundaria/misiones/${ID}.json`]: misionValida({ alumnos: ["ana"] }),
    // Misión futura (Geometría empieza el 23 de nov) y una de Inglés de grupo.
    "contenido/secundaria/misiones/mis-mate-ciudad-de-las-formas.json": misionValida({ id: "mis-mate-ciudad-de-las-formas", mundo: "ciudad-de-las-formas", disponibleDesde: undefined, pasos: misionValida().pasos.map((p: any, i: number) => ({ ...p, fechaLimite: `2026-12-0${i + 1}` })) }),
    "contenido/ingles/misiones/mis-ingles-grupo-isla-del-alfabeto.json": misionValida({ id: "mis-ingles-grupo-isla-del-alfabeto", materia: "Inglés", mundo: "isla-del-alfabeto", disponibleDesde: "2026-10-26", grupos: ["grupo-1"] }),
    ...extra,
  });
}

function deps(store: Store, persona: PersonaMision, hoy = "2026-11-04"): DepsMisiones {
  limpiarCacheMisiones();
  clearCache();
  return {
    store, hoy: () => hoy, ahora: () => `${hoy}T18:00:00.000Z`, persona: () => Promise.resolve(persona),
    alumnasSecundaria: () => Promise.resolve([{ slug: "ana", nombre: "Ana" }]),
    nombreDe: (slug) => Promise.resolve(slug === "ana" ? "Ana" : null),
  };
}

const post = (ruta: string, body: unknown, tipo = "application/json") => new Request("http://x" + ruta, { method: "POST", headers: { "content-type": tipo }, body: typeof body === "string" ? body : JSON.stringify(body) });
const leer = async (r: Response) => ({ status: r.status, body: await r.json() });
const entregar = async (d: DepsMisiones, paso: string, texto: unknown, id = ID) => await leer(await handleMisiones(post(`/misiones/${id}/entrega`, { paso, texto }), `/${id}/entrega`, d, json));
const profe = async (d: DepsMisiones, sub: string, body?: unknown) => await leer(await handleProfeEntregas(body === undefined ? new Request("http://x/profe/entregas" + sub) : post("/profe/entregas" + sub, body), sub, d, json));

Deno.test("GET /misiones: la alumna ve su misión del mundo en curso (sin la futura) y el catálogo", async () => {
  const r = await leer(await handleMisiones(new Request("http://x/misiones"), "", deps(datos(), ALUMNA), json));
  assertEquals(r.status, 200);
  assertEquals(r.body.misiones.map((m: any) => m.id), [ID]);
  assertEquals([r.body.misiones[0].entrega, r.body.misiones[0].xp, r.body.mundos.length > 10], [null, 0, true]);
  // La práctica de la teoría llega sin la respuesta correcta.
  const q = r.body.misiones[0].teoria[0].practica[0];
  assertEquals([q.id, "correcta" in q, q.pista], ["q1", false, "Divide entre 10."]);
});

Deno.test("POST entrega: texto válido → 200 y «entregado»; tardía se marca", async () => {
  const store = datos();
  const d = deps(store, ALUMNA);
  const r = await entregar(d, "p2", "x".repeat(900));
  assertEquals([r.status, r.body.ok, r.body.tarde, r.body.completos], [200, true, false, 1]);
  const doc = (await store.get<any>(`entregas/${ID}/ana.json`))!.data;
  assertEquals([doc.pasos.p2.estado, doc.pasos.p2.texto.length, doc.slug, doc.ambito], ["entregado", 900, "ana", "secundaria"]);
  assert(!JSON.stringify(doc).includes("@"), "sin correos");
  // JSON como text/plain (sin verificación previa del navegador) también se acepta.
  const plano = await leer(await handleMisiones(post(`/misiones/${ID}/entrega`, { paso: "p3", texto: "hola" }, "text/plain;charset=UTF-8"), `/${ID}/entrega`, d, json));
  assertEquals(plano.status, 200);
  const tarde = await entregar(deps(store, ALUMNA, "2026-11-07"), "p1", "Mi paso uno");
  assertEquals([tarde.status, tarde.body.tarde], [200, true]);
});

Deno.test("POST entrega: vacía o > 4 000 caracteres → 400 entrega_invalida y no guarda", async () => {
  const store = datos();
  const d = deps(store, ALUMNA);
  for (const texto of ["", "   ", "x".repeat(4001), 42]) {
    const r = await entregar(d, "p1", texto);
    assertEquals([r.status, r.body.error], [400, "entrega_invalida"]);
  }
  assertEquals((await entregar(d, "p9", "hola")).body.error, "entrega_invalida");
  assertEquals(await store.get(`entregas/${ID}/ana.json`), null);
  assertEquals((await entregar(d, "p1", "x".repeat(4000))).status, 200); // justo en el límite
});

Deno.test("POST entrega: imagen, audio o multipart → 400 tipo_no_permitido y no guarda", async () => {
  const store = datos();
  const d = deps(store, ALUMNA);
  const casos = [
    post(`/misiones/${ID}/entrega`, { paso: "p1", texto: "hola", imagen: "data:image/png;base64,AAAA" }),
    post(`/misiones/${ID}/entrega`, { paso: "p1", tipo: "audio", archivo: "AAAA" }),
    post(`/misiones/${ID}/entrega`, "--frontera\r\nContent-Disposition: form-data; name=\"archivo\"\r\n\r\nAAAA\r\n--frontera--", "multipart/form-data; boundary=frontera"),
    post(`/misiones/${ID}/entrega`, "AAAA", "image/png"),
  ];
  for (const req of casos) {
    const r = await leer(await handleMisiones(req, `/${ID}/entrega`, d, json));
    assertEquals([r.status, r.body.error, r.body.mensaje], [400, "tipo_no_permitido", "Por ahora las entregas son solo texto."]);
  }
  assertEquals(await store.get(`entregas/${ID}/ana.json`), null);
});

Deno.test("POST entrega: misión ajena o futura → 404; baja, invitado y admin → 403", async () => {
  const store = datos();
  assertEquals((await entregar(deps(store, { tipo: "secundaria", slug: "otra", nombre: "Otra" }), "p1", "hola")).status, 404); // exclusiva de ana
  assertEquals((await entregar(deps(store, ALUMNA), "p1", "hola", "mis-mate-ciudad-de-las-formas")).status, 404); // mundo futuro
  assertEquals((await entregar(deps(store, { tipo: "ingles", slug: "beto", nombre: "Beto", grupo: "grupo-1" }), "p1", "hola")).status, 404); // de Secundaria
  assertEquals((await entregar(deps(store, { tipo: "ingles", slug: "beto", nombre: "Beto", grupo: "grupo-2" }), "p1", "hola", "mis-ingles-grupo-isla-del-alfabeto")).status, 404); // otro grupo
  assertEquals((await entregar(deps(store, { tipo: "ingles", slug: "beto", nombre: "Beto", grupo: "grupo-1" }), "p1", "hola", "mis-ingles-grupo-isla-del-alfabeto")).status, 200);
  assertEquals((await entregar(deps(store, { tipo: "baja", slug: "beto" }), "p1", "hola", "mis-ingles-grupo-isla-del-alfabeto")).body.error, "baja_ingles");
  assertEquals((await entregar(deps(store, { tipo: "sin_acceso" }), "p1", "hola")).status, 403);
  assertEquals((await entregar(deps(store, ADMIN), "p1", "hola")).status, 403);
  // Quien está de baja sigue viendo sus entregas anteriores (solo lectura).
  const baja = await leer(await handleMisiones(new Request("http://x/misiones"), "", deps(store, { tipo: "baja", slug: "beto" }), json));
  assertEquals([baja.status, baja.body.soloLectura, baja.body.misiones.map((m: any) => m.id)], [200, true, ["mis-ingles-grupo-isla-del-alfabeto"]]);
  assertEquals((await handleMisiones(new Request("http://x/misiones"), "", deps(store, { tipo: "sin_acceso" }), json)).status, 403);
});

Deno.test("POST entrega: falla de Postgres al guardar → 503 sin_guardar", async () => {
  const store = datos();
  const roto: Store = { ...store, get: store.get.bind(store), list: store.list.bind(store), remove: store.remove.bind(store), put: () => Promise.reject(new Error("postgrest 500")) };
  const r = await entregar(deps(roto, ALUMNA), "p1", "hola");
  assertEquals([r.status, r.body.error], [503, "sin_guardar"]);
  const sinBase = { ...deps(store, ALUMNA), puedeGuardar: () => Promise.resolve(false) };
  assertEquals((await entregar(sinBase, "p1", "hola")).status, 503);
});

async function misionEntregada(store: Store, ultimoTarde = false) {
  const d = deps(store, ALUMNA);
  for (const p of ["p1", "p2", "p3"]) await entregar(d, p, "Mi texto del paso " + p);
  await entregar(deps(store, ALUMNA, ultimoTarde ? "2026-11-21" : "2026-11-19"), "p4", "Mi texto del paso 4");
}

Deno.test("bandeja: lista para evaluar; evaluar 25 + 20 + 25 + 15 a tiempo = 85 % y 315 XP; reenviar → 409", async () => {
  const store = datos();
  await misionEntregada(store);
  const b = await profe(deps(store, ADMIN), "");
  assertEquals([b.status, b.body.pendientes, b.body.entregas[0].estado, b.body.entregas[0].nombre, b.body.entregas[0].slug], [200, 1, "lista", "Ana", "ana"]);
  assert(!JSON.stringify(b.body).includes("@"), "la bandeja no lleva correos");
  const ev = await profe(deps(store, ADMIN), `/${ID}/ana/evaluar`, { puntos: { c1: 25, c2: 20, c3: 25, c4: 15 }, comentario: "¡Muy bien!" });
  assertEquals([ev.status, ev.body.evaluacion.porcentaje, ev.body.evaluacion.aTiempo, ev.body.evaluacion.xp], [200, 85, true, 315]);
  // La alumna ve su rúbrica, el comentario y la XP.
  const vista = await leer(await handleMisiones(new Request("http://x/misiones"), "", deps(store, ALUMNA), json));
  const m = vista.body.misiones[0];
  assertEquals([m.xp, m.evaluacion.comentario, m.evaluacion.puntos.c2], [315, "¡Muy bien!", 20]);
  assertEquals((await entregar(deps(store, ALUMNA), "p2", "otra vez")).status, 409);
  assertEquals((await profe(deps(store, ADMIN), "")).body.entregas[0].estado, "evaluada");
});

Deno.test("evaluar: último paso tardío → sin los 60; incompleta → 409; nivel inexistente → 400", async () => {
  const tarde = datos();
  await misionEntregada(tarde, true);
  const ev = await profe(deps(tarde, ADMIN), `/${ID}/ana/evaluar`, { puntos: { c1: 15, c2: 15, c3: 15, c4: 15 } });
  assertEquals([ev.body.evaluacion.porcentaje, ev.body.evaluacion.aTiempo, ev.body.evaluacion.xp], [60, false, 180]);
  const incompleta = datos();
  await entregar(deps(incompleta, ALUMNA), "p1", "uno");
  assertEquals((await profe(deps(incompleta, ADMIN), `/${ID}/ana/evaluar`, { puntos: { c1: 25, c2: 25, c3: 25, c4: 25 } })).body.error, "incompleta");
  const r = await profe(deps(tarde, ADMIN), `/${ID}/ana/evaluar`, { puntos: { c1: 30, c2: 25, c3: 25, c4: 25 } });
  assertEquals([r.status, r.body.error], [400, "rubrica_invalida"]);
  assertEquals((await profe(deps(tarde, ADMIN), `/${ID}/nadie/evaluar`, { puntos: { c1: 25, c2: 25, c3: 25, c4: 25 } })).status, 404);
});

Deno.test("corrección por privacidad: reabre el paso, borra el texto y la alumna lo reenvía", async () => {
  const store = datos();
  await misionEntregada(store);
  const r = await profe(deps(store, ADMIN), `/${ID}/ana/correccion`, { pasos: ["p2"], motivo: "Usa un nombre inventado en lugar de uno real.", privacidad: true });
  assertEquals([r.status, r.body.pasos.p2.estado, r.body.pasos.p2.texto, r.body.pasos.p2.correccion.privacidad], [200, "correccion", null, true]);
  const doc = (await store.get<any>(`entregas/${ID}/ana.json`))!.data;
  assert(!JSON.stringify(doc).includes("Mi texto del paso p2"), "el texto ya no está en el almacenamiento");
  assertEquals(doc.historial.at(-1).accion, "correccion-privacidad");
  assertEquals((await entregar(deps(store, ALUMNA), "p2", "Texto nuevo sin nombres")).status, 200);
  assertEquals((await profe(deps(store, ADMIN), "")).body.entregas[0].estado, "lista");
  assertEquals((await profe(deps(store, ADMIN), `/${ID}/ana/correccion`, { pasos: ["p2"], motivo: "" })).status, 400);
});

Deno.test("borrar contenido: de una entrega y de una persona; queda la evaluación y la XP no cambia", async () => {
  const store = datos();
  await misionEntregada(store);
  await profe(deps(store, ADMIN), `/${ID}/ana/evaluar`, { puntos: { c1: 25, c2: 20, c3: 25, c4: 15 } });
  const r = await profe(deps(store, ADMIN), "/persona/ana/borrar", {});
  assertEquals([r.status, r.body.entregas], [200, 1]);
  const doc = (await store.get<any>(`entregas/${ID}/ana.json`))!.data;
  assertEquals(Object.values(doc.pasos).map((p: any) => p.texto), [null, null, null, null]);
  assertEquals([doc.evaluacion.porcentaje, doc.evaluacion.xp], [85, 315]);
  assertEquals((await profe(deps(store, ADMIN), `/${ID}/ana/borrar`, {})).body.evaluacion.xp, 315);
});

Deno.test("/profe/entregas: alumna, alumno, invitado o baja → 403", async () => {
  const store = datos();
  for (const p of [ALUMNA, { tipo: "ingles", slug: "beto", nombre: "Beto", grupo: "grupo-1" }, { tipo: "sin_acceso" }, { tipo: "baja", slug: "beto" }] as PersonaMision[]) {
    assertEquals((await profe(deps(store, p), "")).status, 403);
    assertEquals((await profe(deps(store, p), `/${ID}/ana/evaluar`, { puntos: {} })).status, 403);
  }
});

Deno.test("POST /practica/comprobar: correcta o no con pista; la respuesta no viaja; ajena → 404", async () => {
  const clase = { id: "mate-1", tipo: "actividad", titulo: "📐 Matemáticas · Porcentajes", materia: "Matemáticas", disponibleDesde: "2026-11-02", fechaLimite: "2026-11-03", intentos: 2,
    temas: [{ id: "t", titulo: "Porcentajes", retroalimentacion: { fortaleza: "a", "en-progreso": "b", debilidad: "c" } }],
    teoria: [{ titulo: "T", texto: "x", practica: [{ id: "p-a", pregunta: "¿25 % de 80?", aceptadas: ["20", "veinte"], pista: "Divide entre 4." }] }], tips: [], banco: [] };
  const store = datos({
    "contenido/secundaria/semanas/2026-11-02.json": { id: "2026-11-02", titulo: "S", elementos: [{ id: "mate-1", tipo: "actividad", fecha: "2026-11-03" }] },
    "contenido/secundaria/actividades/mate-1.json": clase,
  });
  const comprobar = async (p: PersonaMision, body: unknown) => await leer(await handlePractica(post("/practica/comprobar", body), deps(store, p), json));
  assertEquals((await comprobar(ALUMNA, { itemId: "mate-1", practicaId: "p-a", respuesta: " Veinte. " })).body, { correcta: true, pista: null });
  assertEquals((await comprobar(ALUMNA, { itemId: "mate-1", practicaId: "p-a", respuesta: "25" })).body, { correcta: false, pista: "Divide entre 4." });
  assertEquals((await comprobar(ALUMNA, { misionId: ID, practicaId: "q1", respuesta: 0 })).body, { correcta: true, pista: null });
  assertEquals((await comprobar(ALUMNA, { misionId: ID, practicaId: "q1", respuesta: 1 })).body.correcta, false);
  assertEquals((await comprobar({ tipo: "secundaria", slug: "otra", nombre: "Otra" }, { misionId: ID, practicaId: "q1", respuesta: 0 })).status, 404);
  assertEquals((await comprobar({ tipo: "ingles", slug: "beto", nombre: "Beto", grupo: "grupo-1" }, { itemId: "mate-1", practicaId: "p-a", respuesta: "20" })).status, 404);
  assertEquals((await comprobar({ tipo: "sin_acceso" }, { itemId: "mate-1", practicaId: "p-a", respuesta: "20" })).status, 403);
  assertEquals((await comprobar(ADMIN, { itemId: "mate-1", practicaId: "p-a", respuesta: "20" })).body.correcta, true);
  assertEquals((await comprobar(ALUMNA, { itemId: "mate-1", practicaId: "p-a" })).status, 400);
});

Deno.test("retención del 31 de agosto: borra el texto, conserva la evaluación y no toca lo ya borrado", async () => {
  const { conRetencion, aplicarRetencion } = await import("./retencion_entregas.ts");
  const ev = { puntos: { c1: 25 }, porcentaje: 85, aTiempo: true, xp: 315, comentario: "", fecha: "2027-06-01T00:00:00Z" };
  const con = { path: `entregas/${ID}/ana.json`, version: 3, data: { mision: ID, ambito: "secundaria", slug: "ana", evaluacion: ev, historial: [], pasos: { p1: { texto: "hola" as string | null, enviadoEn: "x", tarde: false, estado: "entregado" as const } } } };
  const sin = { path: `entregas/${ID}/otra.json`, version: 1, data: { ...con.data, slug: "otra", pasos: { p1: { ...con.data.pasos.p1, texto: null } } } };
  const r = conRetencion([con, sin], "2027-08-31T12:00:00Z");
  assertEquals([r.length, r[0].data.pasos.p1.texto, r[0].data.evaluacion?.xp, r[0].data.historial.at(-1)?.accion], [1, null, 315, "retencion"]);
  assertEquals(con.data.pasos.p1.texto, "hola", "no muta la entrada");
  // Con un Db simulado: la simulación no escribe; --confirmar actualiza con la versión.
  const cambios: string[] = [];
  const db = { select: () => Promise.resolve([con, sin]), update: (_t: string, f: string) => { cambios.push(f); return Promise.resolve([{}]); } } as any;
  assertEquals(await aplicarRetencion(db, "2027-08-31T12:00:00Z", false), { revisadas: 2, borradas: 1 });
  assertEquals(cambios, []);
  await aplicarRetencion(db, "2027-08-31T12:00:00Z", true);
  assertEquals(cambios, [`path=eq.${encodeURIComponent(con.path)}&version=eq.3`]);
});
