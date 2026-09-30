// Marcar tareas de Notion como completadas (openspec: marcar-completadas), sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { handleCompletar } from "./completar.ts";
import type { InglesRow } from "./rows.ts";
import { MemoryStore } from "./store.ts";

const fila = (id: string, alumno: string, email: string, completado = false): InglesRow => ({
  source: "clases_ingles", id, name: `Tarea de ${alumno}`, label: "", completado, fecha: "2026-09-27", alumno,
  calificacion: null, dificultad: "A1", editadoEn: null, userIds: ["u"], userEmails: [email], userNames: [alumno], url: "https://notion.so/x",
});
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

function deps(notionStatus = 200) {
  const parches: { id: string; completado: boolean }[] = [];
  const store = new MemoryStore();
  return {
    parches, store,
    d: {
      filas: () => Promise.resolve([fila("aaaa-1111", "Sofy", "sofy@example.com"), fila("bbbb2222", "Marisol", "marisol@example.com", true)]),
      parche: (id: string, completado: boolean) => { parches.push({ id, completado }); return Promise.resolve({ ok: notionStatus < 300, status: notionStatus }); },
      store, admin: "admin@example.com",
    },
  };
}
const post = (body: unknown) => new Request("http://x", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

Deno.test("completar: la alumna marca su tarea (Notion + avance)", async () => {
  const { d, parches, store } = deps();
  const r = await handleCompletar(post({ completado: true }), "aaaa1111", "sofy@example.com", d, json);
  assertEquals(r.status, 200);
  const b = await r.json();
  assertEquals([b.ok, b.completado, b.registrado], [true, true, true]);
  assertEquals(parches, [{ id: "aaaa-1111", completado: true }]);
  const av = (await store.get<any>("avance/sofy.json"))!.data;
  assertEquals(av.alumno, "Sofy");
  assertEquals(av.notion["aaaa-1111"].completado, true);
  assertEquals(av.historial.length, 1);
  assertEquals(av.historial[0].por, "alumno");
  assertEquals(JSON.stringify(av).includes("@"), false, "sin correos");
});

Deno.test("completar: fila ajena → 403 y Notion no cambia", async () => {
  const { d, parches } = deps();
  const r = await handleCompletar(post({ completado: false }), "bbbb2222", "sofy@example.com", d, json);
  assertEquals([r.status, (await r.json()).error], [403, "sin_acceso"]);
  assertEquals(parches.length, 0);
  const x = await handleCompletar(post({ completado: true }), "aaaa1111", "desconocido@example.com", d, json);
  assertEquals(x.status, 403);
});

Deno.test("completar: admin desmarca cualquier fila; historial por admin", async () => {
  const { d, parches, store } = deps();
  await handleCompletar(post({ completado: true }), "aaaa-1111", "sofy@example.com", d, json);
  const r = await handleCompletar(post({ completado: false }), "aaaa-1111", "admin@example.com", d, json);
  assertEquals(r.status, 200);
  assertEquals(parches.at(-1), { id: "aaaa-1111", completado: false });
  const av = (await store.get<any>("avance/sofy.json"))!.data;
  assertEquals(av.notion["aaaa-1111"].completado, false);
  assertEquals(av.historial.map((h: any) => h.por), ["alumno", "admin"]);
});

Deno.test("completar: 400 sin correo o con cuerpo inválido", async () => {
  const { d, parches } = deps();
  assertEquals((await handleCompletar(post({ completado: true }), "aaaa1111", "", d, json)).status, 400);
  assertEquals((await handleCompletar(post({ completado: "si" }), "aaaa1111", "sofy@example.com", d, json)).status, 400);
  assertEquals((await handleCompletar(post("no es json"), "aaaa1111", "sofy@example.com", d, json)).status, 400);
  assertEquals(parches.length, 0);
});

Deno.test("completar: Notion sin permiso → 502 sin_permiso_notion, sin avance", async () => {
  const { d, store } = deps(403);
  const r = await handleCompletar(post({ completado: true }), "aaaa1111", "sofy@example.com", d, json);
  assertEquals([r.status, (await r.json()).error], [502, "sin_permiso_notion"]);
  assertEquals(await store.get("avance/sofy.json"), null);
});

Deno.test("completar: el historial guarda como máximo 200 entradas", async () => {
  const { d, store } = deps();
  for (let i = 0; i < 205; i++) await handleCompletar(post({ completado: i % 2 === 0 }), "aaaa1111", "sofy@example.com", d, json);
  const av = (await store.get<any>("avance/sofy.json"))!.data;
  assertEquals(av.historial.length, 200);
  assert(av.notion["aaaa-1111"].completado === true);
});
