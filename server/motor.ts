// Motor de actividades y exámenes: lógica pura (sin red).
// Selección determinista por alumno e intento, calificación inmediata con retroalimentación por tema.

export type EstadoTema = "fortaleza" | "en-progreso" | "debilidad";
export type TipoItem = "actividad" | "refuerzo" | "examen" | "meet";

export interface Tema {
  id: string;
  titulo: string;
  retroalimentacion: Record<EstadoTema, string>;
}

export interface Ejercicio {
  id: string;
  tema: string;
  tipo: "opcion" | "escribir" | "pronunciar";
  enunciado: string;
  opciones?: string[];
  correcta?: number; // opcion
  aceptadas?: string[]; // escribir
  frase?: string; // pronunciar: lo que se dice en voz alta (público)
  audio?: string; // cualquier tipo: texto que la página lee en voz alta (público)
  explicacion: string;
}

export interface Nivel {
  min: number;
  texto: string;
}

export interface Item {
  id: string;
  tipo: TipoItem;
  titulo: string;
  nivel?: string;
  descripcion?: string;
  disponibleDesde: string; // AAAA-MM-DD, hora de CDMX
  fechaLimite: string; // AAAA-MM-DD, hora de CDMX
  intentos?: number; // actividad/refuerzo: 2; examen: 1
  preguntasPorIntento?: number; // si falta: todas, en orden
  temas?: Tema[];
  teoria?: unknown[];
  tips?: unknown[];
  banco?: Ejercicio[];
  bancoDe?: string[];
  basadoEn?: string;
  respaldo?: string;
  mapeoTemas?: Record<string, string>;
  niveles?: Nivel[];
  meetUrl?: string | null;
  hora?: string | null;
  guion?: unknown[]; // solo admin (clase del domingo)
  presentacion?: unknown; // solo admin: diapositivas para proyectar en el Meet
  prorrogas?: Record<string, string>; // slug del alumno → fecha límite propia (AAAA-MM-DD)
  alumnos?: string[]; // slugs: solo esas personas lo ven y lo abren (openspec: examen-secundaria)
  segundaOportunidad?: string; // examen con 2 intentos: el 2.º abre esta fecha (openspec: examen-segunda-oportunidad)
}

// El elemento como lo ve un alumno o alumna: con su prórroga, si tiene (no adelanta la apertura).
// Elemento exclusivo (openspec: examen-secundaria): sin `alumnos` es para todo el ámbito.
export const esPara = (it: Item, slug: string) => !it.alumnos?.length || it.alumnos.includes(slug);

export function paraAlumno(it: Item, slug: string): Item {
  const f = it.prorrogas?.[slug];
  return f ? { ...it, fechaLimite: f } : it;
}

// Un Meet con banco trae reto en vivo y se califica como una actividad.
export function tieneReto(it: Item): boolean {
  return it.tipo !== "meet" || (it.banco || []).length > 0;
}

export interface ResultadoTema {
  id: string;
  titulo: string;
  correctas: number;
  total: number;
  porcentaje: number;
  estado: EstadoTema;
  retroalimentacion: string;
}

export interface Calificacion {
  correctas: number;
  total: number;
  porcentaje: number;
  nivelSugerido: string;
  secciones: ResultadoTema[];
  fortalezas: string[];
  enProgreso: string[];
  debilidades: string[];
  revision: { id: string; tema: string; enunciado: string; tuRespuesta: string | null; correcta: string; explicacion: string }[];
}

export interface Intento {
  n: number;
  enviadoEn: string;
  fueraDeTiempo?: boolean;
  preguntas: string[] | null;
  respuestas: Record<string, unknown>;
  calificacion: Calificacion;
}

export interface Resultado {
  id: string;
  titulo: string;
  alumno: string;
  intentos: Intento[];
  mejor: (Calificacion & { n: number }) | null;
  migradoDe?: string;
}

const NIVELES_DEFAULT: Nivel[] = [
  { min: 80, texto: "¡Excelente! Dominas el tema" },
  { min: 60, texto: "Bien, sigue practicando" },
  { min: 0, texto: "Necesitas repasar" },
];

// ---------- Fechas ----------
export function mxToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

export function maxIntentos(it: Item): number {
  return it.intentos ?? (it.tipo === "examen" ? 1 : 2);
}

// ---------- Normalización del formato del diagnóstico (secciones/preguntas) ----------
// deno-lint-ignore no-explicit-any
export function normalizeItem(raw: any): Item {
  if (raw && Array.isArray(raw.preguntas) && Array.isArray(raw.secciones)) {
    return {
      id: raw.id,
      tipo: "examen",
      titulo: raw.titulo,
      nivel: raw.nivel,
      descripcion: raw.descripcion,
      disponibleDesde: raw.disponibleDesde,
      fechaLimite: raw.fechaLimite ?? raw.disponibleDesde,
      prorrogas: raw.prorrogas,
      intentos: 1,
      temas: raw.secciones,
      niveles: raw.niveles,
      tips: raw.tips,
      // deno-lint-ignore no-explicit-any
      banco: raw.preguntas.map((p: any) => ({ ...p, tema: p.seccion, tipo: "opcion" })),
    };
  }
  return raw as Item;
}

// ---------- PRNG determinista ----------
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Selección por alumno e intento: reparte entre temas (round-robin) y baraja el orden.
// Sin preguntasPorIntento (diagnóstico) devuelve todo el banco en su orden original.
export function selectQuestions(banco: Ejercicio[], it: Item, slug: string, intento: number, temas?: string[]): Ejercicio[] {
  const permitidos = temas && temas.length ? new Set(temas) : null;
  const pool = banco.filter((e) => !permitidos || permitidos.has(e.tema));
  if (!it.preguntasPorIntento) return pool;
  const rnd = mulberry32(hashSeed(`${it.id}|${slug}|${intento}`));
  const porTema = new Map<string, Ejercicio[]>();
  for (const e of shuffle(pool, rnd)) {
    if (!porTema.has(e.tema)) porTema.set(e.tema, []);
    porTema.get(e.tema)!.push(e);
  }
  const colas = shuffle([...porTema.values()], rnd);
  const out: Ejercicio[] = [];
  const n = Math.min(it.preguntasPorIntento, pool.length);
  while (out.length < n) {
    for (const c of colas) {
      if (out.length >= n) break;
      const e = c.shift();
      if (e) out.push(e);
    }
  }
  return shuffle(out, rnd);
}

// Temas para el refuerzo: débiles o en progreso del examen base; si no hay, del respaldo (mapeados).
export function temasRefuerzo(it: Item, base: Resultado | null, respaldo: Resultado | null): string[] {
  const deResultado = (r: Resultado | null, mapeo?: Record<string, string>) =>
    (r?.mejor?.secciones || [])
      .filter((s) => s.estado !== "fortaleza")
      .map((s) => (mapeo ? mapeo[s.id] : s.id))
      .filter((t): t is string => !!t);
  const validos = new Set((it.temas || []).map((t) => t.id));
  let temas = deResultado(base).filter((t) => validos.has(t));
  if (!temas.length) temas = deResultado(respaldo, it.mapeoTemas).filter((t) => validos.has(t));
  return [...new Set(temas)];
}

// ---------- Vista pública (sin respuestas) ----------
export function publicQuestion(e: Ejercicio) {
  const { correcta: _c, aceptadas: _a, explicacion: _e, ...rest } = e;
  return rest;
}

// ---------- Calificación ----------
export function normalizeText(s: unknown): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/).join(" ");
}

export function estadoTema(p: number): EstadoTema {
  if (p >= 80) return "fortaleza";
  if (p >= 60) return "en-progreso";
  return "debilidad";
}

function pct(a: number, b: number): number {
  return b ? Math.round((a * 100) / b) : 0;
}

export function nivelTexto(it: Item, porcentaje: number): string {
  const niveles = (it.niveles && it.niveles.length ? it.niveles : NIVELES_DEFAULT).slice().sort((a, b) => b.min - a.min);
  return (niveles.find((n) => porcentaje >= n.min) || niveles[niveles.length - 1]).texto;
}

// ---------- Pronunciación (openspec: pronunciacion) ----------
const CONTRACCIONES: [RegExp, string][] = [
  [/\bcan't\b/g, "can not"], [/\bcannot\b/g, "can not"], [/\bwon't\b/g, "will not"], [/\blet's\b/g, "let us"],
  [/\b(it|that|there|he|she|what|where|who)'s\b/g, "$1 is"],
  [/n't\b/g, " not"], [/'ve\b/g, " have"], [/'ll\b/g, " will"], [/'re\b/g, " are"], [/'m\b/g, " am"], [/'d\b/g, " would"],
];
function palabras(s: string): string[] {
  let t = normalizeText(s).replace(/[’‘`]/g, "'");
  for (const [re, por] of CONTRACCIONES) t = t.replace(re, por);
  return t.replace(/[^a-z0-9' ]+/g, " ").replace(/'/g, "").split(/\s+/).filter(Boolean);
}
// Proporción de palabras de la frase que aparecen en orden en lo reconocido (LCS / palabras de la frase).
export function similitudPronunciacion(frase: string, oido: string): number {
  const a = palabras(frase), b = palabras(oido);
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / a.length;
}
export const UMBRAL_PRONUNCIACION = 0.8;

function esCorrecta(e: Ejercicio, r: unknown): boolean {
  if (e.tipo === "pronunciar") {
    if (r === "auto:ok") return true;
    if (typeof r !== "string" || r.startsWith("auto:")) return false;
    return similitudPronunciacion(e.frase || "", r) >= UMBRAL_PRONUNCIACION;
  }
  if (e.tipo === "escribir") {
    const v = normalizeText(r);
    return v !== "" && (e.aceptadas || []).some((a) => normalizeText(a) === v);
  }
  return r === e.correcta;
}

function textoRespuesta(e: Ejercicio, r: unknown): string | null {
  if (r === undefined || r === null || r === "") return null;
  if (e.tipo === "pronunciar") return r === "auto:ok" ? "Autoevaluación: me salió bien" : r === "auto:repetir" ? "Autoevaluación: necesito repetir" : String(r);
  if (e.tipo === "escribir") return String(r);
  return typeof r === "number" && e.opciones ? e.opciones[r] ?? null : null;
}

function textoCorrecta(e: Ejercicio): string {
  if (e.tipo === "pronunciar") return e.frase || "";
  return e.tipo === "escribir" ? (e.aceptadas || [""])[0] : (e.opciones || [])[e.correcta ?? 0];
}

// Solo conserva respuestas de las preguntas del intento, con el tipo esperado.
export function sanitizeRespuestas(preguntas: Ejercicio[], raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const e of preguntas) {
    const v = (raw as Record<string, unknown>)[e.id];
    if (e.tipo === "escribir" && typeof v === "string" && v.trim()) out[e.id] = v.slice(0, 200);
    if (e.tipo === "pronunciar" && typeof v === "string" && v.trim()) out[e.id] = v.trim().slice(0, 300);
    if (e.tipo === "opcion" && Number.isInteger(v) && (v as number) >= 0 && (v as number) < (e.opciones || []).length) out[e.id] = v;
  }
  return out;
}

export function grade(it: Item, preguntas: Ejercicio[], respuestas: Record<string, unknown>): Calificacion {
  const temas = it.temas || [];
  const acc = new Map<string, { c: number; t: number }>();
  let correctas = 0;
  const revision: Calificacion["revision"] = [];
  for (const e of preguntas) {
    const a = acc.get(e.tema) || { c: 0, t: 0 };
    a.t++;
    if (esCorrecta(e, respuestas[e.id])) {
      a.c++;
      correctas++;
    } else {
      revision.push({ id: e.id, tema: e.tema, enunciado: e.enunciado, tuRespuesta: textoRespuesta(e, respuestas[e.id]), correcta: textoCorrecta(e), explicacion: e.explicacion });
    }
    acc.set(e.tema, a);
  }
  const secciones: ResultadoTema[] = temas.filter((t) => acc.has(t.id)).map((t) => {
    const a = acc.get(t.id)!;
    const porcentaje = pct(a.c, a.t);
    const estado = estadoTema(porcentaje);
    return { id: t.id, titulo: t.titulo, correctas: a.c, total: a.t, porcentaje, estado, retroalimentacion: t.retroalimentacion?.[estado] || "" };
  });
  const porcentaje = pct(correctas, preguntas.length);
  const titulos = (e: EstadoTema) => secciones.filter((s) => s.estado === e).map((s) => s.titulo);
  return {
    correctas,
    total: preguntas.length,
    porcentaje,
    nivelSugerido: nivelTexto(it, porcentaje),
    secciones,
    fortalezas: titulos("fortaleza"),
    enProgreso: titulos("en-progreso"),
    debilidades: titulos("debilidad"),
    revision,
  };
}

// Agrega un intento y recalcula el mejor (mayor porcentaje; en empate, el más reciente).
export function addIntento(prev: Resultado | null, it: Item, alumno: string, intento: Intento): Resultado {
  const r: Resultado = prev ? { ...prev, intentos: [...prev.intentos] } : { id: it.id, titulo: it.titulo, alumno, intentos: [], mejor: null };
  r.intentos.push(intento);
  const mejor = r.intentos.reduce((m, x) => (!m || x.calificacion.porcentaje >= m.calificacion.porcentaje ? x : m), null as Intento | null)!;
  r.mejor = { n: mejor.n, ...mejor.calificacion };
  return r;
}

// Intento de corrección (actividad, refuerzo, reto): mismos ejercicios del intento previo; las correctas
// quedan fijas y de las falladas solo se devuelve lo que contestó el alumno o alumna (texto).
export interface Correccion {
  preguntas: Ejercicio[];
  fijas: Record<string, unknown>;
  anteriores: Record<string, string>;
}

export function correccionDe(it: Item, previo: Intento | undefined): Correccion | null {
  if (it.tipo === "examen" || !previo) return null;
  const porId = new Map((it.banco || []).map((e) => [e.id, e]));
  const preguntas = (previo.preguntas || []).map((id) => porId.get(id)).filter((e): e is Ejercicio => !!e);
  if (!preguntas.length) return null;
  const fijas: Record<string, unknown> = {}, anteriores: Record<string, string> = {};
  for (const e of preguntas) {
    const r = previo.respuestas[e.id];
    if (esCorrecta(e, r)) fijas[e.id] = r;
    else anteriores[e.id] = textoRespuesta(e, r) ?? "Sin responder";
  }
  return { preguntas, fijas, anteriores };
}

export type EstadoItem = "proximamente" | "disponible" | "en-curso" | "en-espera" | "completo";

export function estadoItem(it: Item, hoy: string, r: Resultado | null): EstadoItem {
  if (!tieneReto(it)) return hoy >= it.disponibleDesde ? "disponible" : "proximamente";
  const usados = r?.intentos.length || 0;
  if (usados >= maxIntentos(it)) return "completo";
  // Examen con 2.ª oportunidad: tras el 1.er intento espera hasta su fecha (el domingo).
  if (it.tipo === "examen" && it.segundaOportunidad && usados === 1 && hoy < it.segundaOportunidad) return "en-espera";
  // Sin nada que corregir: una actividad con 100 % queda completa.
  if (it.tipo !== "examen" && r?.intentos.at(-1)?.calificacion.porcentaje === 100) return "completo";
  if (hoy < it.disponibleDesde) return "proximamente";
  return usados > 0 ? "en-curso" : "disponible";
}

// Temas a reforzar de un alumno, acumulados de todos sus resultados (se queda el peor estado por tema).
export function temasAReforzar(resultados: Resultado[]): { titulo: string; estado: EstadoTema; fuente: string }[] {
  const peso = { debilidad: 2, "en-progreso": 1, fortaleza: 0 };
  const m = new Map<string, { titulo: string; estado: EstadoTema; fuente: string }>();
  for (const r of resultados) {
    for (const s of r.mejor?.secciones || []) {
      if (s.estado === "fortaleza") continue;
      const prev = m.get(s.titulo);
      if (!prev || peso[s.estado] > peso[prev.estado]) m.set(s.titulo, { titulo: s.titulo, estado: s.estado, fuente: r.titulo });
    }
  }
  return [...m.values()].sort((a, b) => peso[b.estado] - peso[a.estado]);
}

export function slugAlumno(nombre: string): string {
  const partes = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]/).filter(Boolean);
  return partes.join("-") || "sin-nombre";
}

// Validación del contenido (pruebas y carga).
// El 2.º intento de un examen con segunda oportunidad vence en su propia fecha.
export function fueraDeTiempoDe(it: Item, n: number, hoy: string): boolean {
  return hoy > (n === 2 && it.segundaOportunidad ? it.segundaOportunidad : it.fechaLimite);
}

export function validateItem(it: Item): string[] {
  const errs: string[] = [];
  if (it.segundaOportunidad !== undefined) {
    const f = it.segundaOportunidad;
    if (it.tipo !== "examen" || maxIntentos(it) !== 2) errs.push(`${it.id}: segundaOportunidad solo en exámenes con intentos 2`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f || "") || f <= it.fechaLimite) errs.push(`${it.id}: segundaOportunidad ${f} debe ser una fecha posterior a ${it.fechaLimite}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(it.disponibleDesde || "")) errs.push(`${it.id}: disponibleDesde inválida`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(it.fechaLimite || "")) errs.push(`${it.id}: fechaLimite inválida`);
  for (const [slug, f] of Object.entries(it.prorrogas || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || f < it.disponibleDesde) errs.push(`${it.id}: prorrogas.${slug} inválida (${f})`);
  }
  if (!tieneReto(it)) return errs;
  const temas = new Set((it.temas || []).map((t) => t.id));
  for (const t of it.temas || []) {
    for (const e of ["fortaleza", "en-progreso", "debilidad"] as EstadoTema[]) if (!t.retroalimentacion?.[e]) errs.push(`${it.id}/${t.id}: falta retroalimentacion.${e}`);
  }
  const ids = new Set<string>();
  for (const e of it.banco || []) {
    if (ids.has(e.id)) errs.push(`${it.id}: id repetido ${e.id}`);
    ids.add(e.id);
    if (!temas.has(e.tema)) errs.push(`${it.id}/${e.id}: tema inexistente ${e.tema}`);
    if (!e.explicacion) errs.push(`${it.id}/${e.id}: falta explicacion`);
    if (e.tipo === "opcion" && !((e.correcta ?? -1) >= 0 && (e.correcta ?? -1) < (e.opciones || []).length)) errs.push(`${it.id}/${e.id}: correcta inválida`);
    if (e.tipo === "escribir" && !(e.aceptadas || []).length) errs.push(`${it.id}/${e.id}: sin aceptadas`);
    if (e.tipo === "pronunciar" && !(e.frase || "").trim()) errs.push(`${it.id}/${e.id}: pronunciar sin frase`);
    if (e.audio !== undefined && !String(e.audio).trim()) errs.push(`${it.id}/${e.id}: audio vacío`);
  }
  if (it.tipo !== "refuerzo" && it.preguntasPorIntento && (it.banco || []).length < it.preguntasPorIntento) errs.push(`${it.id}: banco menor que preguntasPorIntento`);
  return errs;
}

// Racha (openspec: ingles-pro): días seguidos con al menos una entrega, contando hacia atrás desde hoy o, si hoy aún
// no entrega, desde ayer (la racha sigue viva hasta que termina el día). Fechas AAAA-MM-DD en hora de CDMX.
export function calcularRacha(fechas: Iterable<string>, hoy: string): { dias: number; hoy: boolean } {
  const dias = new Set(fechas);
  const antes = (f: string) => {
    const d = new Date(`${f}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const conHoy = dias.has(hoy);
  let f = conHoy ? hoy : antes(hoy);
  let n = 0;
  while (dias.has(f)) { n++; f = antes(f); }
  return { dias: n, hoy: conHoy };
}
