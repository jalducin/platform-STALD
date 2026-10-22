// Práctica con revisión inmediata en los pasos de teoría (openspec: rpg-fase2-misiones, requisito «Retroalimentación
// inmediata y accesible»). Formato: `teoria[i].practica[] = { id, pregunta, opciones?, correcta?, aceptadas?, pista? }`
// (docs/data-model.md). Las respuestas (`correcta`, `aceptadas`) nunca viajan al navegador: la teoría se publica con
// `teoriaPublica` y la página comprueba con `POST /practica/comprobar`, que solo dice si es correcta y da la pista.
// deno-lint-ignore-file no-explicit-any

export interface Practica { id: string; pregunta: string; opciones?: string[]; correcta?: number; aceptadas?: string[]; pista?: string }

const SECRETOS = ["correcta", "aceptadas", "respuesta", "explicacion"];

// Teoría sin las respuestas de su práctica (lo demás, igual).
export function teoriaPublica(teoria: unknown[] | undefined): unknown[] {
  return (teoria || []).map((b: any) => {
    if (!b || typeof b !== "object" || !Array.isArray(b.practica)) return b;
    return { ...b, practica: b.practica.map((p: any) => Object.fromEntries(Object.entries(p || {}).filter(([k]) => !SECRETOS.includes(k)))) };
  });
}

export function buscarPractica(teoria: unknown[] | undefined, id: string): Practica | null {
  for (const b of (teoria || []) as any[]) for (const p of (b?.practica || []) as Practica[]) if (p?.id === id) return p;
  return null;
}

const normal = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.,;:!¡?¿]+/g, " ").replace(/\s+/g, " ").trim();

// ¿Es correcta? Opción múltiple por índice; abierta contra `aceptadas` (sin acentos, mayúsculas ni puntuación).
export function comprobar(p: Practica, respuesta: unknown): { correcta: boolean; pista: string | null } {
  let correcta = false;
  if (Array.isArray(p.opciones) && Number.isInteger(p.correcta)) correcta = Number(respuesta) === p.correcta && String(respuesta).trim() !== "";
  else if (Array.isArray(p.aceptadas)) correcta = p.aceptadas.some((a) => normal(a) === normal(respuesta)) && normal(respuesta) !== "";
  return { correcta, pista: correcta ? null : (p.pista || "Vuelve a leer la teoría con calma.") };
}

// Errores de formato de la práctica de una teoría (los usan el validador de semanas y el de misiones).
export function erroresPractica(teoria: unknown[] | undefined): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  (teoria || []).forEach((b: any, i: number) => {
    if (b?.practica == null) return;
    if (!Array.isArray(b.practica)) { errores.push(`teoria[${i}].practica debe ser una lista`); return; }
    b.practica.forEach((p: any, j: number) => {
      const donde = `teoria[${i}].practica[${j}]`;
      if (!p?.id || typeof p.id !== "string") errores.push(`${donde}: falta id`);
      else if (ids.has(p.id)) errores.push(`${donde}: id repetido`);
      else ids.add(p.id);
      if (!p?.pregunta) errores.push(`${donde}: falta pregunta`);
      const opcion = Array.isArray(p?.opciones) && p.opciones.length >= 2 && Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < p.opciones.length;
      const abierta = !p?.opciones && Array.isArray(p?.aceptadas) && p.aceptadas.length > 0;
      if (!opcion && !abierta) errores.push(`${donde}: necesita opciones con correcta válida, o aceptadas`);
    });
  });
  return errores;
}
