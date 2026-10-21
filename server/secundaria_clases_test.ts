// Clases de Secundaria (openspec: secundaria-mis-clases): campo opcional `materia` en el listado y validador
// `--secundaria` (2 clases por día de lunes a sábado y 3 el domingo, examen mensual con ventana). Datos inline, sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { AMBITO_SECUNDARIA, clearCache, handleSecundaria } from "./actividades.ts";
import { validarSemana } from "./semana.ts";
import { ej, storeCon, tema } from "./test_datos.ts";

const ADMIN = "admin@example.com";
const LUNES = "2026-10-26";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const filas = () => Promise.resolve([{ userEmails: ["luz@example.com"], userNames: ["Luz María Pérez"] }]);
const MATERIAS = ["Inglés", "Español", "Matemáticas", "Ciencias", "Ciencias Sociales", "Tecnología", "Artes", "Educación Física"];

function dia(n: number): string {
  const d = new Date(`${LUNES}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function clase(id: string, fecha: string, materia: string | undefined, extra: Record<string, unknown> = {}) {
  return {
    id, tipo: "actividad", titulo: `📘 ${materia ?? "Repaso"} · Tema ${id}`, ...(materia !== undefined ? { materia } : {}),
    disponibleDesde: fecha, fechaLimite: fecha, intentos: 2, preguntasPorIntento: 2, alumnos: ["luz"],
    temas: [tema("t")], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }],
    banco: [ej(`${id}-1`, "t"), ej(`${id}-2`, "t"), ej(`${id}-3`, "t"), ej(`${id}-4`, "t")], ...extra,
  };
}
// Semana de Secundaria: 2 clases por día de lunes a sábado, 3 el domingo y el examen mensual con ventana de 7 días.
function semana(cambios: Record<string, Record<string, unknown>> = {}) {
  const f: Record<string, unknown> = {};
  const elementos: { id: string; tipo: string; fecha: string }[] = [];
  let m = 0;
  for (let d = 0; d < 7; d++) {
    for (let k = 0; k < (d === 6 ? 3 : 2); k++) {
      const id = `sec-${d}-${k}-${dia(d)}`;
      elementos.push({ id, tipo: "actividad", fecha: dia(d) });
      f[`contenido/secundaria/actividades/${id}.json`] = clase(id, dia(d), MATERIAS[m++ % MATERIAS.length], cambios[id]);
    }
  }
  elementos.push({ id: "sec-mensual", tipo: "examen", fecha: dia(6) });
  f["contenido/secundaria/examenes/sec-mensual.json"] = {
    id: "sec-mensual", tipo: "examen", titulo: "📝 Examen mensual · Octubre", disponibleDesde: LUNES, fechaLimite: dia(6), intentos: 2,
    preguntasPorIntento: 2, alumnos: ["luz"], temas: [tema("t")], banco: [ej("m1", "t"), ej("m2", "t")],
  };
  f[`contenido/secundaria/semanas/${LUNES}.json`] = { id: LUNES, titulo: "Semana 1 de clases", elementos };
  return f;
}
const PRIMERA = `sec-0-0-${LUNES}`;

Deno.test("validar --secundaria: semana de 2/3 clases por día con materia, sin errores ni avisos de patrón", async () => {
  clearCache();
  const r = await validarSemana(storeCon(semana()), LUNES, AMBITO_SECUNDARIA);
  assertEquals(r.errores, []);
  assertEquals(r.avisos.filter((a) => a.includes("se esperaba")), [], "sin patrón de días");
  assertEquals(r.avisos.filter((a) => a.includes("segundaOportunidad")), [], "el mensual hace sus 2 intentos seguidos");
});

Deno.test("validar --secundaria: el examen mensual puede abrir antes de su día, pero no antes del lunes", async () => {
  clearCache();
  const ok = await validarSemana(storeCon(semana()), LUNES, AMBITO_SECUNDARIA);
  assertEquals(ok.errores.filter((e) => e.includes("bloqueado hasta su día")), []);
  const f = semana();
  (f["contenido/secundaria/examenes/sec-mensual.json"] as any).disponibleDesde = "2026-10-20";
  clearCache();
  const mal = await validarSemana(storeCon(f), LUNES, AMBITO_SECUNDARIA);
  assert(mal.errores.some((e) => e.startsWith("sec-mensual: disponibleDesde 2026-10-20 fuera de")), mal.errores.join("\n"));
});

Deno.test("validar: materia vacía, que no es texto o larga es error en cualquier ámbito", async () => {
  for (const materia of ["", 7, "x".repeat(41)]) {
    clearCache();
    const r = await validarSemana(storeCon(semana({ [PRIMERA]: { materia } })), LUNES, AMBITO_SECUNDARIA);
    assert(r.errores.some((e) => e.includes(`${PRIMERA}: materia`)), `materia ${JSON.stringify(materia)}: ${r.errores.join("\n")}`);
  }
});

Deno.test("validar --secundaria: materia fuera de las 8 conocidas es aviso; sin materia, nada", async () => {
  clearCache();
  const r = await validarSemana(storeCon(semana({ [PRIMERA]: { materia: "Robótica" } })), LUNES, AMBITO_SECUNDARIA);
  assertEquals(r.errores, []);
  assert(r.avisos.some((a) => a.includes(`${PRIMERA}: materia «Robótica»`)), r.avisos.join("\n"));
  clearCache();
  const f = semana();
  delete (f[`contenido/secundaria/actividades/${PRIMERA}.json`] as any).materia;
  const sin = await validarSemana(storeCon(f), LUNES, AMBITO_SECUNDARIA);
  assertEquals([sin.errores, sin.avisos.filter((a) => a.includes("materia"))], [[], []]);
});

Deno.test("validar sin --secundaria: busca la semana en contenido/semanas", async () => {
  clearCache();
  const r = await validarSemana(storeCon(semana()), LUNES);
  assertEquals(r.errores, [`contenido/semanas/${LUNES}.json no existe`]);
});

Deno.test("CLI validar_semana --secundaria: código 0 con la semana válida y 1 con materia inválida", async () => {
  const dir = await Deno.makeTempDir();
  const escribir = async (f: Record<string, unknown>) => {
    for (const [ruta, v] of Object.entries(f)) {
      await Deno.mkdir(`${dir}/${ruta.slice(0, ruta.lastIndexOf("/"))}`, { recursive: true });
      await Deno.writeTextFile(`${dir}/${ruta}`, JSON.stringify(v));
    }
  };
  const correr = async () => {
    const cli = new URL("./validar_semana.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const o = await new Deno.Command(Deno.execPath(), { args: ["run", "--allow-read", cli, dir, LUNES, "--secundaria"], stdout: "piped", stderr: "piped" }).output();
    return { code: o.code, out: new TextDecoder().decode(o.stdout) };
  };
  try {
    await escribir(semana());
    const ok = await correr();
    assertEquals(ok.code, 0, ok.out);
    assert(ok.out.includes(`Semana ${LUNES}: 0 error(es)`), ok.out);
    await escribir(semana({ [PRIMERA]: { materia: "" } }));
    const mal = await correr();
    assertEquals(mal.code, 1, mal.out);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

async function lista(store: any, email: string) {
  Deno.env.set("PERMITIR_HOY", "1");
  const req = new Request(`http://x/secundaria/actividades?hoy=2026-10-27`);
  const res = await handleSecundaria(req, "", email, ADMIN, store, filas, json);
  return { status: res.status, body: await res.json() };
}

Deno.test("/secundaria/actividades: deja pasar materia y no la inventa si falta", async () => {
  clearCache();
  const f = semana();
  delete (f[`contenido/secundaria/actividades/sec-0-1-${LUNES}.json`] as any).materia;
  const store = storeCon(f);
  const luz = await lista(store, "luz@example.com");
  assertEquals(luz.status, 200);
  const por = new Map(luz.body.items.map((i: any) => [i.id, i]));
  assertEquals((por.get(PRIMERA) as any).materia, "Inglés");
  assertEquals("materia" in (por.get(`sec-0-1-${LUNES}`) as any), false);
  assertEquals("materia" in (por.get("sec-mensual") as any), false);
  const admin = await lista(store, ADMIN);
  assertEquals(admin.body.items.find((i: any) => i.id === PRIMERA).materia, "Inglés");
});

Deno.test("/secundaria/actividades: la matriz de acceso no cambia (sin Secundaria 403, sin correo 400)", async () => {
  clearCache();
  const store = storeCon(semana());
  assertEquals((await lista(store, "nadie@example.com")).status, 403);
  assertEquals((await lista(store, "")).status, 400);
});
