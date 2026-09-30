// Marcar o desmarcar "Completado" de una tarea de Notion (Inglés) y registrarlo en el avance JSON.
// Solo sobre filas visibles para el correo (mismas reglas que /ingles/data); el admin, sobre cualquiera.
import { slugAlumno } from "./motor.ts";
import { filterForEmail, type InglesRow } from "./rows.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export interface DepsCompletar {
  filas(): Promise<InglesRow[]>; // con correos resueltos
  parche(id: string, completado: boolean): Promise<{ ok: boolean; status: number }>;
  store: Store;
  admin: string;
}

interface Marca {
  id: string;
  titulo: string;
  completado: boolean;
  en: string;
  por: "alumno" | "admin";
}

export interface Avance {
  alumno: string;
  notion: Record<string, Omit<Marca, "id">>;
  historial: Marca[];
}

const MAX_HISTORIAL = 200;
const sinGuiones = (id: string) => id.replace(/-/g, "").toLowerCase();

export async function handleCompletar(req: Request, pageId: string, email: string, deps: DepsCompletar, json: Json): Promise<Response> {
  if (!email) return json({ error: "missing_email" }, 400);
  let body: { completado?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  if (typeof body.completado !== "boolean") return json({ error: "json_invalido" }, 400);
  const completado = body.completado;

  const todas = await deps.filas();
  const { isAdmin } = filterForEmail([], email, deps.admin);
  const visibles = isAdmin ? todas : todas.filter((r) => r.userEmails.includes(email));
  const fila = visibles.find((r) => sinGuiones(r.id) === sinGuiones(pageId));
  if (!fila) return json({ error: "sin_acceso" }, 403);

  const res = await deps.parche(fila.id, completado);
  if (!res.ok) return json({ error: res.status === 403 || res.status === 401 ? "sin_permiso_notion" : `notion_${res.status}` }, 502);

  const marca: Marca = { id: fila.id, titulo: fila.name, completado, en: new Date().toISOString(), por: isAdmin ? "admin" : "alumno" };
  const registrado = fila.alumno ? await registrar(deps.store, fila.alumno, marca) : false;
  return json({ ok: true, id: fila.id, completado, registrado });
}

async function registrar(store: Store, alumno: string, marca: Marca): Promise<boolean> {
  const ruta = `avance/${slugAlumno(alumno)}.json`;
  try {
    for (let i = 0; i < 3; i++) {
      const doc = await store.get<Avance>(ruta);
      const av: Avance = doc?.data ?? { alumno, notion: {}, historial: [] };
      const { id, ...estado } = marca;
      av.notion = { ...av.notion, [id]: estado };
      av.historial = [...av.historial, marca].slice(-MAX_HISTORIAL);
      if (await store.put(ruta, av, doc?.sha ?? null, `avance: ${alumno} ${marca.completado ? "completó" : "desmarcó"} "${marca.titulo}"`)) return true;
    }
  } catch (e) {
    console.error("avance:", e instanceof Error ? e.message : "desconocido");
  }
  return false;
}
