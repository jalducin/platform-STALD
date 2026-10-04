// Alumnos y alumnas nuevos empiezan el lunes siguiente al alta (openspec: inicio-lunes-alumnos), sin red.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleActividades } from "./actividades.ts";
import { clearCacheAlumnos, handleAlumnos, lunesDeInicio } from "./alumnos.ts";
import type { InglesRow } from "./rows.ts";
import { MemoryStore } from "./store.ts";
import { storeCon } from "./test_datos.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

Deno.test("inicio: lunesDeInicio da el lunes siguiente en hora de CDMX", () => {
  assertEquals(lunesDeInicio("2026-09-30T23:00:00.000Z"), "2026-10-05", "miércoles → lunes siguiente");
  assertEquals(lunesDeInicio("2026-10-05T15:00:00.000Z"), "2026-10-12", "lunes → lunes de la semana siguiente");
  assertEquals(lunesDeInicio("2026-10-05T05:00:00.000Z"), "2026-10-05", "domingo 23:00 en CDMX → el día siguiente");
});

Deno.test("inicio: el alta nueva guarda inicio; la liga a un alumno de Notion no", async () => {
  clearCacheAlumnos();
  const store = new MemoryStore();
  const fila = (alumno: string): InglesRow => ({
    source: "clases_ingles", id: "p-" + alumno, name: "Clase", label: "", completado: false, fecha: null, alumno,
    calificacion: null, dificultad: null, editadoEn: null, userIds: [], userEmails: [], userNames: [], url: "",
  });
  const alta = async (nombre: string, email: string) => {
    const req = new Request("http://x/ingles/alumnos", { method: "POST", body: JSON.stringify({ nombre, email }) });
    return await (await handleAlumnos(req, "", { email: "admin@example.com", admin: "admin@example.com", store, filas: () => Promise.resolve([fila("Pedro")]), ahora: () => "2026-09-30T23:00:00.000Z" }, json)).json();
  };
  assertEquals((await alta("Luz", "luz@example.com")).alumno.inicio, "2026-10-05");
  assertEquals((await alta("Pedro", "pedro@example.com")).alumno.inicio, undefined, "Pedro ya llevaba el curso");
  const reg = (await store.get<any>("alumnos.json"))!.data;
  assertEquals([reg["luz@example.com"].inicio, "inicio" in reg["pedro@example.com"]], ["2026-10-05", false]);
});

Deno.test("inicio: la lista omite lo que venció antes del inicio; el grupo lo sigue viendo", async () => {
  const tema = { id: "x", titulo: "X", retroalimentacion: { "fortaleza": "a", "en-progreso": "b", "debilidad": "c" } };
  const examen = (id: string, desde: string, limite: string) => ({
    id, tipo: "examen", titulo: id, disponibleDesde: desde, fechaLimite: limite, intentos: 1, temas: [tema],
    banco: [{ id: "q1", tema: "x", tipo: "opcion", enunciado: "¿?", opciones: ["a", "b"], correcta: 0, explicacion: "a" }],
  });
  const s = storeCon({
    "contenido/examenes/viejo.json": examen("viejo", "2026-09-25", "2026-10-02"),
    "contenido/examenes/nuevo.json": examen("nuevo", "2026-10-01", "2026-10-09"),
  });
  Deno.env.set("PERMITIR_HOY", "1");
  const lista = async (quien: any) => {
    clearCache();
    const req = new Request("http://x/ingles/actividades?email=x&hoy=2026-10-03");
    const body = await (await handleActividades(req, "", quien, s, json)).json();
    return [...(body.items as any[]).map((i) => i.id), ...(body.inicio ? ["inicio:" + body.inicio] : [])];
  };
  assertEquals(await lista({ isAdmin: false, alumno: "Luz", inicio: "2026-10-05" }), ["nuevo", "inicio:2026-10-05"], "la lista avisa su lunes de inicio");
  assertEquals(await lista({ isAdmin: false, alumno: "Marisol" }), ["viejo", "nuevo"]);
});
