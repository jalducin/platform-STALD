// Prórroga por alumno o alumna (openspec: prorroga-por-alumno), con datos inline.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades } from "./actividades.ts";
import { type Item, validateItem } from "./motor.ts";
import { storeCon } from "./test_datos.ts";

const tema = { id: "x", titulo: "X", retroalimentacion: { "fortaleza": "a", "en-progreso": "b", "debilidad": "c" } };
const diag = {
  id: "diag", tipo: "examen", titulo: "Diagnóstico", disponibleDesde: "2026-09-20", fechaLimite: "2026-09-27", intentos: 1,
  temas: [tema], banco: [{ id: "q1", tema: "x", tipo: "opcion", enunciado: "¿?", opciones: ["a", "b"], correcta: 0, explicacion: "a" }],
  prorrogas: { sofy: "2026-09-29" },
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const store = () => storeCon({ "contenido/examenes/diag.json": structuredClone(diag) });
const call = async (s: ReturnType<typeof store>, alumno: string | null, method = "GET", sub = "", body?: unknown, hoy = "2026-09-28") => {
  Deno.env.set("PERMITIR_HOY", "1");
  clearCache();
  const req = new Request(`http://x/ingles/actividades${sub}?email=x&hoy=${hoy}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleActividades(req, sub, { isAdmin: !alumno, alumno }, s, json);
  return { status: res.status, body: await res.json() };
};

Deno.test("prórroga: la alumna ve su fecha; los demás y el admin, la base", async () => {
  const s = store();
  const sofy = await call(s, "Sofy");
  assertEquals(sofy.body.items[0].fechaLimite, "2026-09-29");
  assertEquals(sofy.body.items[0].estado, "disponible");
  assertEquals((await call(s, "Marisol")).body.items[0].fechaLimite, "2026-09-27");
  assertEquals((await call(s, null)).body.items[0].fechaLimite, "2026-09-27");
  assertEquals((await call(s, "Sofy", "GET", "/diag")).body.fechaLimite, "2026-09-29");
});

Deno.test("prórroga: entrega dentro de la prórroga no queda fuera de tiempo", async () => {
  const s = store();
  const r = await call(s, "Sofy", "POST", "/diag", { intento: 1, respuestas: { q1: 0 } }, "2026-09-29");
  assertEquals(r.status, 200);
  assertEquals((await s.get<{ intentos: { fueraDeTiempo: boolean }[] }>("resultados/diag/sofy.json"))!.data.intentos[0].fueraDeTiempo, false);
  const m = await call(s, "Marisol", "POST", "/diag", { intento: 1, respuestas: { q1: 0 } }, "2026-09-29");
  assertEquals(m.status, 200);
  assertEquals((await s.get<{ intentos: { fueraDeTiempo: boolean }[] }>("resultados/diag/marisol.json"))!.data.intentos[0].fueraDeTiempo, true);
});

Deno.test("prórroga: no adelanta la apertura", async () => {
  const s = store();
  const r = await call(s, "Sofy", "GET", "/diag", undefined, "2026-09-19");
  assertEquals(r.status, 403);
});

Deno.test("prórroga: validación", () => {
  assertEquals(validateItem(diag as unknown as Item), []);
  const mal = validateItem({ ...diag, prorrogas: { a: "mañana", b: "2026-09-01" } } as unknown as Item);
  assert(mal.some((e) => e.includes("prorrogas.a")), mal.join("\n"));
  assert(mal.some((e) => e.includes("prorrogas.b")), mal.join("\n"));
});

Deno.test("prórroga: se conserva en el formato del diagnóstico (secciones/preguntas)", async () => {
  const s = storeCon({ "contenido/examenes/diag.json": {
    id: "diag", titulo: "Diagnóstico", disponibleDesde: "2026-09-20", fechaLimite: "2026-09-27", prorrogas: { sofy: "2026-09-29" },
    secciones: [tema], preguntas: [{ id: "q1", seccion: "x", enunciado: "¿?", opciones: ["a", "b"], correcta: 0, explicacion: "a" }],
  } });
  assertEquals((await call(s, "Sofy")).body.items[0].fechaLimite, "2026-09-29");
});
