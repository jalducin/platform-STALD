// Catálogo público del material de estudio de Inglés (openspec: ingles-material-estudio).
// ingles/material/indice.json lista cada guía en PDF; la sección «📚 Material de estudio» de ingles.html lo lee.
// Se valida: campos, URL de Pages, PDF existente con las páginas declaradas, todo PDF catalogado y sin datos personales.
import { assert, assertEquals } from "jsr:@std/assert@1";

const CARPETA = new URL("../ingles/material/", import.meta.url);
const PAGES = "https://jalducin.github.io/platform-STALD/ingles/material/";
const texto = Deno.readTextFileSync(new URL("indice.json", CARPETA));
const indice = JSON.parse(texto) as Record<string, unknown>[];

// Páginas de un PDF: objetos /Type /Page (no /Pages, que son los nodos del árbol).
export function paginasPdf(bytes: Uint8Array): number {
  return (new TextDecoder("latin1").decode(bytes).match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

Deno.test("material: el índice es un arreglo con la guía de los tres tiempos + to be", () => {
  assert(Array.isArray(indice) && indice.length >= 1);
  assert(indice.some((g) => g.id === "guia-tres-tiempos-y-to-be"));
});

Deno.test("material: cada guía trae sus campos con el tipo correcto", () => {
  const ids = new Set<string>();
  for (const g of indice) {
    const id = String(g.id);
    assertEquals(Object.keys(g).sort(), ["descripcion", "fecha", "id", "mes", "nivel", "paginas", "temas", "titulo", "url"], id);
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id), `id en kebab-case: ${id}`);
    assert(!ids.has(id), `id repetido: ${id}`);
    ids.add(id);
    for (const k of ["titulo", "descripcion", "nivel"]) assert(typeof g[k] === "string" && (g[k] as string).trim().length > 0, `${id}.${k}`);
    assert(Array.isArray(g.temas) && g.temas.length > 0 && g.temas.every((t) => typeof t === "string" && t.trim()), `${id}.temas`);
    assert(Number.isInteger(g.paginas) && (g.paginas as number) > 0, `${id}.paginas`);
    assert(Number.isInteger(g.mes) && (g.mes as number) >= 1, `${id}.mes (1, 2, …: mes del curso)`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(String(g.fecha)) && !Number.isNaN(Date.parse(String(g.fecha))), `${id}.fecha`);
    assertEquals(g.url, `${PAGES}${id}.pdf`, `${id}.url debe ser la dirección de Pages de su PDF`);
  }
});

Deno.test("material: cada URL apunta a un PDF publicado con las páginas declaradas", () => {
  for (const g of indice) {
    const bytes = Deno.readFileSync(new URL(`${g.id}.pdf`, CARPETA));
    assertEquals(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-", `${g.id}.pdf no es un PDF`);
    assertEquals(paginasPdf(bytes), g.paginas, `${g.id}: páginas reales vs. declaradas`);
  }
});

Deno.test("material: todo PDF de ingles/material/ está en el índice", () => {
  const pdfs = [...Deno.readDirSync(CARPETA)].filter((e) => e.isFile && e.name.endsWith(".pdf")).map((e) => e.name.slice(0, -4)).sort();
  assertEquals(pdfs, indice.map((g) => String(g.id)).sort());
});

Deno.test("material: el índice no tiene datos personales (correos ni teléfonos)", () => {
  assert(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(texto), "contiene un correo");
  assert(!/\b\d{10}\b|\+\d{2}\s?\d/.test(texto), "contiene un teléfono");
});
