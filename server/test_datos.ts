// Datos inline para pruebas del servidor (no es un archivo de pruebas: no lo recoge `deno test`).
import { MemoryStore } from "./store.ts";

export const tema = (id: string) => ({ id, titulo: id, retroalimentacion: { "fortaleza": "ok", "en-progreso": "casi", "debilidad": "repasa" } });
export const ej = (id: string, t: string) => ({ id, tema: t, tipo: "opcion", enunciado: `¿${id}?`, opciones: ["a", "b"], correcta: 0, explicacion: "porque sí" });
const banco = (pre: string, t: string, n: number) => Array.from({ length: n }, (_, i) => ej(`${pre}-${i}`, t));

// Semana completa y válida: lunes 2026-10-05.
export function semanaValida(): Record<string, unknown> {
  const act = (id: string, fecha: string, t: string) => ({
    id, tipo: "actividad", titulo: id, disponibleDesde: "2026-10-05", fechaLimite: fecha, intentos: 2, preguntasPorIntento: 4,
    temas: [tema(t)], teoria: [{ titulo: "T", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], banco: banco(id, t, 8),
  });
  return {
    "contenido/semanas/2026-10-05.json": { id: "2026-10-05", titulo: "Semana 2", elementos: [
      { id: "act-2026-10-06", tipo: "actividad", fecha: "2026-10-06" },
      { id: "act-2026-10-08", tipo: "actividad", fecha: "2026-10-08" },
      { id: "examen-2026-10-09", tipo: "examen", fecha: "2026-10-09" },
      { id: "refuerzo-2026-10-10", tipo: "refuerzo", fecha: "2026-10-10" },
      { id: "meet-2026-10-11", tipo: "meet", fecha: "2026-10-11" },
    ] },
    "contenido/actividades/act-2026-10-06.json": act("act-2026-10-06", "2026-10-06", "wh"),
    "contenido/actividades/act-2026-10-08.json": act("act-2026-10-08", "2026-10-08", "adj"),
    "contenido/examenes/examen-2026-10-09.json": {
      id: "examen-2026-10-09", tipo: "examen", titulo: "Examen 2", disponibleDesde: "2026-10-09", fechaLimite: "2026-10-09", intentos: 1,
      preguntasPorIntento: 4, temas: [tema("wh"), tema("adj")], banco: [...banco("ex-wh", "wh", 2), ...banco("ex-adj", "adj", 2)],
    },
    "contenido/actividades/refuerzo-2026-10-10.json": {
      id: "refuerzo-2026-10-10", tipo: "refuerzo", titulo: "Refuerzo", disponibleDesde: "2026-10-10", fechaLimite: "2026-10-10", intentos: 2,
      preguntasPorIntento: 4, basadoEn: "examen-2026-10-09", mapeoTemas: { wh: "wh", adj: "adj" }, temas: [tema("wh"), tema("adj")],
      teoria: [{ titulo: "R", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }], bancoDe: ["act-2026-10-06", "act-2026-10-08", "examen-2026-10-09"], banco: [],
    },
    "contenido/actividades/meet-2026-10-11.json": {
      id: "meet-2026-10-11", tipo: "meet", titulo: "Meet", disponibleDesde: "2026-10-11", fechaLimite: "2026-10-11", meetUrl: "https://meet.google.com/abc",
      hora: "11:00", intentos: 2, preguntasPorIntento: 4, temas: [tema("wh")], teoria: [{ titulo: "M", texto: "x" }], tips: [{ tipo: "libreta", texto: "y" }],
      guion: [{ titulo: "1", tiempo: "5 min", pasos: ["a"] }], presentacion: { diapositivas: [{ tipo: "teoria", ref: 0 }] }, banco: banco("meet", "wh", 8),
    },
  };
}

export function storeCon(files: Record<string, unknown>): MemoryStore {
  const s = new MemoryStore();
  let n = 0;
  for (const [k, v] of Object.entries(files)) s.files.set(k, { data: v, sha: `t${n++}` });
  return s;
}
