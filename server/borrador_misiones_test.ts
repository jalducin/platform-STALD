// Borrador de las misiones de texto en el servidor (openspec: autoguardado-todo): por persona, misión y paso; no es
// entrega hasta «Entregar», el admin no lo ve, respeta los 4 000 caracteres y entra al borrado de retención.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache } from "./actividades.ts";
import { type DepsMisiones, handleMisiones, handleProfeEntregas, limpiarCacheMisiones, type PersonaMision } from "./misiones.ts";
import type { Store } from "./store.ts";
import { storeCon } from "./test_datos.ts";
import { misionValida, mundosValidos } from "./test_misiones.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ID = "mis-mate-valle-de-los-numeros";
const ANA: PersonaMision = { tipo: "secundaria", slug: "ana", nombre: "Ana" };
const ADMIN: PersonaMision = { tipo: "admin" };
const RUTA = `borradores/misiones/${ID}/ana.json`;

const datos = () => storeCon({ "contenido/secundaria/mundos.json": mundosValidos(), [`contenido/secundaria/misiones/${ID}.json`]: misionValida({ alumnos: ["ana"] }) });
function deps(store: Store, persona: PersonaMision): DepsMisiones {
  limpiarCacheMisiones();
  clearCache();
  return {
    store, hoy: () => "2026-11-04", ahora: () => "2026-11-04T18:00:00.000Z", persona: () => Promise.resolve(persona),
    alumnasSecundaria: () => Promise.resolve([{ slug: "ana", nombre: "Ana" }]), nombreDe: () => Promise.resolve("Ana"),
  };
}
const leer = async (r: Response) => ({ status: r.status, body: await r.json() });
const pedir = (method: string, sub: string, body?: unknown, tipo = "text/plain;charset=UTF-8") =>
  new Request("http://x/misiones" + sub, { method, headers: { "content-type": tipo }, body: body === undefined ? undefined : JSON.stringify(body) });
const borrador = async (d: DepsMisiones, paso: string, texto: unknown, id = ID) => await leer(await handleMisiones(pedir("PUT", `/${id}/borrador`, { paso, texto }), `/${id}/borrador`, d, json));
const listar = async (d: DepsMisiones) => await leer(await handleMisiones(pedir("GET", ""), "", d, json));

Deno.test("borrador de misión: se guarda por paso y vuelve en GET /misiones (otro aparato); no es entrega", async () => {
  const store = datos();
  const r = await borrador(deps(store, ANA), "p1", "Mi avance del paso uno");
  assertEquals([r.status, r.body.guardado, typeof r.body.actualizado], [200, true, "string"]);
  await borrador(deps(store, ANA), "p2", "Otro paso");
  const doc = (await store.get<any>(RUTA))!.data;
  assertEquals([doc.mision, doc.pasos.p1.texto, doc.pasos.p2.texto], [ID, "Mi avance del paso uno", "Otro paso"]);
  assert(!JSON.stringify(doc).includes("@"), "sin correos");
  const g = await listar(deps(store, ANA));
  const m = g.body.misiones.find((x: any) => x.id === ID);
  assertEquals([m.borrador.pasos.p1.texto, m.entrega], ["Mi avance del paso uno", null], "borrador sí, entrega no");
  assertEquals(await store.get(`entregas/${ID}/ana.json`), null);
  // El admin no lo ve: ni en la bandeja ni en la vista de la alumna.
  const bandeja = await leer(await handleProfeEntregas(new Request("http://x/profe/entregas"), "", deps(store, ADMIN), json));
  assertEquals(bandeja.body.entregas, []);
  const vista = await leer(await handleMisiones(new Request("http://x/misiones?alumna=ana"), "", deps(store, ADMIN), json));
  assertEquals(vista.body.misiones.find((x: any) => x.id === ID).borrador, undefined);
});

Deno.test("borrador de misión: texto vacío borra el paso y el archivo; > 4 000 → 400; paso inexistente → 400", async () => {
  const store = datos();
  await borrador(deps(store, ANA), "p1", "hola");
  assertEquals((await borrador(deps(store, ANA), "p1", "x".repeat(4001))).body.error, "borrador_invalido");
  assertEquals((await borrador(deps(store, ANA), "p1", "x".repeat(4000))).status, 200, "4 000 exactos sí");
  assertEquals((await borrador(deps(store, ANA), "p9", "hola")).status, 400);
  assertEquals((await borrador(deps(store, ANA), "p1", 5)).status, 400);
  assertEquals((await borrador(deps(store, ANA), "p1", "  ")).body.vacio, true);
  assertEquals(await store.get(RUTA), null, "sin pasos no queda archivo");
});

Deno.test("borrador de misión: solo su dueña (admin, baja e invitado 403; misión ajena 404)", async () => {
  const store = datos();
  assertEquals((await borrador(deps(store, ADMIN), "p1", "x")).status, 403);
  assertEquals((await borrador(deps(store, { tipo: "baja", slug: "ana" }), "p1", "x")).status, 403);
  assertEquals((await borrador(deps(store, { tipo: "sin_acceso" }), "p1", "x")).status, 403);
  assertEquals((await borrador(deps(store, { tipo: "secundaria", slug: "otra", nombre: "Otra" }), "p1", "x")).status, 404);
  assertEquals((await borrador(deps(store, ANA), "p1", "x", "no-existe")).status, 404);
  assertEquals(await store.get(RUTA), null);
});

Deno.test("borrador de misión: entregar el paso borra solo su borrador; evaluada → 409", async () => {
  const store = datos();
  await borrador(deps(store, ANA), "p1", "uno");
  await borrador(deps(store, ANA), "p2", "dos");
  const e = await leer(await handleMisiones(pedir("POST", `/${ID}/entrega`, { paso: "p1", texto: "uno" }), `/${ID}/entrega`, deps(store, ANA), json));
  assertEquals(e.status, 200);
  const doc = (await store.get<any>(RUTA))!.data;
  assertEquals([doc.pasos.p1, doc.pasos.p2.texto], [undefined, "dos"]);
  for (const p of ["p2", "p3", "p4"]) await leer(await handleMisiones(pedir("POST", `/${ID}/entrega`, { paso: p, texto: "t " + p }), `/${ID}/entrega`, deps(store, ANA), json));
  assertEquals(await store.get(RUTA), null, "todo entregado: sin borrador");
  await leer(await handleProfeEntregas(new Request("http://x/profe/entregas/x", { method: "POST", body: JSON.stringify({ puntos: { c1: 25, c2: 25, c3: 25, c4: 25 } }) }), `/${ID}/ana/evaluar`, deps(store, ADMIN), json));
  assertEquals((await borrador(deps(store, ANA), "p1", "otra vez")).status, 409);
});

Deno.test("borrado a petición de una persona también quita sus borradores de misiones", async () => {
  const store = datos();
  await borrador(deps(store, ANA), "p1", "texto sin enviar");
  const r = await leer(await handleProfeEntregas(new Request("http://x/profe/entregas/persona/ana/borrar", { method: "POST", body: "{}" }), "/persona/ana/borrar", deps(store, ADMIN), json));
  assertEquals(r.status, 200);
  assertEquals(await store.get(RUTA), null);
});

Deno.test("retención: borra los borradores de misiones (texto libre) con --confirmar", async () => {
  const { aplicarRetencionBorradores } = await import("./retencion_entregas.ts");
  const borradas: string[] = [];
  const db = {
    select: () => Promise.resolve([{ path: RUTA }, { path: "borradores/misiones/x/otra.json" }]),
    remove: (_t: string, f: string) => { borradas.push(f); return Promise.resolve([{}, {}]); },
  } as any;
  assertEquals(await aplicarRetencionBorradores(db, false), { revisados: 2, borrados: 0 });
  assertEquals(borradas, []);
  assertEquals(await aplicarRetencionBorradores(db, true), { revisados: 2, borrados: 2 });
  assertEquals(borradas, [`path=like.${encodeURIComponent("borradores/misiones/*")}`]);
});
