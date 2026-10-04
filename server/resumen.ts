// Tablero del profe (openspec: ingles-pro): GET /ingles/resumen?grupo=<id> (solo admin).
// Indicadores del grupo y mapa de calor alumnos y alumnas × elementos de la semana actual.
// Se calcula en el servidor sobre el almacén (PgStore lee los resultados de cada elemento en una consulta);
// no agrega objetos nuevos a Postgres.
import { visibleItems } from "./actividades.ts";
import { leerCarpeta } from "./db.ts";
import { type Item, mxToday, paraAlumno, type Resultado, slugAlumno, tieneReto } from "./motor.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export type EstadoCelda = "hecho" | "atrasado" | "hoy" | "pendiente" | "proximamente" | "no-aplica";
export interface Celda {
  estado: EstadoCelda;
  porcentaje?: number | null;
  fueraDeTiempo?: boolean;
  intentos?: number;
  prorroga?: string;
}

export interface InfoGrupo { id: string; nombre: string; nivel: string | null; horario: string | null; meet_url: string | null; color: string }

export interface DepsResumen {
  email: string;
  admin: string;
  store: Store;
  // Alumnos y alumnas del grupo de Inglés (Notion + altas), con su lunes de inicio si es alta nueva.
  alumnos: () => Promise<{ nombre: string; inicio?: string }[]>;
  // Solo con la base migrada (ingles-grupos); sin ellas no se filtra por grupo.
  grupoDe?: (slug: string) => Promise<string | null>;
  grupoInfo?: (id: string) => Promise<InfoGrupo | null>;
}

const ALUMNO_PROFE = "profe";

export function celdaDe(it: Item & { grupos?: string[] }, hoy: string, alumno: { slug: string; inicio?: string; grupo: string | null }, r: Resultado | null): Celda {
  const suyo = paraAlumno(it, alumno.slug);
  const prorroga = it.prorrogas?.[alumno.slug] ? { prorroga: it.prorrogas[alumno.slug] } : {};
  if (it.grupos?.length && alumno.grupo && !it.grupos.includes(alumno.grupo)) return { estado: "no-aplica" };
  if (alumno.inicio && suyo.fechaLimite < alumno.inicio) return { estado: "no-aplica" };
  const intentos = r?.intentos.length || 0;
  if (intentos) return { estado: "hecho", porcentaje: r!.mejor?.porcentaje ?? null, fueraDeTiempo: r!.intentos[0].fueraDeTiempo === true, intentos, ...prorroga };
  if (hoy < suyo.disponibleDesde) return { estado: "proximamente", ...prorroga };
  if (hoy > suyo.fechaLimite) return { estado: "atrasado", ...prorroga };
  if (hoy === suyo.fechaLimite) return { estado: "hoy", ...prorroga };
  return { estado: "pendiente", ...prorroga };
}

export async function handleResumen(req: Request, deps: DepsResumen, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  const url = new URL(req.url);
  const hoy = url.searchParams.get("hoy") && Deno.env.get("PERMITIR_HOY") === "1" ? url.searchParams.get("hoy")! : mxToday();
  const grupoPedido = url.searchParams.get("grupo") || null;

  const { items, semanaActual } = await visibleItems(deps.store, hoy);
  const ids = new Set(semanaActual?.elementos.map((e) => e.id) ?? []);
  const columnas = items.filter((it) => ids.has(it.id) && tieneReto(it));

  // Alumnos y alumnas (sin el profe), con su grupo vigente.
  const lista = (await deps.alumnos()).filter((a) => slugAlumno(a.nombre) !== ALUMNO_PROFE);
  const unicos = [...new Map(lista.map((a) => [a.nombre, a])).values()];
  const conGrupo = await Promise.all(unicos.map(async (a) => {
    const slug = slugAlumno(a.nombre);
    return { ...a, slug, grupo: deps.grupoDe ? await deps.grupoDe(slug) : null };
  }));
  const delGrupo = conGrupo.filter((a) => !grupoPedido || !deps.grupoDe || a.grupo === grupoPedido)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  // Resultados: una lectura por columna.
  const porColumna = await Promise.all(columnas.map(async (it) => {
    const docs = await leerCarpeta<Resultado>(deps.store, `resultados/${it.id}`);
    return new Map(docs.filter((d) => d.nombre.endsWith(".json") && !d.nombre.startsWith("_")).map((d) => [d.nombre.slice(0, -5), d.data]));
  }));

  const filas = delGrupo.map((a) => ({
    alumno: a.nombre,
    grupo: a.grupo,
    celdas: Object.fromEntries(columnas.map((it, i) => [it.id, celdaDe(it, hoy, a, porColumna[i].get(a.slug) ?? null)])),
  }));

  // Indicadores: "a tiempo" sobre lo vencido o entregado; promedio del mejor intento de lo entregado.
  const celdas = filas.flatMap((f) => Object.values(f.celdas));
  const hechas = celdas.filter((c) => c.estado === "hecho");
  const atrasos = celdas.filter((c) => c.estado === "atrasado").length;
  const debidas = hechas.length + atrasos;
  const conNota = hechas.filter((c) => typeof c.porcentaje === "number");
  const kpis = {
    alumnos: filas.length,
    aTiempo: debidas ? Math.round(hechas.filter((c) => !c.fueraDeTiempo).length * 100 / debidas) : null,
    promedio: conNota.length ? Math.round(conNota.reduce((s, c) => s + (c.porcentaje as number), 0) / conNota.length) : null,
    atrasos,
    // "Quién no ha entrado": sin entregas esta semana teniendo algo ya abierto (no se registran visitas).
    sinEntregas: filas.filter((f) => {
      const cs = Object.values(f.celdas);
      return !cs.some((c) => c.estado === "hecho") && cs.some((c) => ["atrasado", "hoy", "pendiente"].includes(c.estado));
    }).map((f) => f.alumno),
  };

  const grupo = grupoPedido && deps.grupoInfo ? await deps.grupoInfo(grupoPedido) : null;
  return json({
    hoy,
    grupo,
    semana: semanaActual ? { id: semanaActual.id, titulo: semanaActual.titulo } : null,
    columnas: columnas.map((it) => ({ id: it.id, tipo: it.tipo, titulo: it.titulo, disponibleDesde: it.disponibleDesde, fechaLimite: it.fechaLimite })),
    filas,
    kpis,
  });
}
