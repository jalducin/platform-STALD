// Panel del profe en una petición (openspec: panel-profe-peticiones). GET /ingles/panel (solo admin) y la parte
// `panel` de GET /ingles/data?incluir=panel: lo que la vista inicial de ingles.html (admin) necesita, leído en paralelo
// con los mismos manejadores de las rutas sueltas (/ingles/grupos, /ingles/alumnos, /ingles/resumen, /profe/entregas),
// así que filtros, ocultos y bajas salen idénticos. Resiliente: si una parte falla, viaja como { error, detalle? },
// su nombre va en `fallas` y las demás llegan (como el resumen en fix-ingles-admin).
// Sin correos: `alumnos` solo trae nombre y baja; `entregas`, cuántas hay listas para evaluar (total, de Inglés y de
// Secundaria): el mismo dato para el contador de «📥 Entregas» y para «📥 Por revisar».
// deno-lint-ignore-file no-explicit-any

type Json = (body: unknown, status?: number) => Response;
type Parte = () => Promise<Response>;

export interface PartesPanel {
  grupos: Parte;
  alumnos: Parte;
  resumen: Parte;
  entregas: Parte;
}
export interface DepsPanel {
  email: string;
  admin: string;
  partes: PartesPanel;
}

const NOMBRES = ["grupos", "alumnos", "resumen", "entregas"] as const;
type Nombre = typeof NOMBRES[number];
type Falla = { error: string; detalle?: string };

// Recorta el cuerpo 200 de cada parte a lo que usa el panel. null = cuerpo inesperado.
const RECORTE: Record<Nombre, (b: any) => unknown> = {
  grupos: (b) => (Array.isArray(b?.grupos) ? b : null),
  alumnos: (b) => (Array.isArray(b?.alumnos) ? b.alumnos.map((a: any) => ({ nombre: a.nombre, ...(a.baja ? { baja: a.baja } : {}) })) : null),
  resumen: (b) => (b && Array.isArray(b.filas) ? b : null),
  entregas: (b) => Array.isArray(b?.entregas) ? conteoEntregas(b.entregas) : null,
};

// Entregas listas para evaluar por ámbito (la bandeja junta Inglés y Secundaria). `pendientes` = ingles + secundaria.
export function conteoEntregas(entregas: any[]): { pendientes: number; ingles: number; secundaria: number } {
  const listas = entregas.filter((e) => e?.estado === "lista");
  const ingles = listas.filter((e) => e?.mision?.ambito === "ingles").length;
  const secundaria = listas.filter((e) => e?.mision?.ambito === "secundaria").length;
  return { pendientes: listas.length, ingles, secundaria };
}

async function leerParte(nombre: Nombre, parte: Parte): Promise<unknown> {
  try {
    const r = await parte();
    const body = await r.json().catch(() => ({}));
    if (r.status !== 200) {
      const f: Falla = { error: typeof body?.error === "string" ? body.error : "upstream_error" };
      if (typeof body?.detalle === "string") f.detalle = body.detalle;
      return f;
    }
    return RECORTE[nombre](body) ?? { error: "respuesta_invalida" };
  } catch (e) {
    return { error: "upstream_error", detalle: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
  }
}

// Sin Postgres los grupos responden 503 `sin_base`: no es falla (el panel sale sin grupos, como siempre).
const esFalla = (v: any) => !!v && typeof v === "object" && !Array.isArray(v) && typeof v.error === "string" && v.error !== "sin_base";

export async function armarPanel(partes: PartesPanel): Promise<Record<string, unknown>> {
  const valores = await Promise.all(NOMBRES.map((n) => leerParte(n, partes[n])));
  const panel: Record<string, unknown> = Object.fromEntries(NOMBRES.map((n, i) => [n, valores[i]]));
  panel.fallas = NOMBRES.filter((_, i) => esFalla(valores[i]));
  return panel;
}

// GET /ingles/panel → 200 con el panel; 403 a quien no es el admin (el 401 sin sesión lo da main.ts antes).
export async function handlePanel(req: Request, d: DepsPanel, json: Json): Promise<Response> {
  if (!d.admin || d.email !== d.admin) return json({ error: "solo_admin" }, 403);
  if (req.method !== "GET") return json({ error: "metodo_no_permitido" }, 405);
  return json(await armarPanel(d.partes));
}
