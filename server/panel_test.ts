// Panel del profe en una petición (openspec: panel-profe-peticiones): armarPanel junta las partes en paralelo, recorta
// lo que no hace falta (sin correos ni textos de entregas) y, si una parte falla, la marca sin tumbar las demás.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { armarPanel, handlePanel, type PartesPanel } from "./panel.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ok = (body: unknown) => () => Promise.resolve(json(body));

const GRUPOS = { grupos: [{ id: "grupo-1", nombre: "Grupo 1", color: "#4f46e5", activo: true, ocultoAdmin: false }], miembros: { luz: "grupo-1" } };
const ALUMNOS = {
  alumnos: [
    { nombre: "Luz", emails: ["luz@example.com"], origen: "registro", alta: "2026-09-01T00:00:00.000Z", inicio: "2026-09-07" },
    { nombre: "Sofía", emails: ["sofia@example.com"], origen: "registro", alta: "2026-09-01T00:00:00.000Z", baja: "2026-10-01", secundaria: true },
  ],
};
const RESUMEN = { semana: null, grupo: null, columnas: [], filas: [], kpis: { alumnos: 0 }, avisos: [] };
const BANDEJA = {
  entregas: [
    { mision: { id: "m1", ambito: "ingles" }, slug: "luz", nombre: "Luz", estado: "lista", pasos: { p1: { texto: "mi texto secreto" } } },
    { mision: { id: "m2", ambito: "secundaria" }, slug: "vale", nombre: "Vale", estado: "lista", pasos: {} },
    { mision: { id: "m1", ambito: "ingles" }, slug: "beto", nombre: "Beto", estado: "en-progreso", pasos: {} },
  ],
  pendientes: 2,
};
const partes = (extra: Partial<PartesPanel> = {}): PartesPanel => ({
  grupos: ok(GRUPOS), alumnos: ok(ALUMNOS), resumen: ok(RESUMEN), entregas: ok(BANDEJA), ...extra,
});

Deno.test("armarPanel: las cuatro partes, recortadas y sin correos ni textos", async () => {
  const p = await armarPanel(partes()) as any;
  assertEquals(p.grupos, GRUPOS);
  assertEquals(p.alumnos, [{ nombre: "Luz" }, { nombre: "Sofía", baja: "2026-10-01" }]);
  assertEquals(p.resumen, RESUMEN);
  assertEquals(p.entregas, { pendientes: 2, porRevisar: ["luz"] }, "solo misiones de Inglés listas; sin textos");
  assertEquals(p.fallas, []);
  const todo = JSON.stringify(p);
  assert(!todo.includes("@example.com"), "sin correos");
  assert(!todo.includes("mi texto secreto"), "sin textos de entregas");
});

Deno.test("armarPanel: las partes corren en paralelo", async () => {
  let enVuelo = 0, maximo = 0;
  const lenta = (body: unknown) => async () => {
    enVuelo++; maximo = Math.max(maximo, enVuelo);
    await new Promise((r) => setTimeout(r, 20));
    enVuelo--;
    return json(body);
  };
  await armarPanel({ grupos: lenta(GRUPOS), alumnos: lenta(ALUMNOS), resumen: lenta(RESUMEN), entregas: lenta(BANDEJA) });
  assertEquals(maximo, 4);
});

Deno.test("armarPanel: sin Postgres los grupos vienen como sin_base y no cuentan como falla", async () => {
  const p = await armarPanel(partes({ grupos: () => Promise.resolve(json({ error: "sin_base" }, 503)) })) as any;
  assertEquals(p.grupos, { error: "sin_base" });
  assertEquals(p.fallas, []);
  assertEquals(p.alumnos.length, 2);
});

Deno.test("armarPanel: una parte que falla (status o excepción) no tumba las demás", async () => {
  const p = await armarPanel(partes({
    resumen: () => Promise.resolve(json({ error: "upstream_error", detalle: "postgrest 500" }, 500)),
    entregas: () => Promise.reject(new Error("Signal timed out. " + "x".repeat(300))),
  })) as any;
  assertEquals(p.resumen, { error: "upstream_error", detalle: "postgrest 500" });
  assertEquals(p.entregas.error, "upstream_error");
  assert(p.entregas.detalle.startsWith("Signal timed out.") && p.entregas.detalle.length <= 200, p.entregas.detalle);
  assertEquals(p.fallas, ["resumen", "entregas"]);
  assertEquals(p.grupos, GRUPOS);
  assertEquals(p.alumnos.length, 2);
});

Deno.test("armarPanel: un 403 o un cuerpo inesperado también es falla de esa parte", async () => {
  const p = await armarPanel(partes({
    grupos: () => Promise.resolve(json({ error: "solo_admin" }, 403)),
    alumnos: ok({ nada: true }),
  })) as any;
  assertEquals(p.grupos, { error: "solo_admin" });
  assertEquals(p.alumnos, { error: "respuesta_invalida" });
  assertEquals(p.fallas, ["grupos", "alumnos"]);
});

Deno.test("handlePanel: solo el admin, solo GET", async () => {
  const deps = (email: string) => ({ email, admin: "admin@example.com", partes: partes() });
  const json2 = (b: unknown, s = 200) => json(b, s);
  const alumna = await handlePanel(new Request("http://x/ingles/panel"), deps("luz@example.com"), json2);
  assertEquals([alumna.status, await alumna.json()], [403, { error: "solo_admin" }]);
  const sinAdmin = await handlePanel(new Request("http://x/ingles/panel"), { email: "", admin: "", partes: partes() }, json2);
  assertEquals(sinAdmin.status, 403);
  const post = await handlePanel(new Request("http://x/ingles/panel", { method: "POST", body: "{}" }), deps("admin@example.com"), json2);
  assertEquals(post.status, 405);
  const admin = await handlePanel(new Request("http://x/ingles/panel"), deps("admin@example.com"), json2);
  const body = await admin.json() as any;
  assertEquals([admin.status, body.fallas, body.entregas.porRevisar], [200, [], ["luz"]]);
});
