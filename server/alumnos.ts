// Alta de alumnos y alumnas de Inglés desde la página (openspec: alta-alumnos).
// Registro en el repo privado: alumnos.json → { "<correo>": { nombre, alta } }. Se suma a la identidad que
// viene de Notion (campo "Nombre" + persona): sin cuenta de Notion, el correo queda ligado a ese nombre.
import { slugAlumno } from "./motor.ts";
import type { InglesRow } from "./rows.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export interface AlumnoRegistrado {
  nombre: string;
  alta: string;
  inicio?: string; // lunes en que empieza (AAAA-MM-DD); antes no ve atrasos (openspec: inicio-lunes-alumnos)
}

// Lunes siguiente (estrictamente posterior) a la fecha del alta en CDMX (UTC−6, sin horario de verano).
export function lunesDeInicio(altaIso: string): string {
  const d = new Date(Date.parse(altaIso) - 6 * 3600_000);
  const dia = d.getUTCDay(); // 0 domingo … 1 lunes
  d.setUTCDate(d.getUTCDate() + ((8 - dia) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

// Lunes de inicio del alumno o alumna con ese nombre, si su alta lo tiene.
export function inicioDe(registro: RegistroAlumnos, alumno: string | null): string | undefined {
  if (!alumno) return undefined;
  const slug = slugAlumno(alumno);
  return Object.values(registro).find((a) => slugAlumno(a.nombre) === slug)?.inicio;
}
export type RegistroAlumnos = Record<string, AlumnoRegistrado>;

export const RUTA_ALUMNOS = "alumnos.json";
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE = /^[\p{L}][\p{L} .'-]{1,39}$/u;

let cache: { t: number; v: RegistroAlumnos } | null = null;
export function clearCacheAlumnos() {
  cache = null;
}

// Registro con caché de 30 s (se lee en cada carga de filas de Inglés).
export async function leerRegistro(store: Store): Promise<RegistroAlumnos> {
  if (cache && Date.now() - cache.t < 30_000) return cache.v;
  const v = (await store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data ?? {};
  cache = { t: Date.now(), v };
  return v;
}

// Liga cada correo registrado a las filas con su "Nombre"; si no tiene filas, agrega una fila de identidad
// (source "registro", sin tarea) para que el portal, Inglés, actividades y Juegos lo reconozcan.
export function aplicarAlumnos(filas: InglesRow[], registro: RegistroAlumnos): InglesRow[] {
  const entradas = Object.entries(registro);
  if (!entradas.length) return filas;
  const porSlug = new Map(entradas.map(([email, a]) => [slugAlumno(a.nombre), { email, ...a }]));
  const usados = new Set<string>();
  const out = filas.map((r) => {
    const a = r.alumno ? porSlug.get(slugAlumno(r.alumno)) : undefined;
    if (!a || r.userEmails.includes(a.email)) return r;
    usados.add(a.email);
    return { ...r, userEmails: [...r.userEmails, a.email], userNames: [...r.userNames, a.nombre] };
  });
  for (const [email, a] of entradas) {
    if (usados.has(email) || filas.some((r) => r.userEmails.includes(email))) continue;
    out.push({
      source: "registro", id: `registro-${slugAlumno(a.nombre)}`, name: "", label: "", completado: false, fecha: null, alumno: a.nombre,
      calificacion: null, dificultad: null, editadoEn: null, userIds: [], userEmails: [email], userNames: [a.nombre], url: "",
    });
  }
  return out;
}

export interface DepsAlumnos {
  email: string;
  admin: string;
  store: Store;
  filas(): Promise<InglesRow[]>; // filas de Notion (sin el registro)
  ahora?: () => string;
}

async function escribir(store: Store, cambiar: (r: RegistroAlumnos) => RegistroAlumnos, mensaje: string): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<RegistroAlumnos>(RUTA_ALUMNOS);
    const nuevo = cambiar({ ...(doc?.data ?? {}) });
    if (await store.put(RUTA_ALUMNOS, nuevo, doc?.sha ?? null, mensaje)) {
      cache = { t: Date.now(), v: nuevo };
      return true;
    }
  }
  return false;
}

// sub: "" (GET lista, POST alta) o "/quitar" (POST). Solo admin.
export async function handleAlumnos(req: Request, sub: string, deps: DepsAlumnos, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  const filas = await deps.filas();
  const registro = (await deps.store.get<RegistroAlumnos>(RUTA_ALUMNOS))?.data ?? {};

  if (sub === "" && req.method === "GET") {
    const notion = new Map<string, Set<string>>();
    for (const r of filas) {
      if (!r.alumno) continue;
      if (!notion.has(r.alumno)) notion.set(r.alumno, new Set());
      r.userEmails.forEach((e) => notion.get(r.alumno!)!.add(e));
    }
    const alumnos = [
      ...[...notion].map(([nombre, emails]) => ({ nombre, emails: [...emails], origen: "notion" as const })),
      ...Object.entries(registro).map(([e, a]) => ({ nombre: a.nombre, emails: [e], origen: "registro" as const, alta: a.alta, ...(a.inicio ? { inicio: a.inicio } : {}) })),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return json({ alumnos });
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  }

  if (sub === "" && req.method === "POST") {
    const correo = String(body.email ?? "").trim().toLowerCase();
    const nombre = String(body.nombre ?? "").trim().replace(/\s+/g, " ");
    if (!CORREO.test(correo)) return json({ error: "correo_invalido" }, 400);
    if (!NOMBRE.test(nombre)) return json({ error: "nombre_invalido" }, 400);
    if (correo === deps.admin || registro[correo] || filas.some((r) => r.userEmails.includes(correo))) return json({ error: "correo_en_uso" }, 409);
    const slug = slugAlumno(nombre);
    if (slug === "profe") return json({ error: "nombre_en_uso" }, 409); // reservado para la ruta del profe
    const conCorreo = filas.some((r) => r.alumno && slugAlumno(r.alumno) === slug && r.userEmails.length) ||
      Object.values(registro).some((a) => slugAlumno(a.nombre) === slug);
    if (conCorreo) return json({ error: "nombre_en_uso" }, 409);
    const alta = deps.ahora ? deps.ahora() : new Date().toISOString();
    // Liga a un alumno que ya lleva el curso en Notion: sin inicio (sus atrasos son reales).
    const existente = filas.some((r) => r.alumno && slugAlumno(r.alumno) === slug);
    const alumno: AlumnoRegistrado = existente ? { nombre, alta } : { nombre, alta, inicio: lunesDeInicio(alta) };
    if (!await escribir(deps.store, (r) => ({ ...r, [correo]: alumno }), `alumnos: alta de ${nombre}`)) return json({ error: "conflicto_escritura" }, 503);
    return json({ ok: true, alumno: { email: correo, ...alumno } });
  }

  if (sub === "/quitar" && req.method === "POST") {
    const correo = String(body.email ?? "").trim().toLowerCase();
    if (!registro[correo]) return json({ error: "not_found" }, 404);
    const nombre = registro[correo].nombre;
    if (!await escribir(deps.store, (r) => { delete r[correo]; return r; }, `alumnos: se quita a ${nombre}`)) return json({ error: "conflicto_escritura" }, 503);
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}
