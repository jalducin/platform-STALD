// Validador de misiones y del catálogo de mundos (openspec: rpg-fase2-misiones, forma `--misiones <ámbito>`).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../comun/gamificacion.js";
import { validarCatalogo, validarMision, validarMisiones } from "./misiones_validar.ts";
import { storeCon } from "./test_datos.ts";
import { criterio, misionValida, mundosValidos } from "./test_misiones.ts";

const G = (globalThis as any).Gamificacion;
const catalogo = () => mundosValidos().mundos;
const errores = (m: unknown) => validarMision(m, catalogo(), "mis-mate-valle-de-los-numeros").errores;

Deno.test("misión válida: 0 errores (4 pasos, rúbrica 4 × 25, aviso de privacidad)", () => {
  assertEquals(errores(misionValida()), []);
});

Deno.test("rúbrica que suma 90 o con 3 criterios: error", () => {
  const r90 = misionValida({ rubrica: [criterio("c1"), criterio("c2"), criterio("c3"), criterio("c4", 15)] });
  assert(errores(r90).some((e) => e.includes("suma 90")));
  assert(errores(misionValida({ rubrica: [criterio("c1", 34), criterio("c2", 33), criterio("c3", 33)] })).some((e) => e.includes("exactamente 4 criterios")));
});

Deno.test("paso con imagen o audio: «por ahora las entregas son solo texto»", () => {
  const m = misionValida();
  m.pasos[1].tipoEntrega = "imagen";
  m.pasos[2].tipoEntrega = "audio";
  const e = errores(m);
  assertEquals(e.filter((x) => x.includes("por ahora las entregas son solo texto")).length, 2);
});

Deno.test("fechas fuera del mundo o fuera de orden: error", () => {
  const fuera = misionValida();
  fuera.pasos[3].fechaLimite = "2026-11-25"; // el Valle termina el 22
  assert(errores(fuera).some((e) => e.includes("después de que termine el mundo")));
  const desorden = misionValida();
  desorden.pasos[1].fechaLimite = "2026-11-03";
  assert(errores(desorden).some((e) => e.includes("no van en orden")));
});

Deno.test("sin aviso de privacidad, mundo desconocido, 2 pasos o campos faltantes: error", () => {
  assert(errores(misionValida({ consigna: "Planea una venta." })).some((e) => e.includes("aviso de privacidad")));
  assert(errores(misionValida({ mundo: "mundo-inventado" })).some((e) => e.includes("no está en el catálogo")));
  const corta = misionValida();
  corta.pasos = corta.pasos.slice(0, 2);
  assert(errores(corta).some((e) => e.includes("de 3 a 5 pasos")));
  assert(errores(misionValida({ titulo: "" })).some((e) => e.includes("falta titulo")));
});

Deno.test("mundos.json: el de comun/gamificacion.js es válido; encimados o con otro nombre o fecha, error", () => {
  assertEquals(validarCatalogo(mundosValidos(), "secundaria"), []);
  const encimado = mundosValidos();
  encimado.mundos.find((w: any) => w.id === "valle-de-los-numeros").hasta = "2026-11-30"; // se cruza con Geometría
  const e = validarCatalogo(encimado, "secundaria");
  assert(e.some((x) => x.includes("se enciman")));
  assert(e.some((x) => x.includes("va del 2026-10-26 al 2026-11-22")));
  const otroNombre = mundosValidos();
  otroNombre.mundos[0].nombre = "Isla Distinta";
  assert(validarCatalogo(otroNombre, "secundaria").some((x) => x.includes("se llama")));
  const falta = { mundos: mundosValidos().mundos.slice(1) };
  assert(validarCatalogo(falta, "secundaria").some((x) => x.includes("falta el mundo")));
  // Laberinto Sintaxis y Núcleo IA corren en paralelo a propósito: no es encimado.
  assertEquals(validarCatalogo(mundosValidos(), "secundaria").filter((x) => x.includes("Núcleo IA")), []);
  assertEquals(G.catalogoDeMundos().length, mundosValidos().mundos.length);
});

Deno.test("validarMisiones por ámbito: lee mundos.json y las misiones; id repetido entre ámbitos es error", async () => {
  const store = storeCon({
    "contenido/secundaria/mundos.json": mundosValidos(),
    "contenido/secundaria/misiones/mis-mate-valle-de-los-numeros.json": misionValida(),
  });
  assertEquals((await validarMisiones(store, "secundaria")).errores, []);
  store.files.set("contenido/ingles/misiones/mis-mate-valle-de-los-numeros.json", { data: misionValida(), sha: "x" });
  assert((await validarMisiones(store, "secundaria")).errores.some((e) => e.includes("se repite en otro ámbito")));
  assert((await validarMisiones(store, "nada")).errores[0].includes("ámbito desconocido"));
  // Secundaria sin mundos.json: error.
  assert((await validarMisiones(storeCon({}), "secundaria")).errores.some((e) => e.includes("mundos.json: no existe")));
});

Deno.test("CLI --misiones: 0 con datos válidos, 1 con errores, 2 con uso inválido", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${dir}/contenido/secundaria/misiones`, { recursive: true });
    await Deno.writeTextFile(`${dir}/contenido/secundaria/mundos.json`, JSON.stringify(mundosValidos()));
    await Deno.writeTextFile(`${dir}/contenido/secundaria/misiones/mis-mate-valle-de-los-numeros.json`, JSON.stringify(misionValida()));
    const correr = async (...args: string[]) => (await new Deno.Command(Deno.execPath(), { args: ["run", "--allow-read", new URL("./validar_semana.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), ...args], stdout: "piped", stderr: "piped" }).output()).code;
    assertEquals(await correr(dir, "--misiones", "secundaria"), 0);
    await Deno.writeTextFile(`${dir}/contenido/secundaria/misiones/mis-mate-valle-de-los-numeros.json`, JSON.stringify(misionValida({ consigna: "sin aviso" })));
    assertEquals(await correr(dir, "--misiones", "secundaria"), 1);
    assertEquals(await correr(dir, "--misiones", "marte"), 2);
    assertEquals(await correr(dir, "2026-10-26", "--misiones", "secundaria"), 2);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
