// Cierre técnico (openspec: cierre-tecnico): prefijos de PgStore (Juegos en Postgres), sin respaldo de GitHub e
// identidad de Inglés solo desde el registro (fase 2 de «Inglés sin Notion»).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { createDb, esRutaPg, PgStore, PREFIJOS_INGLES, PREFIJO_JUEGOS } from "./db.ts";
import { aplicarAlumnos, type RegistroAlumnos } from "./alumnos.ts";
import { MemoryStore } from "./store.ts";
import { postgrestFalso } from "./test_postgrest.ts";

Deno.test("cierre: esRutaPg según los prefijos activos", () => {
  assert(esRutaPg("resultados/a/b.json", PREFIJOS_INGLES));
  assert(esRutaPg("alumnos.json", PREFIJOS_INGLES));
  assert(!esRutaPg("juegos/salas/ABCD/sala.json", PREFIJOS_INGLES), "Juegos solo con su marca");
  assert(esRutaPg("juegos/salas/ABCD/sala.json", [...PREFIJOS_INGLES, PREFIJO_JUEGOS]));
  assert(!esRutaPg("contenido/semanas/x.json", [...PREFIJOS_INGLES, PREFIJO_JUEGOS]), "el contenido sigue en el repo");
  assert(!esRutaPg("alumnos.json.bak", PREFIJOS_INGLES), "alumnos.json es ruta exacta");
});

Deno.test("cierre: con juegos/ activo, las salas van a Postgres; sin él, al almacén base", async () => {
  const fake = postgrestFalso();
  const db = createDb({ url: "https://p", key: "k", fetch: fake.fetch });
  const base = new MemoryStore();
  const soloIngles = new PgStore(db, base, PREFIJOS_INGLES);
  await soloIngles.put("juegos/salas/ABCD/sala.json", { codigo: "ABCD" }, null, "x");
  assert(await base.get("juegos/salas/ABCD/sala.json"), "sin marca de Juegos: al base");
  const conJuegos = new PgStore(db, base, [...PREFIJOS_INGLES, PREFIJO_JUEGOS]);
  assertEquals(await conJuegos.put("juegos/salas/WXYZ/sala.json", { codigo: "WXYZ" }, null, "x"), true);
  assertEquals(await base.get("juegos/salas/WXYZ/sala.json"), null);
  assertEquals((await conJuegos.get<any>("juegos/salas/WXYZ/sala.json"))!.data.codigo, "WXYZ");
  assertEquals(await conJuegos.list("juegos/salas/WXYZ"), ["sala.json"]);
});

Deno.test("cierre: si Postgres falla, el error se propaga (sin copia vieja de GitHub)", async () => {
  const fake = postgrestFalso();
  const base = new MemoryStore();
  await base.put("resultados/act-1/luz.json", { intentos: [7] }, null);
  const store = new PgStore(createDb({ url: "https://p", key: "k", fetch: fake.fetch }), base);
  fake.caer(true);
  await assertRejects(() => store.get("resultados/act-1/luz.json"));
  await assertRejects(() => store.list("resultados/act-1"));
});

Deno.test("cierre: fase 2 — filasIngles = aplicarAlumnos([], registro) conserva la identidad del registro", () => {
  const registro: RegistroAlumnos = {
    "marisol@example.com": { nombre: "Marisol", alta: "2026-10-04T20:00:00.000Z", origen: "notion" },
    "adela@example.com": { nombre: "Adela", alta: "x", inicio: "2026-10-05" },
  };
  const filas = aplicarAlumnos([], registro);
  assertEquals(filas.map((r) => [r.source, r.alumno, r.userEmails]), [
    ["registro", "Marisol", ["marisol@example.com"]],
    ["registro", "Adela", ["adela@example.com"]],
  ]);
  assert(filas.every((r) => r.name === "" && r.fecha === null && !r.completado), "filas de identidad, sin tareas");
  assertEquals(aplicarAlumnos([], {}), [], "sin registro no hay nadie");
});
