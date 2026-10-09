// Meet del domingo sin reto: solo la clase y el material del profe (openspec: meet-sin-reto), con datos inline.
import { assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades } from "./actividades.ts";
import { storeCon } from "./test_datos.ts";

const meet = {
  id: "meet-x", tipo: "meet", titulo: "Clase por Meet", nivel: "A1", descripcion: "Clase en vivo.", disponibleDesde: "2026-10-11", fechaLimite: "2026-10-11",
  meetUrl: "https://meet.google.com/abc", hora: "18:00",
  teoria: [{ titulo: "Pasado", puntos: ["was / were"] }], tips: [{ tipo: "libreta", texto: "Escribe 5 oraciones" }],
  guion: [{ titulo: "Retro", tiempo: "10 min", pasos: ["Saludo"] }], presentacion: { diapositivas: [{ tipo: "portada", titulo: "Hola" }] },
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const store = () => storeCon({
  "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Semana 2", elementos: [{ id: "meet-x", tipo: "meet", fecha: "2026-10-11" }] },
  "contenido/actividades/meet-x.json": structuredClone(meet),
});
const call = async (s: ReturnType<typeof store>, alumno: string | null, sub = "") => {
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=2026-10-09`);
  const res = await handleActividades(req, sub, { isAdmin: !alumno, alumno }, s, json);
  return { status: res.status, body: await res.json() };
};

Deno.test("meet sin reto: la lista marca tieneMaterial y sin reto para el admin y para la alumna", async () => {
  const s = store();
  const adm = (await call(s, null)).body.items.find((x: { id: string }) => x.id === "meet-x");
  assertEquals([adm.tieneReto, adm.tieneMaterial, adm.intentosMax], [false, true, 0]);
  const alu = (await call(s, "Sofy")).body.items.find((x: { id: string }) => x.id === "meet-x");
  assertEquals([alu.tieneReto, alu.meetUrl, alu.guion, alu.presentacion], [false, "https://meet.google.com/abc", undefined, undefined]);
});

Deno.test("meet sin reto: el admin abre su material (guion, presentación, teoría); la alumna no", async () => {
  const s = store();
  const a = await call(s, null, "/meet-x");
  assertEquals(a.status, 200);
  assertEquals([a.body.guion.length, a.body.presentacion.diapositivas.length, a.body.teoria.length, a.body.preguntas.length, a.body.vistaPrevia], [1, 1, 1, 0, true]);
  const b = await call(s, "Sofy", "/meet-x");
  assertEquals([b.status, b.body.error, b.body.guion], [400, "no_aplica", undefined]);
});
