// Baja de Inglés reversible (openspec: ingles-baja-alumno): POST /ingles/grupos/baja y /reactivar (solo admin) y sus
// efectos en server/main.ts. Sin red: fixture de Secundaria y almacén en memoria (DATA_DIR), nunca tablas `stald_`.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";

const dir = await Deno.makeTempDir();
const fixture = dir + "/rows.json";
// Sofía está en Inglés (registro) y en Secundaria (fila de Notion con su correo).
await Deno.writeTextFile(fixture, JSON.stringify({
  secundaria: [{ id: "s1", name: "Lunes - Matemáticas", materia: "Matemáticas", completado: false, fecha: "2026-10-26", fechaReal: null, semana: "S1", dia: "Lunes", url: "https://notion.so/x", userIds: ["u-s"], userEmails: ["sofia@example.com"], userNames: ["Sofía Prueba"] }],
}));
await Deno.mkdir(dir + "/datos/resultados/act-1", { recursive: true });
const registroInicial = {
  "luz@example.com": { nombre: "Luz", alta: "2026-09-01T00:00:00.000Z", origen: "notion" },
  "sofia@example.com": { nombre: "Sofía", alta: "2026-09-01T00:00:00.000Z", origen: "notion" },
};
await Deno.writeTextFile(dir + "/datos/alumnos.json", JSON.stringify(registroInicial));
const resultado = { alumno: "Sofía", intentos: [{ enviadoEn: "2026-10-01T12:00:00.000Z" }], mejor: null };
await Deno.writeTextFile(dir + "/datos/resultados/act-1/sofia.json", JSON.stringify(resultado));
Deno.env.set("ROWS_FIXTURE", fixture);
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
Deno.env.set("HOY_FIJO", "2026-10-21");
const { handler } = await import("./main.ts");

const tok = (email: string) => ({ Authorization: "Bearer prueba:" + email });
function cuerpo(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  return typeof body === "string" ? body : JSON.stringify(body);
}
async function pedir(method: string, ruta: string, quien: string | null, body?: unknown) {
  const r = await handler(new Request("http://x" + ruta, { method, headers: quien ? tok(quien) : {}, body: cuerpo(body) }));
  return { status: r.status, body: await r.json() as any };
}
const ADMIN = "admin@example.com";
const nombresData = async () => (await pedir("GET", "/ingles/data", ADMIN)).body.rows.map((r: any) => r.alumno).sort();

Deno.test("baja: solo el admin da de baja o reactiva; el registro no cambia", async () => {
  for (const sub of ["/baja", "/reactivar"]) {
    const r = await pedir("POST", "/ingles/grupos" + sub, "luz@example.com", { email: "sofia@example.com" });
    assertEquals([r.status, r.body.error], [403, "solo_admin"], sub);
    assertEquals((await pedir("POST", "/ingles/grupos" + sub, null, { email: "sofia@example.com" })).status, 401, sub + " sin sesión");
  }
  const reg = (await pedir("GET", "/ingles/alumnos", ADMIN)).body.alumnos;
  assertEquals(reg.filter((a: any) => a.baja).length, 0);
});

Deno.test("baja: errores de entrada (correo inexistente, JSON inválido)", async () => {
  assertEquals((await pedir("POST", "/ingles/grupos/baja", ADMIN, { email: "nadie@example.com" })).body.error, "not_found");
  assertEquals((await pedir("POST", "/ingles/grupos/baja", ADMIN, { email: "nadie@example.com" })).status, 404);
  const mal = await pedir("POST", "/ingles/grupos/baja", ADMIN, "{no es json");
  assertEquals([mal.status, mal.body.error], [400, "json_invalido"]);
  assertEquals((await pedir("POST", "/ingles/grupos/reactivar", ADMIN, { email: "nadie@example.com" })).status, 404);
});

Deno.test("baja: marca la fecha, sale de Inglés y conserva resultados; Secundaria y Juegos igual", async () => {
  const jugadorAntes = (await pedir("GET", "/juegos/yo", "sofia@example.com")).body.jugador;
  assertEquals(await nombresData(), ["Luz", "Sofía"]);

  const r = await pedir("POST", "/ingles/grupos/baja", ADMIN, { email: " Sofia@Example.com " });
  assertEquals([r.status, r.body.ok, r.body.alumno.baja, r.body.alumno.email], [200, true, "2026-10-21", "sofia@example.com"]);
  const otra = await pedir("POST", "/ingles/grupos/baja", ADMIN, { email: "sofia@example.com" });
  assertEquals([otra.status, otra.body.sinCambio, otra.body.alumno.baja], [200, true, "2026-10-21"], "repetir no cambia la fecha");

  // Admin: la lista marca la baja; tablero (data) y resumen ya no la tienen.
  const lista = (await pedir("GET", "/ingles/alumnos", ADMIN)).body.alumnos;
  assertEquals(lista.find((a: any) => a.nombre === "Sofía").baja, "2026-10-21");
  assertEquals(lista.find((a: any) => a.nombre === "Luz").baja, undefined);
  assertEquals(await nombresData(), ["Luz"]);
  const res = await pedir("GET", "/ingles/resumen", ADMIN);
  assertEquals(res.status, 200);
  assertEquals(res.body.filas.map((f: any) => f.alumno), ["Luz"]);
  assertEquals(res.body.kpis.alumnos, 1);

  // Ella: aviso de baja, sin actividades, sin Inglés en el portal; Secundaria y Juegos como antes.
  const suya = await pedir("GET", "/ingles/data", "sofia@example.com");
  assertEquals([suya.status, suya.body.rows, suya.body.baja, suya.body.isAdmin], [200, [], true, false]);
  const { generatedAt: _g, ...sinHora } = suya.body;
  assert(!JSON.stringify(sinHora).includes("2026-10-21"), "no recibe la fecha de baja");
  const act = await pedir("GET", "/ingles/actividades", "sofia@example.com");
  assertEquals([act.status, act.body.error], [403, "baja_ingles"]);
  const perfil = (await pedir("GET", "/perfil", "sofia@example.com")).body;
  assertEquals([perfil.nombre, perfil.conocido, perfil.accesos], ["Sofía", true, { ingles: false, secundaria: true, juegos: true }]);
  assertEquals((await pedir("GET", "/juegos/yo", "sofia@example.com")).body.jugador, jugadorAntes, "mismo jugador de Juegos");
  assertEquals(jugadorAntes.id, "a-sofia");
  const sec = await pedir("GET", "/secundaria/actividades", "sofia@example.com");
  assertEquals(sec.status, 200, "Secundaria sigue abierta para ella");

  // Luz no cambia y no recibe la marca de baja.
  const luz = await pedir("GET", "/ingles/data", "luz@example.com");
  assertEquals([luz.body.rows.length, luz.body.baja], [1, undefined]);

  // Sus resultados siguen en el almacén.
  const guardado = JSON.parse(await Deno.readTextFile(dir + "/datos/resultados/act-1/sofia.json"));
  assertEquals(guardado, resultado);
});

Deno.test("baja: reactivar la regresa a Inglés (y repetir no cambia nada)", async () => {
  await pedir("POST", "/ingles/grupos/baja", ADMIN, { email: "sofia@example.com" });
  const r = await pedir("POST", "/ingles/grupos/reactivar", ADMIN, { email: "sofia@example.com" });
  assertEquals([r.status, r.body.ok, r.body.alumno.baja], [200, true, undefined]);
  assertEquals((await pedir("POST", "/ingles/grupos/reactivar", ADMIN, { email: "sofia@example.com" })).body.sinCambio, true);
  assertEquals(await nombresData(), ["Luz", "Sofía"]);
  const suya = await pedir("GET", "/ingles/data", "sofia@example.com");
  assertEquals([suya.body.rows.length, suya.body.baja], [1, undefined]);
  assertEquals((await pedir("GET", "/perfil", "sofia@example.com")).body.accesos.ingles, true);
  assertEquals((await pedir("GET", "/ingles/actividades", "sofia@example.com")).status, 200);
  const lista = (await pedir("GET", "/ingles/alumnos", ADMIN)).body.alumnos;
  assertEquals(lista.find((a: any) => a.nombre === "Sofía").baja, undefined);
});
