// Secundaria sin Notion (openspec: secundaria-sin-notion): identidad desde el registro alumnos.json con
// `secundaria: true` (la baja de Inglés no la quita), caída temporal a Notion mientras nadie esté marcado, la marca del
// profe (POST /ingles/grupos/secundaria) y la vista del profe «como la ve la alumna». Datos inline con @example.com.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { clearCache, handleSecundaria } from "./actividades.ts";
import { clearCacheAlumnos, handleAlumnos, handleSecundariaAlumno, leerRegistro, RUTA_ALUMNOS } from "./alumnos.ts";
import { armarPerfil } from "./perfil.ts";
import { alumnasSecundaria, type FilaSecundaria, filasDeRegistro, filasSecundaria, identidadSecundaria, slugsExclusivos } from "./secundaria_registro.ts";
import { storeCon, tema } from "./test_datos.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const pregunta = (id: string, t: string) => ({ id, tema: t, tipo: "opcion", enunciado: `¿${id}?`, opciones: ["bien", "mal"], correcta: 0, explicacion: "x" });
const ALTA = "2026-09-01T12:00:00.000Z";
// Sofía: de baja de Inglés y con Secundaria (su caso real). Luz: Secundaria. Marisol: solo Inglés.
const REGISTRO = {
  "sofia@example.com": { nombre: "Sofía", alta: ALTA, origen: "notion", baja: "2026-10-21", secundaria: true },
  "luz@example.com": { nombre: "Luz", alta: ALTA, secundaria: true },
  "marisol@example.com": { nombre: "Marisol", alta: ALTA },
};

function datos(registro: unknown = REGISTRO) {
  clearCacheAlumnos();
  return storeCon({
    ...(registro ? { [RUTA_ALUMNOS]: registro } : {}),
    "contenido/secundaria/semanas/2026-10-26.json": { id: "2026-10-26", titulo: "Semana 1", elementos: [
      { id: "sec-mate", tipo: "actividad", fecha: "2026-10-27" },
      { id: "sec-todos", tipo: "actividad", fecha: "2026-10-28" },
    ] },
    "contenido/secundaria/actividades/sec-mate.json": {
      id: "sec-mate", tipo: "actividad", titulo: "🔢 Matemáticas · Fracciones", materia: "Matemáticas", disponibleDesde: "2026-10-26", fechaLimite: "2026-10-27",
      intentos: 2, preguntasPorIntento: 2, alumnos: ["sofia", "sofy"], temas: [tema("fracciones")],
      banco: [pregunta("f1", "fracciones"), pregunta("f2", "fracciones")],
    },
    "contenido/secundaria/actividades/sec-todos.json": {
      id: "sec-todos", tipo: "actividad", titulo: "🔬 Ciencias · Célula", disponibleDesde: "2026-10-26", fechaLimite: "2026-10-28",
      intentos: 2, preguntasPorIntento: 2, temas: [tema("celula")], banco: [pregunta("c1", "celula"), pregunta("c2", "celula")],
    },
  });
}

// Filas de identidad como las arma main.ts: registro con `secundaria: true`; si nadie, Notion (aquí, simuladas).
async function filasDe(store: any, notion: () => Promise<FilaSecundaria[]> = () => Promise.resolve([])) {
  return await filasSecundaria({ registro: () => leerRegistro(store), notion, avisar: () => {} });
}
async function sec(store: any, method: string, sub: string, email: string, q = "", body?: unknown) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades${sub}?hoy=2026-10-27${q}`, { method, body: body ? JSON.stringify(body) : undefined });
  const res = await handleSecundaria(req, sub, email, ADMIN, store, () => filasDe(store), json);
  return { status: res.status, body: await res.json() };
}
async function marcar(store: any, email: string, correo: string, secundaria: unknown, slugPrevio?: string | null) {
  const req = new Request("http://x/ingles/grupos/secundaria", { method: "POST", body: JSON.stringify({ email: correo, secundaria }) });
  const res = await handleSecundariaAlumno(req, { email, admin: ADMIN, store, hoy: () => "2026-10-22", ...(slugPrevio !== undefined ? { slugPrevio: () => Promise.resolve(slugPrevio) } : {}) }, json);
  return { status: res.status, body: await res.json() };
}

// ---------- Registro ----------
Deno.test("registro: solo las entradas con secundaria: true, aunque estén de baja de Inglés", () => {
  assertEquals(filasDeRegistro(REGISTRO as any), [
    { userIds: [], userEmails: ["sofia@example.com"], userNames: ["Sofía"], slug: "sofia" },
    { userIds: [], userEmails: ["luz@example.com"], userNames: ["Luz"], slug: "luz" },
  ]);
});

Deno.test("registro: slugSecundaria guardado manda sobre el del nombre; uno inválido se ignora", () => {
  const reg: any = { "s@example.com": { nombre: "Sofy", alta: ALTA, secundaria: true, slugSecundaria: "sofia" }, "x@example.com": { nombre: "Ana Sofía", alta: ALTA, secundaria: true, slugSecundaria: "Ana!" } };
  assertEquals(filasDeRegistro(reg).map((f) => f.slug), ["sofia", "ana-sofia"]);
});

Deno.test("registro: con alguien marcado no se consulta Notion", async () => {
  let consultas = 0;
  const filas = await filasDe(datos(), () => { consultas++; return Promise.resolve([]); });
  assertEquals([filas.length, consultas], [2, 0]);
});

Deno.test("registro: sin marca, entra quien tiene clases exclusivas con su slug (Sofy, de baja de Inglés)", async () => {
  const reg: any = {
    "sofy@example.com": { nombre: "Sofy", alta: ALTA, origen: "notion", baja: "2026-10-21" },
    "marisol@example.com": { nombre: "Marisol", alta: ALTA },
  };
  const exclusivos = slugsExclusivos([{ alumnos: ["sofia", "sofy"] }, {}]);
  assertEquals(filasDeRegistro(reg, exclusivos), [{ userIds: [], userEmails: ["sofy@example.com"], userNames: ["Sofy"], slug: "sofy" }]);
  let consultas = 0;
  const filas = await filasSecundaria({ registro: () => Promise.resolve(reg), exclusivos: () => Promise.resolve(exclusivos), notion: () => { consultas++; return Promise.resolve([]); }, avisar: () => {} });
  assertEquals([filas.length, consultas], [1, 0], "no consulta Notion");
});

Deno.test("sin Notion: si leer el contenido falla, sigue con la marca del registro y no lanza", async () => {
  const filas = await filasSecundaria({ registro: () => Promise.resolve(REGISTRO as any), exclusivos: () => Promise.reject(new Error("github_rate_limit")), notion: () => Promise.reject(new Error("notion_404")), avisar: () => {} });
  assertEquals(filas.length, 2);
});

// ---------- Sin nadie marcado: caída temporal a Notion ----------
Deno.test("sin registro de Secundaria: usa las filas de Notion y avisa en el log", async () => {
  const avisos: string[] = [];
  const notion = [{ userIds: ["u"], userEmails: ["sofia@example.com"], userNames: ["Sofía Pérez"] }];
  const store = datos({ "marisol@example.com": { nombre: "Marisol", alta: ALTA } });
  const filas = await filasSecundaria({ registro: () => leerRegistro(store), notion: () => Promise.resolve(notion), avisar: (m) => avisos.push(m) });
  assertEquals([filas, avisos.length], [notion, 1]);
  assert(avisos[0].includes("secundaria: true"));
});

Deno.test("sin registro de Secundaria: si Notion falla (o no hay token), lista vacía y aviso, sin lanzar", async () => {
  const avisos: string[] = [];
  const filas = await filasSecundaria({ registro: () => Promise.resolve({}), notion: () => Promise.reject(new Error("notion_401")), avisar: (m) => avisos.push(m) });
  assertEquals([filas, avisos.length], [[], 2]);
});

// ---------- Alumna ----------
Deno.test("alumna: entra con el slug del registro y ve su clase exclusiva", async () => {
  clearCache();
  const r = await sec(datos(), "GET", "", "sofia@example.com");
  assertEquals([r.status, r.body.isAdmin, r.body.items.map((i: any) => i.id)], [200, false, ["sec-mate", "sec-todos"]]);
  assert(!JSON.stringify(r.body).includes("@example.com"), "sin correos en la respuesta");
});

Deno.test("alumna: con slug heredado «sofy» ve sus exclusivos y sus resultados guardados como sofy", async () => {
  clearCache();
  const store = datos({ "sofia@example.com": { nombre: "Sofía", alta: ALTA, secundaria: true, slugSecundaria: "sofy" } });
  await store.put("resultados/sec-mate/sofy.json", { alumno: "Sofy", itemId: "sec-mate", intentos: [{ n: 1, enviadoEn: "2026-10-27T10:00:00Z", calificacion: { porcentaje: 50, correctas: 1, total: 2, secciones: [] }, respuestas: {} }], mejor: { porcentaje: 50, correctas: 1, total: 2, secciones: [] } }, null);
  const r = await sec(store, "GET", "", "sofia@example.com");
  const mate = r.body.items.find((i: any) => i.id === "sec-mate");
  assertEquals([r.status, mate?.intentosUsados, mate?.mejor?.porcentaje], [200, 1, 50]);
});

Deno.test("alumna: el parámetro ?alumna se ignora (ve lo suyo)", async () => {
  clearCache();
  const r = await sec(datos(), "GET", "", "luz@example.com", "&alumna=sofia");
  assertEquals([r.status, r.body.isAdmin, r.body.items.map((i: any) => i.id), "vistaDe" in r.body], [200, false, ["sec-todos"], false]);
});

// ---------- Otra persona ----------
Deno.test("otra persona: un correo sin Secundaria (aunque sea de Inglés) o fuera del registro recibe 403", async () => {
  clearCache();
  for (const correo of ["marisol@example.com", "nadie@example.com"]) {
    const r = await sec(datos(), "GET", "", correo);
    assertEquals([r.status, r.body.error], [403, "sin_acceso"], correo);
  }
});

Deno.test("otra alumna del registro: no ve el exclusivo y recibe 404 por id", async () => {
  clearCache();
  const store = datos();
  const lista = await sec(store, "GET", "", "luz@example.com");
  assertEquals(lista.body.items.map((i: any) => i.id), ["sec-todos"]);
  assertEquals((await sec(store, "GET", "/sec-mate", "luz@example.com")).status, 404);
});

// ---------- Admin ----------
Deno.test("admin: la lista trae las alumnas del registro (nombre y slug, sin correos)", async () => {
  clearCache();
  const r = await sec(datos(), "GET", "", ADMIN);
  assertEquals([r.status, r.body.isAdmin], [200, true]);
  assertEquals(r.body.alumnas, [{ nombre: "Sofía", slug: "sofia" }, { nombre: "Luz", slug: "luz" }]);
  assert(!JSON.stringify(r.body).includes("@example.com"));
});

Deno.test("admin: ?alumna=sofia da la vista de ella con estado y mejor, marcada como admin", async () => {
  clearCache();
  const store = datos();
  // Sofía resuelve su clase (2 de 2).
  const g = await sec(store, "GET", "/sec-mate", "sofia@example.com");
  await sec(store, "POST", "/sec-mate", "sofia@example.com", "", { intento: 1, respuestas: Object.fromEntries(g.body.preguntas.map((p: any) => [p.id, 0])) });
  const r = await sec(store, "GET", "", ADMIN, "&alumna=sofia");
  assertEquals([r.status, r.body.isAdmin, r.body.vistaDe], [200, true, { nombre: "Sofía", slug: "sofia" }]);
  const mate = r.body.items.find((i: any) => i.id === "sec-mate");
  assertEquals([mate.estado, mate.intentosUsados, mate.mejor.porcentaje], ["completo", 1, 100]);
  assert(Array.isArray(mate.mejor.secciones), "calificación por materia");
  assertEquals(r.body.alumnas.length, 2, "también trae las alumnas para el selector");
});

Deno.test("admin: ?alumna desconocida → 404 alumna_no_encontrada", async () => {
  clearCache();
  const r = await sec(datos(), "GET", "", ADMIN, "&alumna=nadie");
  assertEquals([r.status, r.body.error], [404, "alumna_no_encontrada"]);
});

Deno.test("admin: un POST con ?alumna no escribe a nombre de la alumna", async () => {
  clearCache();
  const store = datos();
  const g = await sec(store, "GET", "/sec-mate", ADMIN, "&alumna=sofia");
  assertEquals([g.status, g.body.vistaPrevia], [200, true], "abrir con ?alumna es la vista previa del admin");
  await sec(store, "POST", "/sec-mate", ADMIN, "&alumna=sofia", { intento: 1, respuestas: {} });
  assertEquals(await store.get("resultados/sec-mate/sofia.json"), null);
});

// ---------- Perfil e identidad ----------
Deno.test("perfil: con filas del registro, accesos.secundaria y el nombre «Sofía»", async () => {
  const filas = await filasDe(datos());
  const p = armarPerfil("sofia@example.com", ADMIN, [], filas);
  assertEquals([p.accesos.secundaria, p.accesos.ingles, p.nombre, p.conocido], [true, false, "Sofía", true]);
  assertEquals(armarPerfil("nadie@example.com", ADMIN, [], filas).accesos.secundaria, false);
});

Deno.test("identidad: nombre y slug por correo; alumnas sin correos", async () => {
  const filas = await filasDe(datos());
  assertEquals(identidadSecundaria(filas, "sofia@example.com"), { nombre: "Sofía", slug: "sofia" });
  assertEquals(identidadSecundaria(filas, "nadie@example.com"), null);
  // Filas de Notion (sin slug): primer nombre y su slug, como antes.
  assertEquals(identidadSecundaria([{ userEmails: ["x@example.com"], userNames: ["Luz María Pérez"] }], "x@example.com"), { nombre: "Luz", slug: "luz" });
  assertEquals(alumnasSecundaria(filas), [{ nombre: "Sofía", slug: "sofia" }, { nombre: "Luz", slug: "luz" }]);
});

// ---------- La marca del profe: POST /ingles/grupos/secundaria ----------
Deno.test("marca: el admin da y quita Secundaria; la baja de Inglés no cambia", async () => {
  clearCache();
  const store = datos();
  const si = await marcar(store, ADMIN, "marisol@example.com", true, null);
  assertEquals([si.status, si.body.alumno.secundaria], [200, true]);
  assertEquals((await sec(store, "GET", "", "marisol@example.com")).status, 200, "ya entra a Secundaria");
  const no = await marcar(store, ADMIN, "sofia@example.com", false);
  assertEquals([no.status, "secundaria" in no.body.alumno, no.body.alumno.baja], [200, false, "2026-10-21"]);
  clearCacheAlumnos();
  assertEquals((await sec(store, "GET", "", "sofia@example.com")).status, 403, "sin la marca ya no entra");
  const otra = await marcar(store, ADMIN, "sofia@example.com", false);
  assertEquals(otra.body.sinCambio, true);
});

Deno.test("marca: guarda el slug de Notion si no es el de su nombre (sus resultados siguen bajo un solo slug)", async () => {
  const store = datos({ "sofy@example.com": { nombre: "Sofy", alta: ALTA, origen: "notion", baja: "2026-10-21" } });
  const r = await marcar(store, ADMIN, "sofy@example.com", true, "sofia");
  assertEquals([r.body.alumno.secundaria, r.body.alumno.slugSecundaria], [true, "sofia"]);
  const doc = (await store.get<any>(RUTA_ALUMNOS))!.data["sofy@example.com"];
  assertEquals([doc.slugSecundaria, doc.baja, doc.origen], ["sofia", "2026-10-21", "notion"]);
  // Al quitar la marca se conserva el slug; mismo slug que el nombre: no se guarda.
  assertEquals((await marcar(store, ADMIN, "sofy@example.com", false)).body.alumno.slugSecundaria, "sofia");
  const store2 = datos({ "luz@example.com": { nombre: "Luz", alta: ALTA } });
  assertEquals("slugSecundaria" in (await marcar(store2, ADMIN, "luz@example.com", true, "luz")).body.alumno, false);
});

Deno.test("marca: solo admin, cuerpo válido y correo del registro", async () => {
  const store = datos();
  assertEquals((await marcar(store, "luz@example.com", "luz@example.com", true)).status, 403);
  assertEquals((await marcar(store, ADMIN, "luz@example.com", "si")).body.error, "secundaria_invalida");
  assertEquals((await marcar(store, ADMIN, "nadie@example.com", true)).status, 404);
});

Deno.test("lista del admin (/ingles/alumnos) dice quién está en Secundaria, sin cambiar el resto", async () => {
  const store = datos();
  const res = await handleAlumnos(new Request("http://x/ingles/alumnos"), "", { email: ADMIN, admin: ADMIN, store, filas: () => Promise.resolve([]) }, json);
  const alumnos = (await res.json()).alumnos;
  assertEquals(alumnos.map((a: any) => [a.nombre, !!a.secundaria, !!a.baja]), [["Luz", true, false], ["Marisol", false, false], ["Sofía", true, true]]);
});
