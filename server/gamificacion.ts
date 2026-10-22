// Gamificación de Inglés (openspec: rpg-fase2-ingles): nick de Juegos como apodo público, perfil de ranking y ranking
// por grupo ordenado por constancia, detrás del interruptor `ranking` (apagado por defecto).
//   GET  /gamificacion/perfil              → su preferencia y el estado de su nick (solo alumnos y alumnas de Inglés)
//   PUT  /gamificacion/perfil { aparecer } → aparecer u ocultarse
//   GET  /gamificacion/ranking[?grupo=]    → nicks y puntos de constancia de su grupo + su posición privada
//   GET  /profe/nicks[?grupo=]             → cola de moderación (solo admin)
//   POST /profe/nicks/aprobar | /rechazar  → aprobar o rechazar con motivo (solo admin)
//   POST /profe/ranking                    → interruptor general y apagado por grupo (solo admin)
// Datos: gamificacion/config.json y gamificacion/perfiles/<slug>.json en stald_docs (sin correos). El nick lo sigue
// guardando Juegos (juegos/nicks.json); aquí solo se lee.
import "../comun/constancia.js";
import { leerCarpeta } from "./db.ts";
import { type Item, type Resultado, slugAlumno, tieneReto } from "./motor.ts";
import type { RegistroAlumnos } from "./alumnos.ts";
import type { Store } from "./store.ts";
import { cambiarInterruptores, leerInterruptores } from "./interruptores.ts";
import { invalidarRanking, memoRanking } from "./cache_ranking.ts";

type Json = (body: unknown, status?: number) => Response;

// deno-lint-ignore no-explicit-any
const C = (globalThis as any).Constancia as {
  semanaDe(hoy: string): { desde: string; hasta: string };
  puntosConstancia(envios: { actividades?: { enviadoEn: string; aTiempo: boolean }[]; pasosMision?: { enviadoEn: string }[] }, semana: { desde: string; hasta: string }): number;
  ordenarRanking<T extends { nick: string; puntos: number }>(filas: T[]): (T & { posicion: number })[];
  posicionDe(puntos: number, filas: { puntos: number }[]): number;
};

// ---------- Configuración (interruptor) ----------
export const RUTA_CONFIG = "gamificacion/config.json";
export interface ConfigGamificacion {
  ranking: boolean; // interruptor general: apagado por defecto
  gruposSinRanking: string[]; // grupos con el ranking apagado por el profe
}
export const CONFIG_POR_DEFECTO: ConfigGamificacion = { ranking: false, gruposSinRanking: [] };
const leerConfig = (store: Store) => leerInterruptores(store, RUTA_CONFIG, CONFIG_POR_DEFECTO);
const rankingPrendido = (c: ConfigGamificacion, grupo: string) => c.ranking === true && !(c.gruposSinRanking || []).includes(grupo);
// ¿Ve el ranking este grupo? Lo usa /ingles/actividades para avisar a la página (sin petición extra si está apagado).
// Si no se puede leer la configuración, se toma como apagado.
export async function rankingVisible(store: Store, grupo: string | null): Promise<boolean> {
  try { return rankingPrendido(await leerConfig(store), grupo ?? GRUPO_UNICO); } catch { return false; }
}

// ---------- Perfil ----------
export const rutaPerfil = (slug: string) => `gamificacion/perfiles/${slug}.json`;
export interface PerfilGamificacion {
  aparecer: boolean;
  nickAprobado?: string; // valor aprobado: si el nick de Juegos cambia, deja de coincidir y vuelve a «pendiente»
  nickRechazado?: string;
  motivo?: string;
  actualizado: string;
}
export type EstadoNick = "sin_nick" | "pendiente" | "aprobado" | "rechazado";
export function estadoNick(perfil: PerfilGamificacion | null, nick: string | null): EstadoNick {
  if (!nick) return "sin_nick";
  if (perfil?.nickAprobado === nick) return "aprobado";
  if (perfil?.nickRechazado === nick) return "rechazado";
  return "pendiente";
}

// ---------- Revisión del nick ----------
// Forma canónica para comparar (igual para el nick, los nombres y las listas): NFKD (letras de ancho completo y
// similares a su forma básica), sin acentos, minúsculas, números «leet» a letras y «l» como «i» (así «Ange1» y
// «Angel» coinciden). Lo que no quede en a-z, 0-9 o espacio (otros alfabetos, como la «а» cirílica) se rechaza.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };
const basico = (s: string) => s.normalize("NFKD").replaceAll(/\p{M}/gu, "").toLowerCase();
const canon = (s: string) => basico(s).replaceAll(/[0134578]/g, (d) => LEET[d]).replaceAll("l", "i");
const palabras = (s: string) => canon(s).split(/[^a-z0-9]+/).filter(Boolean);
// Lista de palabras bloqueadas (groserías e insultos comunes en México y en inglés, y contenido para adultos).
// Las de 5 letras o más se buscan dentro del nick; las cortas, como palabra completa.
export const PALABRAS_BLOQUEADAS = [
  "puto", "puta", "pendej", "verga", "chinga", "culero", "culera", "mierda", "cabron", "joto", "zorra", "perra", "mamon",
  "pinche", "idiota", "estupid", "imbecil", "naco", "baboso", "babosa", "tarado", "tarada", "menso", "mensa", "nalga",
  "sexo", "sexy", "porno", "desnud", "droga", "nazi", "hitler", "matar", "muerte", "suicid",
  "fuck", "shit", "bitch", "dick", "pussy", "nigg", "slut", "whore", "kill", "sex",
].map(canon);
const CORREOS = ["gmail", "hotmail", "outlook", "yahoo", "icloud", "arroba", "puntocom"].map(canon);
export type MotivoNick = "correo" | "telefono" | "nombre" | "palabra" | "caracteres" | "repetido";
export const MENSAJES_NICK: Record<MotivoNick, string> = {
  correo: "Tu nick parece un correo. Elige uno que no diga cómo contactarte y cámbialo en Juegos.",
  telefono: "Tu nick tiene muchos números, como un teléfono. Cámbialo en Juegos.",
  nombre: "Tu nick incluye el nombre de una persona del registro. Elige uno sin nombres de personas y cámbialo en Juegos.",
  palabra: "Tu nick tiene una palabra que no se permite. Elige otro y cámbialo en Juegos.",
  caracteres: "Usa en tu nick solo letras y números comunes (sin símbolos de otros alfabetos). Cámbialo en Juegos.",
  repetido: "Otra persona ya usa ese nick en Juegos. Elige uno distinto y cámbialo en Juegos.",
};
type Revision = { ok: true } | { ok: false; motivo: MotivoNick; mensaje: string };
const mal = (motivo: MotivoNick): Revision => ({ ok: false, motivo, mensaje: MENSAJES_NICK[motivo] });
// nombres = nombres completos del registro; se usa el nombre de pila (la primera palabra) de cada uno.
export function revisarNick(nick: string, nombres: string[]): Revision {
  const b = basico(nick);
  if (/[^a-z0-9 ]/.test(b)) return mal(b.includes("@") ? "correo" : "caracteres");
  if ((b.match(/[0-9]/g) || []).length >= 7) return mal("telefono");
  const ps = palabras(nick);
  const junto = ps.join("");
  if (CORREOS.some((c) => junto.includes(c))) return mal("correo");
  const pila = [...new Set(nombres.map((n) => palabras(n)[0]).filter((n): n is string => !!n && n.length >= 3))];
  if (pila.some((n) => n.length >= 4 ? junto.includes(n) : ps.includes(n))) return mal("nombre");
  if (PALABRAS_BLOQUEADAS.some((w) => w.length >= 5 ? junto.includes(w) : ps.includes(w))) return mal("palabra");
  return { ok: true };
}
// Juegos no exige nicks únicos: en el ranking no puede haber dos iguales (se confundirían o se suplantarían).
export function nickRepetido(nick: string, nicks: Record<string, string>, idPropio: string): boolean {
  const c = canon(nick).replaceAll(" ", "");
  return Object.entries(nicks).some(([id, n]) => id !== idPropio && canon(n).replaceAll(" ", "") === c);
}
// Revisión completa: la automática y que nadie más tenga ese nick.
function revisarTodo(nick: string, nombres: string[], nicks: Record<string, string>, slug: string): Revision {
  const r = revisarNick(nick, nombres);
  if (!r.ok) return r;
  return nickRepetido(nick, nicks, `a-${slug}`) ? mal("repetido") : r;
}

// ---------- Dependencias ----------
export interface DepsGamificacion {
  email: string;
  admin: string;
  store: Store;
  registro: () => Promise<RegistroAlumnos>; // completo (incluye bajas de Inglés)
  esSecundaria: (email: string) => Promise<boolean>;
  grupoDe?: (slug: string) => Promise<string | null>; // sin base de grupos: todos en un solo grupo
  items: (hoy: string) => Promise<Item[]>; // contenido visible de Inglés
  pasosMision?: (slug: string) => Promise<{ enviadoEn: string }[]>; // motor de misiones (Fase 2a); sin él, 0
  hoy: () => string;
  ahora: () => string;
}
const GRUPO_UNICO = "todos";
const RUTA_NICKS = "juegos/nicks.json"; // de server/juegos.ts (spec `juegos`, sin cambios)
const ALUMNO_PROFE = "profe";
const leerNicks = async (store: Store) => (await store.get<Record<string, string>>(RUTA_NICKS))?.data ?? {};
const nickDe = (nicks: Record<string, string>, slug: string) => nicks[`a-${slug}`] ?? null;

type Persona =
  | { tipo: "alumno"; slug: string; nombre: string }
  | { tipo: "error"; status: number; error: string };

// Quién pregunta: alumno o alumna activa de Inglés; si no, el error que le toca.
async function persona(deps: DepsGamificacion): Promise<Persona> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!email) return { tipo: "error", status: 401, error: "sesion_invalida" };
  if (deps.admin && email === deps.admin) return { tipo: "error", status: 403, error: "solo_alumnos" };
  const a = (await deps.registro())[email];
  if (a && !a.baja) return { tipo: "alumno", slug: slugAlumno(a.nombre), nombre: a.nombre };
  if (await deps.esSecundaria(email) || a?.secundaria) return { tipo: "error", status: 404, error: "sin_ranking" };
  if (a?.baja) return { tipo: "error", status: 403, error: "baja_ingles" };
  return { tipo: "error", status: 403, error: "no_registrado" };
}

const grupoDe = async (deps: DepsGamificacion, slug: string) => (deps.grupoDe ? await deps.grupoDe(slug) : null) ?? GRUPO_UNICO;

async function guardarPerfil(store: Store, slug: string, cambio: (p: PerfilGamificacion | null) => PerfilGamificacion): Promise<PerfilGamificacion | null> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<PerfilGamificacion>(rutaPerfil(slug));
    const nuevo = cambio(doc?.data ?? null);
    if (await store.put(rutaPerfil(slug), nuevo, doc?.sha ?? null, `gamificacion: perfil de ${slug}`)) return nuevo;
  }
  return null;
}

// ---------- Ranking ----------
interface CalculoGrupo {
  puntos: Map<string, number>; // por slug (solo en memoria del servidor; nunca sale en la respuesta)
  visibles: { nick: string; puntos: number }[];
}

async function calcularGrupo(deps: DepsGamificacion, grupo: string, semana: { desde: string; hasta: string }): Promise<CalculoGrupo> {
  const registro = await deps.registro();
  const activos = [...new Map(Object.values(registro).filter((a) => !a.baja).map((a) => [slugAlumno(a.nombre), a])).keys()].filter((s) => s !== ALUMNO_PROFE);
  const conGrupo = await Promise.all(activos.map(async (slug) => ({ slug, grupo: await grupoDe(deps, slug) })));
  const miembros = conGrupo.filter((m) => m.grupo === grupo).map((m) => m.slug);
  const set = new Set(miembros);

  // Envíos: el primero de cada actividad con reto que ya abrió en la semana o antes.
  const items = (await deps.items(semana.hasta)).filter((it) => tieneReto(it) && it.disponibleDesde <= semana.hasta);
  const porSlug = new Map<string, { enviadoEn: string; aTiempo: boolean }[]>(miembros.map((s) => [s, []]));
  const carpetas = await Promise.all(items.map((it) => leerCarpeta<Resultado>(deps.store, `resultados/${it.id}`)));
  for (const docs of carpetas) {
    for (const d of docs) {
      const slug = d.nombre.replace(/\.json$/, "");
      const primero = d.data?.intentos?.[0];
      if (!set.has(slug) || !primero?.enviadoEn) continue;
      porSlug.get(slug)!.push({ enviadoEn: primero.enviadoEn, aTiempo: primero.fueraDeTiempo !== true });
    }
  }
  const pasos = await Promise.all(miembros.map((s) => deps.pasosMision ? deps.pasosMision(s) : Promise.resolve([])));
  const puntos = new Map(miembros.map((s, i) => [s, C.puntosConstancia({ actividades: porSlug.get(s), pasosMision: pasos[i] }, semana)]));

  // Visibles: activaron aparecer y su nick de Juegos actual es el aprobado (y sigue pasando la revisión).
  const nicks = await leerNicks(deps.store);
  const nombres = Object.values(registro).map((a) => a.nombre);
  const perfiles = await Promise.all(miembros.map((s) => deps.store.get<PerfilGamificacion>(rutaPerfil(s))));
  const visibles = miembros.flatMap((s, i) => {
    const p = perfiles[i]?.data ?? null;
    const nick = nickDe(nicks, s);
    if (!p?.aparecer || !nick || estadoNick(p, nick) !== "aprobado" || !revisarTodo(nick, nombres, nicks, s).ok) return [];
    return [{ nick, puntos: puntos.get(s) ?? 0 }];
  });
  return { puntos, visibles };
}

async function rutaRanking(url: URL, deps: DepsGamificacion, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  const esAdmin = !!deps.admin && email === deps.admin;
  const pedido = url.searchParams.get("grupo");
  let grupo: string;
  let yo: { slug: string } | null = null;
  if (esAdmin) {
    grupo = pedido || GRUPO_UNICO;
  } else {
    const p = await persona(deps);
    if (p.tipo === "error") return json({ error: p.error }, p.status);
    grupo = await grupoDe(deps, p.slug);
    if (pedido && pedido !== grupo) return json({ error: "otro_grupo" }, 403);
    yo = { slug: p.slug };
  }
  if (!rankingPrendido(await leerConfig(deps.store), grupo)) return json({ error: "sin_ranking" }, 404);
  const semana = C.semanaDe(deps.hoy());
  const calc = await memoRanking(`${grupo}|${semana.desde}`, () => calcularGrupo(deps, grupo, semana));
  const lista = C.ordenarRanking(calc.visibles).map((f) => ({ posicion: f.posicion, nick: f.nick, puntos: f.puntos }));
  const cuerpo: Record<string, unknown> = { semana, lista };
  if (yo) {
    const mios = calc.puntos.get(yo.slug) ?? 0;
    const perfil = (await deps.store.get<PerfilGamificacion>(rutaPerfil(yo.slug)))?.data ?? null;
    const nick = nickDe(await leerNicks(deps.store), yo.slug);
    const visible = !!perfil?.aparecer && estadoNick(perfil, nick) === "aprobado" && lista.some((f) => f.nick === nick);
    // Su posición: entre quienes aparecen, contándose a sí misma o a sí mismo (aunque esté oculto).
    const otros = visible ? lista.filter((f) => f.nick !== nick) : lista;
    cuerpo.yo = { posicion: C.posicionDe(mios, otros), puntos: mios, visible };
  }
  return json(cuerpo);
}

// ---------- Perfil (GET / PUT) ----------
async function vistaPerfil(deps: DepsGamificacion, slug: string, perfil: PerfilGamificacion | null) {
  const nick = nickDe(await leerNicks(deps.store), slug);
  const estado = estadoNick(perfil, nick);
  return { ranking: true, aparecer: !!perfil?.aparecer, nick, estadoNick: estado, ...(estado === "rechazado" && perfil?.motivo ? { motivo: perfil.motivo } : {}) };
}

async function perfilHttp(req: Request, url: URL, deps: DepsGamificacion, json: Json): Promise<Response> {
  const p = await persona(deps);
  if (p.tipo === "error") return json({ error: p.error }, p.status);
  const ajeno = url.searchParams.get("alumno");
  if (ajeno && ajeno !== p.slug) return json({ error: "ajeno" }, 403);
  const grupo = await grupoDe(deps, p.slug);
  const prendido = rankingPrendido(await leerConfig(deps.store), grupo);

  if (req.method === "GET") {
    if (!prendido) return json({ ranking: false }); // apagado: nada del ranking, ni el botón para activarlo
    return json(await vistaPerfil(deps, p.slug, (await deps.store.get<PerfilGamificacion>(rutaPerfil(p.slug)))?.data ?? null));
  }
  if (req.method !== "PUT") return json({ error: "metodo_no_permitido" }, 405);
  let body: { aparecer?: unknown; alumno?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  if (body.alumno !== undefined && body.alumno !== p.slug) return json({ error: "ajeno" }, 403);
  if (typeof body.aparecer !== "boolean") return json({ error: "datos_invalidos" }, 400);
  // Ocultarse se puede siempre, también con el ranking apagado; aparecer, solo con el ranking encendido.
  if (body.aparecer && !prendido) return json({ error: "sin_ranking" }, 404);
  if (body.aparecer) {
    const nicks = await leerNicks(deps.store);
    const nick = nickDe(nicks, p.slug);
    if (!nick) return json({ error: "sin_nick", mensaje: "Para aparecer necesitas un nick. Póntelo en Juegos, en «🎨 Tu avatar» → «✏️ Tu nick», y vuelve aquí." }, 400);
    const r = revisarTodo(nick, Object.values(await deps.registro()).map((a) => a.nombre), nicks, p.slug);
    if (!r.ok) return json({ error: "nick_invalido", motivo: r.motivo, mensaje: r.mensaje }, 400);
  }
  const aparecer = body.aparecer;
  const nuevo = await guardarPerfil(deps.store, p.slug, (prev) => ({ ...(prev ?? {}), aparecer, actualizado: deps.ahora() }));
  if (!nuevo) return json({ error: "conflicto_escritura" }, 503);
  invalidarRanking();
  return json(await vistaPerfil(deps, p.slug, nuevo));
}

export async function handleGamificacion(req: Request, sub: string, deps: DepsGamificacion, json: Json): Promise<Response> {
  const url = new URL(req.url);
  try {
    if (sub === "/perfil") return await perfilHttp(req, url, deps, json);
    if (sub === "/ranking" && req.method === "GET") return await rutaRanking(url, deps, json);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("gamificacion:", e instanceof Error ? e.message : e);
    return json({ error: sub === "/ranking" ? "ranking_no_disponible" : "no_disponible" }, 503);
  }
}

// ---------- Panel del profe: moderación de nicks e interruptor ----------
const MAX_MOTIVO = 200;
const DIAS_RETENCION_BAJA = 30;
const restarDias = (f: string, n: number) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

// Perfiles de quien se dio de baja hace más de 30 días o ya no está en el registro: se borran (spec gamificacion).
async function limpiarPerfiles(deps: DepsGamificacion, registro: RegistroAlumnos): Promise<number> {
  const limite = restarDias(deps.hoy(), DIAS_RETENCION_BAJA);
  const vigentes = new Map(Object.values(registro).map((a) => [slugAlumno(a.nombre), a]));
  let n = 0;
  for (const archivo of await deps.store.list("gamificacion/perfiles")) {
    const slug = archivo.replace(/\.json$/, "");
    const a = vigentes.get(slug);
    if (a && (!a.baja || a.baja >= limite)) continue; // «más de 30 días»: la de hace 30 exactos se conserva
    await deps.store.remove(rutaPerfil(slug), `gamificacion: se borra el perfil de ${slug} (baja)`);
    n++;
  }
  if (n) invalidarRanking();
  return n;
}

async function listaNicks(url: URL, deps: DepsGamificacion, json: Json): Promise<Response> {
  const registro = await deps.registro();
  await limpiarPerfiles(deps, registro);
  const pedido = url.searchParams.get("grupo");
  const nicks = await leerNicks(deps.store);
  const nombres = Object.values(registro).map((a) => a.nombre);
  const activos = [...new Map(Object.values(registro).filter((a) => !a.baja).map((a) => [slugAlumno(a.nombre), a])).entries()].filter(([s]) => s !== ALUMNO_PROFE);
  const personas = (await Promise.all(activos.map(async ([slug, a]) => {
    const grupo = await grupoDe(deps, slug);
    if (pedido && grupo !== pedido) return null;
    const perfil = (await deps.store.get<PerfilGamificacion>(rutaPerfil(slug)))?.data ?? null;
    const nick = nickDe(nicks, slug);
    const estado = estadoNick(perfil, nick);
    const rev = nick ? revisarTodo(nick, nombres, nicks, slug) : null;
    return {
      alumno: slug, nombre: (a.nombre.trim().split(/\s+/)[0] || a.nombre), grupo, nick, estado, aparecer: !!perfil?.aparecer,
      ...(perfil?.motivo && estado === "rechazado" ? { motivo: perfil.motivo } : {}),
      ...(rev && !rev.ok ? { revision: rev.motivo } : {}),
    };
  }))).filter((x) => x !== null).sort((a, b) => Number(b.aparecer && b.estado === "pendiente") - Number(a.aparecer && a.estado === "pendiente") || a.nombre.localeCompare(b.nombre, "es"));
  const config = await leerConfig(deps.store);
  return json({ ranking: config.ranking, gruposSinRanking: config.gruposSinRanking, personas });
}

async function moderar(req: Request, accion: "aprobar" | "rechazar", deps: DepsGamificacion, json: Json): Promise<Response> {
  let body: { alumno?: unknown; nick?: unknown; motivo?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  const slug = typeof body.alumno === "string" ? body.alumno : "";
  const registro = await deps.registro();
  if (!Object.values(registro).some((a) => !a.baja && slugAlumno(a.nombre) === slug)) return json({ error: "alumno_no_encontrado" }, 404);
  const nicks = await leerNicks(deps.store);
  const actual = nickDe(nicks, slug);
  if (!actual) return json({ error: "sin_nick" }, 400);
  if (body.nick !== actual) return json({ error: "nick_cambio", mensaje: "El nick cambió en Juegos; vuelve a cargar la lista." }, 409);
  const motivo = typeof body.motivo === "string" ? body.motivo.trim().replaceAll(/\s+/g, " ") : "";
  if (accion === "rechazar" && (!motivo || motivo.length > MAX_MOTIVO)) return json({ error: "motivo_invalido" }, 400);
  if (accion === "aprobar") {
    const r = revisarTodo(actual, Object.values(registro).map((a) => a.nombre), nicks, slug);
    if (!r.ok) return json({ error: "nick_invalido", motivo: r.motivo, mensaje: r.mensaje }, 400);
  }
  const nuevo = await guardarPerfil(deps.store, slug, (prev) => {
    const base: PerfilGamificacion = { aparecer: !!prev?.aparecer, actualizado: deps.ahora() };
    return accion === "aprobar" ? { ...base, nickAprobado: actual } : { ...base, nickRechazado: actual, motivo };
  });
  if (!nuevo) return json({ error: "conflicto_escritura" }, 503);
  invalidarRanking();
  return json({ ok: true, alumno: slug, estado: estadoNick(nuevo, actual) });
}

async function cambiarRanking(req: Request, deps: DepsGamificacion, json: Json): Promise<Response> {
  let body: { ranking?: unknown; grupo?: unknown; apagado?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
  const general = typeof body.ranking === "boolean" ? body.ranking : undefined;
  const grupo = typeof body.grupo === "string" && /^[\w-]{1,60}$/.test(body.grupo) ? body.grupo : null;
  const apagado = typeof body.apagado === "boolean" ? body.apagado : undefined;
  if (general === undefined && !(grupo && apagado !== undefined)) return json({ error: "datos_invalidos" }, 400);
  const nueva = await cambiarInterruptores(deps.store, RUTA_CONFIG, CONFIG_POR_DEFECTO, (c) => {
    const sin = new Set(c.gruposSinRanking || []);
    if (grupo && apagado !== undefined) { if (apagado) sin.add(grupo); else sin.delete(grupo); }
    return { ...c, ...(general !== undefined ? { ranking: general } : {}), gruposSinRanking: [...sin].sort() };
  }, "gamificacion: interruptor del ranking");
  if (!nueva) return json({ error: "conflicto_escritura" }, 503);
  invalidarRanking();
  return json({ ok: true, ranking: nueva.ranking, gruposSinRanking: nueva.gruposSinRanking });
}

// sub: "/nicks", "/nicks/aprobar", "/nicks/rechazar" o "/ranking" (lo que sigue a /profe).
export async function handleProfeGamificacion(req: Request, sub: string, deps: DepsGamificacion, json: Json): Promise<Response> {
  const email = (deps.email || "").trim().toLowerCase();
  if (!email) return json({ error: "sesion_invalida" }, 401);
  if (!deps.admin || email !== deps.admin) return json({ error: "solo_admin" }, 403);
  try {
    if (sub === "/nicks" && req.method === "GET") return await listaNicks(new URL(req.url), deps, json);
    if (sub === "/nicks/aprobar" && req.method === "POST") return await moderar(req, "aprobar", deps, json);
    if (sub === "/nicks/rechazar" && req.method === "POST") return await moderar(req, "rechazar", deps, json);
    if (sub === "/ranking" && req.method === "POST") return await cambiarRanking(req, deps, json);
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("profe gamificacion:", e instanceof Error ? e.message : e);
    return json({ error: "no_disponible" }, 503);
  }
}
