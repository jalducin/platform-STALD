// Validación de `teoria[].diagrama` (openspec: teoria-diagramas). Formato en docs/data-model.md.
// Devuelve una lista de errores en español (vacía si el diagrama es válido). Los campos de otro tipo
// (p. ej. `centro` en un flujo) se ignoran: el render no los usa.

export const TIPOS_DIAGRAMA = ["flujo", "ciclo", "capas", "ramas", "comparar"] as const;
const MIN_PASOS = 2, MAX_PASOS = 8;
// Largos máximos (caracteres): lo suficiente para una frase corta; más ya no cabe en una caja a 360 px.
const MAX = { titulo: 120, texto: 90, detalle: 280, centro: 80, columna: 60, nota: 300 };
const MAX_ICONO = 2; // grafemas: un emoji (aunque sea compuesto) o dos

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const lleno = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
const grafemas = (s: string) => [...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(s)].length;

// Campo de texto opcional: si viene, debe ser string y no pasar del máximo.
function opcional(errores: string[], campo: string, valor: unknown, max: number) {
  if (valor === undefined) return;
  if (typeof valor !== "string") errores.push(`${campo} debe ser texto`);
  else if (valor.length > max) errores.push(`${campo} es muy largo (${valor.length} de máximo ${max} caracteres)`);
}

function revisarPasos(errores: string[], nombre: string, lista: unknown) {
  if (!Array.isArray(lista) || lista.length < MIN_PASOS || lista.length > MAX_PASOS) {
    errores.push(`${nombre} debe tener entre ${MIN_PASOS} y ${MAX_PASOS} elementos (tiene ${Array.isArray(lista) ? lista.length : 0})`);
    return;
  }
  lista.forEach((p, i) => {
    const campo = `${nombre}[${i}]`;
    if (!esObjeto(p) || !lleno(p.texto)) { errores.push(`${campo}: falta texto`); return; }
    opcional(errores, `${campo}.texto`, p.texto, MAX.texto);
    opcional(errores, `${campo}.detalle`, p.detalle, MAX.detalle);
    if (p.icono !== undefined) {
      if (typeof p.icono !== "string" || !p.icono.trim() || grafemas(p.icono) > MAX_ICONO || p.icono.length > 16) {
        errores.push(`${campo}.icono debe ser un emoji corto (máximo ${MAX_ICONO})`);
      }
    }
  });
}

export function validarDiagrama(d: unknown): string[] {
  const errores: string[] = [];
  if (!esObjeto(d)) return ["debe ser un objeto { tipo, pasos, … }"];
  const tipo = d.tipo as string;
  if (!(TIPOS_DIAGRAMA as readonly string[]).includes(tipo)) {
    errores.push(`tipo «${String(d.tipo)}» no válido; usa uno de: ${TIPOS_DIAGRAMA.join(", ")}`);
  }
  opcional(errores, "titulo", d.titulo, MAX.titulo);
  opcional(errores, "nota", d.nota, MAX.nota);
  revisarPasos(errores, "pasos", d.pasos);
  if (tipo === "ramas") {
    if (!lleno(d.centro)) errores.push("ramas necesita «centro» (el nodo del que salen los pasos)");
    else opcional(errores, "centro", d.centro, MAX.centro);
  }
  if (tipo === "comparar") {
    if (d.derecha === undefined) errores.push("comparar necesita «derecha» (la columna derecha; «pasos» es la izquierda)");
    else revisarPasos(errores, "derecha", d.derecha);
    if (d.columnas !== undefined) {
      const c = d.columnas;
      if (!Array.isArray(c) || c.length !== 2 || !c.every(lleno)) errores.push("columnas debe ser [izquierda, derecha] con 2 textos");
      else c.forEach((x, i) => opcional(errores, `columnas[${i}]`, x, MAX.columna));
    }
  }
  return errores;
}

// Revisa los diagramas de todos los bloques de una teoría; cada error lleva el bloque.
export function erroresDiagramas(teoria: unknown[] | undefined): string[] {
  const errores: string[] = [];
  (teoria || []).forEach((b, i) => {
    if (!esObjeto(b) || b.diagrama === undefined) return;
    const titulo = typeof b.titulo === "string" ? ` «${b.titulo}»` : "";
    for (const e of validarDiagrama(b.diagrama)) errores.push(`teoria[${i}]${titulo} diagrama: ${e}`);
  });
  return errores;
}
