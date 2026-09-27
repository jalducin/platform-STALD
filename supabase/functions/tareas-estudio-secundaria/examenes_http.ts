// Rutas HTTP de exámenes: /ingles/examenes[/<id>[/resultados/<alumno>]].
// Definiciones: JSON versionado en ./examenes. Resultados: JSON en Supabase Storage (bucket privado).
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type Examen,
  examStatusFor,
  gradeExam,
  isAvailable,
  mxToday,
  publicQuestions,
  sanitizeRespuestas,
  slugAlumno,
} from "./examenes.ts";
import diagnosticoA1 from "./examenes/diagnostico-a1.json" with { type: "json" };

const EXAMENES: Examen[] = [diagnosticoA1 as Examen];
const BUCKET = "examenes";
// Prefijo de archivos de prueba del admin: no se listan como resultados de alumnos.
const PRUEBA_ADMIN = "_prueba-admin";

type Json = (body: unknown, status?: number) => Response;

export interface Identidad {
  isAdmin: boolean;
  alumno: string | null; // Nombre del alumno (de sus filas en Notion); null si no tiene filas
}

// deno-lint-ignore no-explicit-any
let sbClient: any = null;
let bucketListo = false;

function sb() {
  if (!sbClient) {
    sbClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
  }
  return sbClient;
}

async function ensureBucket() {
  if (bucketListo) return;
  const { error } = await sb().storage.getBucket(BUCKET);
  if (error) {
    const { error: e2 } = await sb().storage.createBucket(BUCKET, { public: false });
    if (e2 && !/already exists/i.test(e2.message)) throw new Error(`storage_bucket: ${e2.message}`);
  }
  bucketListo = true;
}

const rutaResultado = (examId: string, slug: string) => `resultados/${examId}/${slug}.json`;

// deno-lint-ignore no-explicit-any
async function leerResultado(examId: string, slug: string): Promise<any | null> {
  const { data, error } = await sb().storage.from(BUCKET).download(rutaResultado(examId, slug));
  if (error || !data) return null;
  return JSON.parse(await data.text());
}

// deno-lint-ignore no-explicit-any
async function listarResultados(examId: string): Promise<any[]> {
  const { data, error } = await sb().storage.from(BUCKET).list(`resultados/${examId}`, { limit: 1000 });
  if (error || !data) return [];
  // deno-lint-ignore no-explicit-any
  const nombres = data.map((f: any) => f.name as string).filter((n: string) => n.endsWith(".json") && !n.startsWith("_"));
  const out = await Promise.all(nombres.map((n: string) => leerResultado(examId, n.replace(/\.json$/, ""))));
  return out.filter(Boolean);
}

// Guarda sin sobrescribir: si ya existe, devuelve false (un solo intento).
async function guardarResultado(examId: string, slug: string, contenido: unknown): Promise<boolean> {
  const body = new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" });
  const { error } = await sb().storage.from(BUCKET).upload(rutaResultado(examId, slug), body, {
    upsert: false,
    contentType: "application/json",
  });
  if (!error) return true;
  if (/exists|duplicate|409/i.test(error.message)) return false;
  throw new Error(`storage_upload: ${error.message}`);
}

async function borrarResultado(examId: string, slug: string): Promise<void> {
  const { error } = await sb().storage.from(BUCKET).remove([rutaResultado(examId, slug)]);
  if (error) throw new Error(`storage_remove: ${error.message}`);
}

function resumenExamen(ex: Examen) {
  return { id: ex.id, titulo: ex.titulo, descripcion: ex.descripcion, nivel: ex.nivel, disponibleDesde: ex.disponibleDesde, total: ex.preguntas.length };
}

export async function handleExamenes(
  req: Request,
  subpath: string, // lo que sigue a "/ingles/examenes", p. ej. "" | "/diagnostico-a1" | "/diagnostico-a1/resultados/marisol"
  quien: Identidad,
  json: Json,
): Promise<Response> {
  if (!quien.isAdmin && !quien.alumno) return json({ error: "sin_acceso" }, 403);
  await ensureBucket();
  const hoy = mxToday();
  const partes = subpath.split("/").filter(Boolean);
  const slug = quien.alumno ? slugAlumno(quien.alumno) : null;

  // GET /ingles/examenes → lista con estado (alumno) o con resultados de todos (admin)
  if (partes.length === 0 && req.method === "GET") {
    const examenes = await Promise.all(EXAMENES.map(async (ex) => {
      if (quien.isAdmin) {
        return { ...resumenExamen(ex), disponible: isAvailable(ex, hoy), resultados: await listarResultados(ex.id) };
      }
      const resultado = await leerResultado(ex.id, slug!);
      return { ...resumenExamen(ex), estado: examStatusFor(ex, hoy, !!resultado), resultado };
    }));
    return json({ isAdmin: quien.isAdmin, hoy, examenes });
  }

  const ex = EXAMENES.find((e) => e.id === partes[0]);
  if (!ex) return json({ error: "examen_no_encontrado" }, 404);

  // DELETE /ingles/examenes/<id>/resultados/<alumno> → reiniciar un intento (solo admin)
  if (req.method === "DELETE" && partes[1] === "resultados" && partes[2]) {
    if (!quien.isAdmin) return json({ error: "solo_admin" }, 403);
    const objetivo = partes[2] === PRUEBA_ADMIN ? PRUEBA_ADMIN : slugAlumno(decodeURIComponent(partes[2]));
    await borrarResultado(ex.id, objetivo);
    return json({ borrado: true });
  }
  if (partes.length !== 1) return json({ error: "not_found" }, 404);

  // GET /ingles/examenes/<id> → preguntas sin respuestas
  if (req.method === "GET") {
    if (!quien.isAdmin) {
      if (!isAvailable(ex, hoy)) return json({ error: "no_disponible", disponibleDesde: ex.disponibleDesde }, 403);
      const previo = await leerResultado(ex.id, slug!);
      if (previo) return json({ error: "ya_resuelto", resultado: previo }, 409);
    }
    return json({ ...publicQuestions(ex), vistaPrevia: quien.isAdmin });
  }

  // POST /ingles/examenes/<id> → calificación inmediata con retroalimentación por tema
  if (req.method === "POST") {
    let body: unknown = null;
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    const respuestas = sanitizeRespuestas(ex, (body as { respuestas?: unknown })?.respuestas);
    const calificacion = gradeExam(ex, respuestas);
    const url = new URL(req.url);

    if (quien.isAdmin) {
      // Vista previa: no se guarda, salvo ?prueba=1 (archivo de prueba, oculto en listados).
      if (url.searchParams.get("prueba") === "1") {
        await borrarResultado(ex.id, PRUEBA_ADMIN).catch(() => {});
        await guardarResultado(ex.id, PRUEBA_ADMIN, { examen: ex.id, alumno: "Prueba admin", enviadoEn: new Date().toISOString(), respuestas, ...calificacion });
        return json({ guardado: true, prueba: true, resultado: calificacion });
      }
      return json({ guardado: false, resultado: calificacion });
    }

    if (!isAvailable(ex, hoy)) return json({ error: "no_disponible", disponibleDesde: ex.disponibleDesde }, 403);
    const registro = { examen: ex.id, titulo: ex.titulo, alumno: quien.alumno, enviadoEn: new Date().toISOString(), respuestas, ...calificacion };
    const ok = await guardarResultado(ex.id, slug!, registro);
    if (!ok) return json({ error: "ya_resuelto", resultado: await leerResultado(ex.id, slug!) }, 409);
    return json({ guardado: true, resultado: registro });
  }

  return json({ error: "metodo_no_permitido" }, 405);
}

export const _test = { PRUEBA_ADMIN, rutaResultado };
