// Motor de exámenes: lógica pura (sin red) para servir preguntas, calificar y decidir disponibilidad.

export type EstadoTema = "fortaleza" | "en-progreso" | "debilidad";

export interface Seccion {
  id: string;
  titulo: string;
  retroalimentacion: Record<EstadoTema, string>;
}

export interface Pregunta {
  id: string;
  seccion: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
}

export interface Examen {
  id: string;
  titulo: string;
  descripcion?: string;
  nivel: string;
  disponibleDesde: string; // AAAA-MM-DD, hora de CDMX: desde cuándo se puede resolver
  fechaLimite: string; // AAAA-MM-DD, hora de CDMX: después se acepta, pero con fueraDeTiempo
  secciones: Seccion[];
  preguntas: Pregunta[];
}

export interface ResultadoSeccion {
  id: string;
  titulo: string;
  correctas: number;
  total: number;
  porcentaje: number;
  estado: EstadoTema;
  retroalimentacion: string;
}

export interface ErrorRevision {
  id: string;
  seccion: string;
  enunciado: string;
  tuRespuesta: string | null; // null = sin responder
  correcta: string;
  explicacion: string;
}

export interface Calificacion {
  correctas: number;
  total: number;
  porcentaje: number;
  nivelSugerido: string;
  secciones: ResultadoSeccion[];
  fortalezas: string[];
  enProgreso: string[];
  debilidades: string[];
  revision: ErrorRevision[];
}

// Umbrales por tema: ≥ 80 % fortaleza, 60–79 % en progreso, < 60 % debilidad.
export function estadoTema(porcentaje: number): EstadoTema {
  if (porcentaje >= 80) return "fortaleza";
  if (porcentaje >= 60) return "en-progreso";
  return "debilidad";
}

export type Respuestas = Record<string, number>;

// Fecha de hoy en CDMX (AAAA-MM-DD), para que el cambio de día no dependa del navegador.
export function mxToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

export function isAvailable(ex: Examen, today: string): boolean {
  return today >= ex.disponibleDesde;
}

export function isLate(ex: Examen, today: string): boolean {
  return today > ex.fechaLimite;
}

export type EstadoExamen = "proximamente" | "disponible" | "resuelto";

export function examStatusFor(ex: Examen, today: string, resuelto: boolean): EstadoExamen {
  if (resuelto) return "resuelto";
  return isAvailable(ex, today) ? "disponible" : "proximamente";
}

// Preguntas sin la respuesta correcta ni su explicación, para enviarlas al navegador antes de resolver.
export function publicQuestions(ex: Examen) {
  const { preguntas, secciones, ...rest } = ex;
  return {
    ...rest,
    secciones: secciones.map(({ id, titulo }) => ({ id, titulo })),
    total: preguntas.length,
    preguntas: preguntas.map(({ correcta: _c, explicacion: _e, ...p }) => p),
  };
}

function pct(a: number, b: number): number {
  return b ? Math.round((a * 100) / b) : 0;
}

export function nivelSugerido(porcentaje: number): string {
  if (porcentaje >= 80) return "A1 sólido — listo para A2";
  if (porcentaje >= 50) return "A1 en progreso";
  return "Iniciando A1";
}

// Califica en el servidor, de inmediato. Las preguntas sin responder cuentan como incorrectas.
export function gradeExam(ex: Examen, respuestas: Respuestas): Calificacion {
  const porSeccion = new Map<string, { correctas: number; total: number }>();
  ex.secciones.forEach((s) => porSeccion.set(s.id, { correctas: 0, total: 0 }));
  let correctas = 0;
  const revision: ErrorRevision[] = [];
  for (const p of ex.preguntas) {
    const acc = porSeccion.get(p.seccion)!;
    acc.total++;
    const r = respuestas[p.id];
    if (r === p.correcta) {
      acc.correctas++;
      correctas++;
    } else {
      revision.push({
        id: p.id,
        seccion: p.seccion,
        enunciado: p.enunciado,
        tuRespuesta: r === undefined ? null : p.opciones[r],
        correcta: p.opciones[p.correcta],
        explicacion: p.explicacion,
      });
    }
  }
  const secciones: ResultadoSeccion[] = ex.secciones.map((s) => {
    const acc = porSeccion.get(s.id)!;
    const porcentaje = pct(acc.correctas, acc.total);
    const estado = estadoTema(porcentaje);
    return { id: s.id, titulo: s.titulo, correctas: acc.correctas, total: acc.total, porcentaje, estado, retroalimentacion: s.retroalimentacion[estado] };
  });
  const porcentaje = pct(correctas, ex.preguntas.length);
  const titulos = (e: EstadoTema) => secciones.filter((s) => s.estado === e).map((s) => s.titulo);
  return {
    correctas,
    total: ex.preguntas.length,
    porcentaje,
    nivelSugerido: nivelSugerido(porcentaje),
    secciones,
    fortalezas: titulos("fortaleza"),
    enProgreso: titulos("en-progreso"),
    debilidades: titulos("debilidad"),
    revision,
  };
}

// Solo acepta respuestas de preguntas existentes con índices válidos.
export function sanitizeRespuestas(ex: Examen, raw: unknown): Respuestas {
  const out: Respuestas = {};
  if (!raw || typeof raw !== "object") return out;
  for (const p of ex.preguntas) {
    const v = (raw as Record<string, unknown>)[p.id];
    if (Number.isInteger(v) && (v as number) >= 0 && (v as number) < p.opciones.length) out[p.id] = v as number;
  }
  return out;
}

// Nombre de archivo del alumno: minúsculas, sin acentos ni espacios.
export function slugAlumno(nombre: string): string {
  const partes = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .split(/[^a-z0-9]/).filter(Boolean);
  return partes.join("-") || "sin-nombre";
}

// Valida la estructura del JSON del examen (se usa en pruebas y al arrancar).
export function validateExam(ex: Examen): string[] {
  const errors: string[] = [];
  const ids = new Set(ex.secciones.map((s) => s.id));
  for (const s of ex.secciones) {
    for (const e of ["fortaleza", "en-progreso", "debilidad"] as EstadoTema[]) {
      if (!s.retroalimentacion?.[e]) errors.push(`${s.id}: falta retroalimentacion.${e}`);
    }
  }
  const vistos = new Set<string>();
  for (const p of ex.preguntas) {
    if (!p.explicacion) errors.push(`${p.id}: falta explicacion`);
    if (vistos.has(p.id)) errors.push(`id repetido: ${p.id}`);
    vistos.add(p.id);
    if (!ids.has(p.seccion)) errors.push(`${p.id}: sección inexistente ${p.seccion}`);
    if (!(p.correcta >= 0 && p.correcta < p.opciones.length)) errors.push(`${p.id}: índice correcto inválido`);
    if (p.opciones.length < 2) errors.push(`${p.id}: menos de 2 opciones`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.disponibleDesde)) errors.push("disponibleDesde inválida");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.fechaLimite)) errors.push("fechaLimite inválida");
  else if (ex.fechaLimite < ex.disponibleDesde) errors.push("fechaLimite antes de disponibleDesde");
  return errors;
}
