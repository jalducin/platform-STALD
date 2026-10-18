// Material de estudio de Inglés en PDF (openspec: material-pdf-ingles).
// Cada fuente herramientas/material-ingles/<nombre>.html tiene su PDF publicado en ingles/material/<nombre>.pdf, y la
// fuente no depende de internet (sin hojas, fuentes, scripts ni imágenes externas; solo enlaces <a> para leer más).
import { assert, assertEquals } from "jsr:@std/assert@1";

const FUENTES = new URL("../herramientas/material-ingles/", import.meta.url);
const PUBLICADOS = new URL("../ingles/material/", import.meta.url);
const nombres = [...Deno.readDirSync(FUENTES)].filter((e) => e.isFile && e.name.endsWith(".html")).map((e) => e.name.slice(0, -5)).sort();

Deno.test("material: hay al menos una guía y cada fuente HTML tiene su PDF publicado", () => {
  assert(nombres.includes("guia-tres-tiempos-y-to-be"));
  for (const n of nombres) {
    const pdf = Deno.readFileSync(new URL(`${n}.pdf`, PUBLICADOS));
    assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-", `${n}.pdf no es un PDF`);
    assert(pdf.length < 15 * 1024 * 1024, `${n}.pdf pesa demasiado para descargarse en el celular`);
  }
});

Deno.test("material: la fuente HTML no carga nada de internet y no trae correos", () => {
  for (const n of nombres) {
    const html = Deno.readTextFileSync(new URL(`${n}.html`, FUENTES));
    const externos = [...html.matchAll(/<(link|script|img|iframe|source)\b[^>]*\b(href|src)="(https?:)?\/\//gi)].map((m) => m[0]);
    assertEquals(externos, [], `${n}.html carga recursos externos`);
    assert(!/@import\s+url\(\s*["']?https?:/i.test(html), `${n}.html importa CSS externo`);
    assert(!/url\(\s*["']?https?:/i.test(html), `${n}.html usa url() externa`);
    assert(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(html), `${n}.html contiene un correo`);
  }
});

// Versión compacta (petición del profe): la guía se copia en la libreta, así que debe medir exactamente 14 páginas
// carta, con 40–45 ejercicios (una respuesta por ejercicio en la última página) y recuadros «🤖 Practica con IA».
Deno.test("material: la guía compacta tiene 14 páginas, 40–45 ejercicios y práctica con IA", () => {
  const pdf = new TextDecoder("latin1").decode(Deno.readFileSync(new URL("guia-tres-tiempos-y-to-be.pdf", PUBLICADOS)));
  // El nodo raíz de /Pages es el que cuenta todas las páginas: el /Count más grande del archivo.
  const paginas = Math.max(...[...pdf.matchAll(/\/Count (\d+)/g)].map((m) => Number(m[1])));
  assertEquals(paginas, 14, "la guía debe tener 14 páginas");
  const html = Deno.readTextFileSync(new URL("guia-tres-tiempos-y-to-be.html", FUENTES));
  const respuestas = html.slice(html.indexOf('<div class="resp">'));
  const ejercicios = (respuestas.match(/<li>/g) ?? []).length;
  assert(ejercicios >= 40 && ejercicios <= 45, `la guía trae ${ejercicios} ejercicios; se esperan 40–45`);
  assert((html.match(/class="ia"/g) ?? []).length >= 4, "faltan recuadros «🤖 Practica con IA»");
  assert(html.includes("sin hacer trampa"), "falta la sección para estudiar con IA sin hacer trampa");
});
