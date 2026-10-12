// Forma de juegos/datos/cultura.json (openspec: cultura-conocimiento): categorías válidas y balanceadas, preguntas con
// `correcta` en rango, opciones sin repetir y dato; y la clave `linea` de 📜 Línea del tiempo, con años enteros sin
// repetir dentro de cada set.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";

const d = JSON.parse(await Deno.readTextFile(new URL("../juegos/datos/cultura.json", import.meta.url)));
const texto = (x: unknown) => typeof x === "string" && x.trim().length > 0;

// Las que pidió el profe y las que ya existían (capitales, banderas, cuerpo humano e IA).
const CATEGORIAS = [
  "historia-mexico", "cultura-mexico", "historia-mundial", "geografia", "capitales", "banderas", "ciencias", "naturaleza",
  "cuerpo-humano", "arte", "matematicas", "tecnologia", "ia", "deportes",
];
const ANTES = 384; // preguntas antes de este cambio: al menos se duplican
const MIN_POR_CATEGORIA = 50;
const MIN_POR_NIVEL = 10;
const TEMAS_LINEA = ["historia-mexico", "historia-universal", "inventos", "ciencia"];

Deno.test("cultura.json: categorías esperadas, sin repetir y con título y emoji", () => {
  const ids = d.categorias.map((c: any) => c.id);
  assertEquals([...ids].sort(), [...CATEGORIAS].sort());
  assertEquals(new Set(ids).size, ids.length);
  for (const c of d.categorias) assert(texto(c.titulo) && texto(c.emoji), c.id);
});

Deno.test("cultura.json: cada pregunta con forma válida, opciones sin repetir y dato", () => {
  const vistas = new Set<string>();
  for (const p of d.preguntas) {
    const id = String(p.pregunta).slice(0, 70);
    assert(CATEGORIAS.includes(p.cat), `categoría inválida «${p.cat}» en ${id}`);
    assert([1, 2, 3].includes(p.nivel), `nivel en ${id}`);
    assert(texto(p.pregunta), "pregunta vacía");
    assert(Array.isArray(p.opciones) && p.opciones.length === 4 && p.opciones.every(texto), `4 opciones en ${id}`);
    assertEquals(new Set(p.opciones.map((o: string) => o.trim().toLowerCase())).size, 4, `opciones repetidas en ${id}`);
    assert(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, `correcta fuera de rango en ${id}`);
    assert(texto(p.dato) && p.dato.length <= 160, `dato vacío o largo en ${id}`);
    assert(!vistas.has(p.pregunta), `pregunta repetida: ${id}`);
    vistas.add(p.pregunta);
  }
});

Deno.test("cultura.json: al menos el doble de preguntas, balanceadas por categoría y nivel", () => {
  assert(d.preguntas.length >= ANTES * 2, `${d.preguntas.length} preguntas`);
  for (const cat of CATEGORIAS) {
    const de = d.preguntas.filter((p: any) => p.cat === cat);
    assert(de.length >= MIN_POR_CATEGORIA, `${cat}: ${de.length} preguntas`);
    for (const n of [1, 2, 3]) {
      const k = de.filter((p: any) => p.nivel === n).length;
      assert(k >= MIN_POR_NIVEL, `${cat} nivel ${n}: ${k}`);
    }
  }
});

Deno.test("cultura.json: la respuesta correcta no siempre está en la misma posición", () => {
  const pos = [0, 1, 2, 3].map((k) => d.preguntas.filter((p: any) => p.correcta === k).length);
  for (const n of pos) assert(n >= d.preguntas.length * 0.15, `posiciones ${pos}`);
});

Deno.test("cultura.json: linea con temas válidos y sets de 6 a 8 sucesos", () => {
  assertEquals(d.linea.temas.map((t: any) => t.id), TEMAS_LINEA);
  for (const t of d.linea.temas) assert(texto(t.titulo) && texto(t.emoji), t.id);
  for (const tema of TEMAS_LINEA) assert(d.linea.sets.filter((s: any) => s.tema === tema).length >= 5, `${tema}: al menos 5 sets`);
  for (const s of d.linea.sets) {
    assert(TEMAS_LINEA.includes(s.tema), `tema inválido «${s.tema}»`);
    assert(texto(s.titulo), "set sin título");
    assert(Array.isArray(s.sucesos) && s.sucesos.length >= 6 && s.sucesos.length <= 8, `${s.titulo}: ${s.sucesos?.length} sucesos`);
  }
});

Deno.test("cultura.json: cada suceso con año entero, texto y dato, sin años repetidos en su set", () => {
  for (const s of d.linea.sets) {
    for (const x of s.sucesos) {
      assert(Number.isInteger(x.anio) && x.anio >= -3000 && x.anio <= 2026, `${s.titulo}: año ${x.anio}`);
      assert(texto(x.txt) && x.txt.length <= 80, `${s.titulo}: texto «${x.txt}»`);
      assert(texto(x.dato) && x.dato.length <= 140, `${s.titulo}: dato de «${x.txt}»`);
    }
    const anios = s.sucesos.map((x: any) => x.anio);
    assertEquals(new Set(anios).size, anios.length, `${s.titulo}: años repetidos ${anios}`);
  }
});
