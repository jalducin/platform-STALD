// Grupos de clase de Inglés (openspec: ingles-grupos): stald_grupos + stald_inscripciones en Postgres.
// Rutas /ingles/grupos (solo admin): GET lista y miembros; POST crea o edita; POST /mover cambia de grupo.
import { type Db, v } from "./db.ts";
import { slugAlumno } from "./motor.ts";

type Json = (body: unknown, status?: number) => Response;

export interface Grupo {
  id: string;
  nombre: string;
  nivel: string | null;
  horario: string | null;
  meet_url: string | null;
  color: string;
  activo: boolean;
  orden: number;
}
interface Inscripcion { alumno: string; grupo_id: string; desde: string; hasta: string | null }

export interface DepsGrupos {
  email: string;
  admin: string;
  db: Db;
  hoy: () => string; // AAAA-MM-DD (CDMX)
}

let cache: { t: number; grupos: Grupo[]; vigentes: Inscripcion[] } | null = null;
export function clearCacheGrupos() {
  cache = null;
}

// Grupos activos y las inscripciones vigentes, con caché de 60 s (se consulta en cada lista de actividades).
async function leer(db: Db): Promise<{ grupos: Grupo[]; vigentes: Inscripcion[] }> {
  if (cache && Date.now() - cache.t < 60_000) return cache;
  const [grupos, vigentes] = await Promise.all([
    db.select<Grupo>("grupos", "select=*&order=orden.asc,nombre.asc"),
    db.select<Inscripcion>("inscripciones", "hasta=is.null&select=*"),
  ]);
  cache = { t: Date.now(), grupos, vigentes };
  return cache;
}

// Grupo vigente de un alumno o alumna (slug); sin inscripción, el primer grupo activo. null si no hay grupos.
export async function grupoDe(db: Db, alumno: string, _hoy: string): Promise<string | null> {
  const { grupos, vigentes } = await leer(db);
  const ins = vigentes.find((i) => i.alumno === alumno);
  if (ins) return ins.grupo_id;
  return grupos.find((g) => g.activo)?.id ?? null;
}
export async function grupoInfo(db: Db, id: string | null): Promise<Grupo | null> {
  if (!id) return null;
  return (await leer(db)).grupos.find((g) => g.id === id) ?? null;
}

const NOMBRE = /^[\p{L}\p{N}][\p{L}\p{N} .,'()·:-]{0,59}$/u;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const texto = (x: unknown, max: number) => (x === undefined || x === null || x === "" ? null : String(x).trim().slice(0, max));

export async function handleGrupos(req: Request, sub: string, deps: DepsGrupos, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  const db = deps.db;

  if (sub === "" && req.method === "GET") {
    cache = null;
    const { grupos, vigentes } = await leer(db);
    return json({ grupos, miembros: Object.fromEntries(vigentes.map((i) => [i.alumno, i.grupo_id])) });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }

  if (sub === "" && req.method === "POST") {
    const nombre = String(body.nombre ?? "").trim().replace(/\s+/g, " ");
    if (!NOMBRE.test(nombre)) return json({ error: "nombre_invalido" }, 400);
    const meet = texto(body.meet_url, 200);
    if (meet && !/^https:\/\/[\w.-]+\/\S*$/.test(meet)) return json({ error: "meet_invalido" }, 400);
    const color = texto(body.color, 7) ?? "#4f46e5";
    if (!COLOR.test(color)) return json({ error: "color_invalido" }, 400);
    const id = texto(body.id, 60) ?? slugAlumno(nombre);
    if (!/^[a-z0-9-]{1,60}$/.test(id)) return json({ error: "id_invalido" }, 400);
    const fila = {
      id, nombre, nivel: texto(body.nivel, 20), horario: texto(body.horario, 60), meet_url: meet, color,
      activo: body.activo === undefined ? true : body.activo === true, orden: Number.isInteger(body.orden) ? body.orden as number : 0,
    };
    const [grupo] = await db.upsert<Grupo>("grupos", fila, "id");
    cache = null;
    return json({ ok: true, grupo });
  }

  if (sub === "/mover" && req.method === "POST") {
    const alumno = slugAlumno(String(body.alumno ?? ""));
    const grupo = String(body.grupo ?? "");
    if (!alumno) return json({ error: "alumno_invalido" }, 400);
    const { grupos } = await leer(db);
    if (!grupos.some((g) => g.id === grupo)) return json({ error: "grupo_inexistente" }, 400);
    const hoy = deps.hoy();
    const vigente = (await db.select<Inscripcion>("inscripciones", `alumno=eq.${v(alumno)}&hasta=is.null&select=*`))[0];
    if (vigente?.grupo_id === grupo) return json({ ok: true, sinCambio: true });
    if (vigente && vigente.desde === hoy) {
      await db.update("inscripciones", `alumno=eq.${v(alumno)}&desde=eq.${v(hoy)}`, { grupo_id: grupo }); // mismo día: corrige
    } else {
      if (vigente) await db.update("inscripciones", `alumno=eq.${v(alumno)}&desde=eq.${v(vigente.desde)}`, { hasta: hoy });
      await db.insert("inscripciones", { alumno, grupo_id: grupo, desde: hoy, hasta: null });
    }
    cache = null;
    return json({ ok: true, alumno, grupo });
  }

  return json({ error: "not_found" }, 404);
}
