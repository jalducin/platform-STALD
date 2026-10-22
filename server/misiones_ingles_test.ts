// Misiones en Inglés (openspec: rpg-ingles-hero-card): aviso `misiones` para la página, entrega de un alumno de Inglés
// con el motor de Secundaria, bandeja del profe y pasos entregados para la constancia del ranking. Almacén en memoria;
// personas inventadas.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import "../comun/constancia.js";
import { clearCache } from "./actividades.ts";
import { type DepsMisiones, handleMisiones, handleProfeEntregas, hayMisionesVisibles, limpiarCacheMisiones, pasosEntregados, type PersonaMision } from "./misiones.ts";
import type { Store } from "./store.ts";
import { storeCon } from "./test_datos.ts";
import { misionValida, mundosValidos } from "./test_misiones.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ID = "mis-ingles-grupo-isla-del-alfabeto";
const ANGEL: PersonaMision = { tipo: "ingles", slug: "angel", nombre: "Angel", grupo: "grupo-1" };
const OTRO: PersonaMision = { tipo: "ingles", slug: "luis", nombre: "Luis", grupo: "grupo-2" };
const C = (globalThis as any).Constancia;

const datos = () => storeCon({
  "contenido/secundaria/mundos.json": mundosValidos(),
  [`contenido/ingles/misiones/${ID}.json`]: misionValida({ id: ID, materia: "Inglés", mundo: "isla-del-alfabeto", disponibleDesde: "2026-11-09", grupos: ["grupo-1"] }),
});
function deps(store: Store, persona: PersonaMision, hoy: string): DepsMisiones {
  limpiarCacheMisiones();
  clearCache();
  return {
    store, hoy: () => hoy, ahora: () => `${hoy}T18:00:00.000Z`, persona: () => Promise.resolve(persona),
    alumnasSecundaria: () => Promise.resolve([]), nombreDe: (slug) => Promise.resolve(slug === "angel" ? "Angel" : null),
  };
}
const leer = async (r: Response) => ({ status: r.status, body: await r.json() });
const post = (ruta: string, body: unknown) => new Request("http://x" + ruta, { method: "POST", body: JSON.stringify(body) });

Deno.test("Inglés: el aviso `misiones` solo aparece cuando su grupo ya tiene una misión abierta", async () => {
  const s = datos();
  assertEquals(await hayMisionesVisibles(deps(s, ANGEL, "2026-11-08"), ANGEL), false); // abre el 9 de noviembre
  assertEquals(await hayMisionesVisibles(deps(s, ANGEL, "2026-11-09"), ANGEL), true);
  assertEquals(await hayMisionesVisibles(deps(s, OTRO, "2026-11-09"), OTRO), false); // otro grupo
  assertEquals(await hayMisionesVisibles(deps(s, { tipo: "admin" }, "2026-11-09"), { tipo: "admin" }), false);
  const roto: Store = { get: () => Promise.reject(new Error("caído")), put: () => Promise.resolve(false), list: () => Promise.reject(new Error("caído")), remove: () => Promise.resolve() };
  assertEquals(await hayMisionesVisibles(deps(roto, ANGEL, "2026-11-09"), ANGEL), false);
});

Deno.test("Inglés: entrega en texto con el motor, la ve el profe en su bandeja y cuenta en la constancia", async () => {
  const s = datos();
  const d = deps(s, ANGEL, "2026-11-10");
  const lista = await leer(await handleMisiones(new Request("http://x/misiones"), "", d, json));
  assertEquals(lista.body.misiones.map((m: any) => m.id), [ID]);
  assertEquals(lista.body.misiones[0].grupos, undefined); // sin datos de otros
  const paso = lista.body.misiones[0].pasos[0].id;
  const r = await leer(await handleMisiones(post(`/misiones/${ID}/entrega`, { paso, texto: "My hero is Captain Nova. She is twelve." }), `/${ID}/entrega`, d, json));
  assertEquals(r.status, 200);
  const bandeja = await leer(await handleProfeEntregas(new Request("http://x/profe/entregas"), "", deps(s, { tipo: "admin" }, "2026-11-10"), json));
  assertEquals(bandeja.body.entregas.map((e: any) => [e.mision.id, e.mision.ambito, e.nombre]), [[ID, "ingles", "Angel"]]);
  const pasos = await pasosEntregados(s, "ingles", "angel");
  assertEquals(pasos.length, 1);
  assertEquals(C.puntosConstancia({ actividades: [], pasosMision: pasos }, C.semanaDe("2026-11-10")), 20);
  assertEquals(await pasosEntregados(s, "ingles", "luis"), []);
});
