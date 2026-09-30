// Plataforma de juegos: identidad del jugador, partidas con tope, ranking semanal e invitados.
// Datos en el repo privado: juegos/semanas/<lunes>/<id>.json (sin correos) y juegos/invitados.json (correos
// de invitados, solo para análisis del admin). Ver openspec: juegos-plataforma.
import { mxToday, slugAlumno } from "./motor.ts";
import type { Store } from "./store.ts";
import { handleSalas, resumenSalas } from "./salas.ts";

type Json = (body: unknown, status?: number) => Response;

interface FilaConUsuarios {
  userEmails: string[];
  userNames: string[];
  alumno?: string | null;
}

export interface Avatar {
  emoji: string;
  color: string;
}

export interface Jugador {
  id: string;
  nombre: string;
  tipo: "alumno" | "invitado" | "admin";
  avatar?: Avatar;
}

// Avatares permitidos: personajes (sin fotos) y colores de fondo. Única fuente válida.
export const AVATARES = [
  "🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🦄", "🐙", "🦖", "🐧", "🐨", "🐰", "🦉", "🐢", "🐬", "🦋",
  "🐝", "🐱", "🐶", "🦜", "🌮", "🌶️", "🌵", "🪅", "⚽", "🏀", "🎸", "🎨", "🚀", "🌈", "⭐", "👾",
];
export const COLORES = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b"];

function fnv(s: string): number {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const avatarPorDefecto = (id: string): Avatar => ({ emoji: AVATARES[fnv(id) % AVATARES.length], color: COLORES[fnv(id + "|c") % COLORES.length] });
const rutaPerfil = (id: string) => `juegos/perfiles/${id}.json`;

export interface Invitado {
  nombre: string;
  registradoEn: string;
  ultimaVisita: string;
  visitas: number;
}
export type Invitados = Record<string, Invitado>;

interface Partida {
  juego: string;
  puntos: number;
  aciertos: number;
  total: number;
  segundos: number;
  en: string;
}

interface Semana {
  id: string;
  nombre: string;
  tipo: Jugador["tipo"];
  partidas: Partida[];
  mejores: Record<string, number>;
  total: number;
  actualizado?: string;
  avatar?: Avatar;
}

// Catálogo del servidor: solo estos juegos suman puntos, con su tope por partida.
export const CATALOGO: Record<string, { categoria: string; titulo: string; max: number }> = {
  "en-vocab": { categoria: "ingles", titulo: "Vocabulario contra reloj", max: 2000 },
  "en-spelling": { categoria: "ingles", titulo: "Spelling bee", max: 1500 },
  "en-frases": { categoria: "ingles", titulo: "Completa la frase", max: 2000 },
  "en-memorama": { categoria: "ingles", titulo: "Memorama inglés–español", max: 1000 },
  "en-ordena": { categoria: "ingles", titulo: "Ordena la oración (inglés)", max: 1000 },
  "en-preguntas": { categoria: "ingles", titulo: "Responde en inglés", max: 2000 },
  "es-ortografia": { categoria: "espanol", titulo: "Ortografía", max: 2000 },
  "es-acentos": { categoria: "espanol", titulo: "Acentos", max: 2000 },
  "es-sinonimos": { categoria: "espanol", titulo: "Sinónimos y antónimos", max: 2000 },
  "es-ordena": { categoria: "espanol", titulo: "Ordena la oración", max: 1000 },
  "cultura": { categoria: "cultura", titulo: "Maratón de cultura", max: 3000 },
  "mente-calculo": { categoria: "mente", titulo: "Cálculo mental", max: 2000 },
  "mente-secuencias": { categoria: "mente", titulo: "Secuencias", max: 2000 },
  "mente-simon": { categoria: "mente", titulo: "Simón dice", max: 1500 },
  "mente-sopa": { categoria: "mente", titulo: "Sopa de letras", max: 1500 },
  "basta-es": { categoria: "clasicos", titulo: "Basta", max: 1500 },
  "basta-en": { categoria: "clasicos", titulo: "Basta en inglés", max: 1500 },
  "una": { categoria: "clasicos", titulo: "¡Una!", max: 1000 },
  "loteria": { categoria: "clasicos", titulo: "Lotería", max: 1000 },
};

const LIMITE_DIARIO = 100;
const MAX_PARTIDAS_GUARDADAS = 300;
const MAX_INVITADOS = 500;
const RUTA_INVITADOS = "juegos/invitados.json";
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APODO = /^[\p{L}\p{N} ]{2,20}$/u;

// Lunes (AAAA-MM-DD) de la semana de una fecha.
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

async function hash10(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 10);
}

export async function resolverJugador(email: string, admin: string, ingles: FilaConUsuarios[], secundaria: FilaConUsuarios[], invitados: Invitados): Promise<Jugador | null> {
  if (admin && email === admin) return { id: "admin", nombre: "Profe", tipo: "admin" };
  const alumno = ingles.find((r) => r.userEmails.includes(email) && r.alumno)?.alumno;
  if (alumno) return { id: `a-${slugAlumno(alumno)}`, nombre: alumno, tipo: "alumno" };
  const sec = secundaria.find((r) => r.userEmails.includes(email));
  if (sec) {
    const nombre = sec.userNames[0]?.trim().split(/\s+/)[0] || "Alumno";
    return { id: `s-${slugAlumno(nombre)}`, nombre, tipo: "alumno" };
  }
  const inv = invitados[email];
  if (inv) return { id: `i-${await hash10(email)}`, nombre: inv.nombre, tipo: "invitado" };
  return null;
}

export interface DepsJuegos {
  store: Store;
  admin: string;
  filasIngles(): Promise<FilaConUsuarios[]>;
  filasSecundaria(): Promise<FilaConUsuarios[]>;
  hoy?: () => string; // AAAA-MM-DD en CDMX (inyectable en pruebas)
  ahora?: () => string; // ISO
}

const cache = new Map<string, { t: number; v: unknown }>();
const cacheJugadores = new Map<string, { t: number; j: Jugador; invitados: Invitados }>();
export function clearCacheJuegos() {
  cache.clear();
  cacheJugadores.clear();
}

async function leerSemana(store: Store, lunes: string): Promise<Semana[]> {
  const c = cache.get(lunes);
  if (c && Date.now() - c.t < 30_000) return c.v as Semana[];
  const nombres = (await store.list(`juegos/semanas/${lunes}`)).filter((n) => n.endsWith(".json"));
  const docs = (await Promise.all(nombres.map((n) => store.get<Semana>(`juegos/semanas/${lunes}/${n}`)))).map((d) => d!.data);
  cache.set(lunes, { t: Date.now(), v: docs });
  return docs;
}

function ordenar(docs: Semana[]) {
  return [...docs].sort((a, b) => b.total - a.total || (a.actualizado || "").localeCompare(b.actualizado || ""));
}

function posicionDe(docs: Semana[], id: string): number | null {
  const i = ordenar(docs).findIndex((d) => d.id === id);
  return i === -1 ? null : i + 1;
}

export async function handleJuegos(req: Request, sub: string, correo: string, deps: DepsJuegos, json: Json): Promise<Response> {
  const email = (correo || "").trim().toLowerCase();
  if (!email) return json({ error: "missing_email" }, 400);
  const hoy = deps.hoy ? deps.hoy() : mxToday();
  const ahora = deps.ahora ? deps.ahora() : new Date().toISOString();
  const store = deps.store;
  // Identidad en caché 60 s: las partidas sondean cada pocos segundos y no deben golpear Notion cada vez.
  const memo = cacheJugadores.get(email);
  if (sub !== "/invitado" && sub !== "/invitados" && memo && Date.now() - memo.t < 60_000) return await rutasDeJugador(req, sub, memo.j, deps, hoy, ahora, json, memo.invitados);
  const invDoc = await store.get<Invitados>(RUTA_INVITADOS);
  const invitados = invDoc?.data ?? {};
  const [ingles, secundaria] = await Promise.all([deps.filasIngles(), deps.filasSecundaria()]);

  // POST /juegos/invitado → registro o entrada de invitado
  if (sub === "/invitado" && req.method === "POST") {
    let body: { nombre?: unknown; acepto?: unknown } = {};
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    if (!CORREO.test(email)) return json({ error: "correo_invalido" }, 400);
    const conocido = await resolverJugador(email, deps.admin, ingles, secundaria, {});
    if (conocido) return json({ ya: true, jugador: conocido });
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
    if (body.acepto !== true) return json({ error: "debe_aceptar" }, 400);
    if (!APODO.test(nombre)) return json({ error: "apodo_invalido" }, 400);
    for (let i = 0; i < 3; i++) {
      const doc = i === 0 ? invDoc : await store.get<Invitados>(RUTA_INVITADOS);
      const reg: Invitados = { ...(doc?.data ?? {}) };
      const previo = reg[email];
      if (!previo && Object.keys(reg).length >= MAX_INVITADOS) return json({ error: "cupo_lleno" }, 429);
      reg[email] = previo
        ? { ...previo, nombre, ultimaVisita: ahora, visitas: previo.visitas + 1 }
        : { nombre, registradoEn: ahora, ultimaVisita: ahora, visitas: 1 };
      if (await store.put(RUTA_INVITADOS, reg, doc?.sha ?? null, `juegos: invitado ${previo ? "regresa" : "nuevo"}`)) {
        return json({ ya: false, jugador: await resolverJugador(email, deps.admin, ingles, secundaria, reg) });
      }
    }
    return json({ error: "conflicto_escritura" }, 503);
  }

  const base = await resolverJugador(email, deps.admin, ingles, secundaria, invitados);
  if (!base) return json({ error: "no_registrado" }, 403);
  const jugador: Jugador = { ...base, avatar: (await store.get<Avatar>(rutaPerfil(base.id)))?.data ?? avatarPorDefecto(base.id) };
  cacheJugadores.set(email, { t: Date.now(), j: jugador, invitados });
  return await rutasDeJugador(req, sub, jugador, deps, hoy, ahora, json, invitados);
}

async function rutasDeJugador(req: Request, sub: string, jugador: Jugador, deps: DepsJuegos, hoy: string, ahora: string, json: Json, invitados: Invitados): Promise<Response> {
  const store = deps.store;
  const lunes = lunesDe(hoy);

  // POST /juegos/avatar → cambiar personaje y color (solo de la lista)
  if (sub === "/avatar" && req.method === "POST") {
    let body: { emoji?: unknown; color?: unknown } = {};
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    if (!AVATARES.includes(String(body.emoji)) || !COLORES.includes(String(body.color))) return json({ error: "avatar_invalido" }, 400);
    const avatar: Avatar = { emoji: String(body.emoji), color: String(body.color) };
    for (let i = 0; i < 3; i++) {
      const doc = await store.get<Avatar>(rutaPerfil(jugador.id));
      if (await store.put(rutaPerfil(jugador.id), avatar, doc?.sha ?? null, `juegos: avatar de ${jugador.nombre}`)) break;
    }
    jugador.avatar = avatar;
    for (const [k, m] of cacheJugadores) if (m.j.id === jugador.id) cacheJugadores.set(k, { ...m, j: { ...m.j, avatar } });
    // Que el ranking lo muestre ya: actualizar la semana si existe.
    const ruta = `juegos/semanas/${lunes}/${jugador.id}.json`;
    for (let i = 0; i < 3; i++) {
      const doc = await store.get<Semana>(ruta);
      if (!doc || await store.put(ruta, { ...doc.data, avatar }, doc.sha, `juegos: avatar de ${jugador.nombre}`)) break;
    }
    cache.delete(lunes);
    return json({ ok: true, avatar });
  }

  // /juegos/sala… → partidas multijugador (server/salas.ts)
  if (sub === "/sala" || sub.startsWith("/sala/")) return await handleSalas(req, sub.slice("/sala".length), jugador, store, ahora, json, lunes);

  // GET /juegos/admin/resumen → jugadores y partidas de la semana (solo admin, sin correos)
  if (sub === "/admin/resumen" && req.method === "GET") {
    if (jugador.tipo !== "admin") return json({ error: "solo_admin" }, 403);
    const semana = new URL(req.url).searchParams.get("semana") || lunes;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return json({ error: "semana_invalida" }, 400);
    const l = lunesDe(semana);
    const docs = ordenar(await leerSemana(store, l));
    const jugadores = docs.map((d) => ({ nombre: d.nombre, tipo: d.tipo, total: d.total, mejores: d.mejores, partidas: d.partidas.length, ultima: d.partidas.at(-1)?.en ?? null, avatar: d.avatar ?? avatarPorDefecto(d.id) }));
    const catalogo = Object.fromEntries(Object.entries(CATALOGO).map(([id, d]) => [id, d.titulo]));
    return json({ semana: l, jugadores, salas: await resumenSalas(store, l), catalogo });
  }

  // POST /juegos/partida → guardar puntos (con tope) y actualizar el mejor por juego
  if (sub === "/partida" && req.method === "POST") {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { return json({ error: "json_invalido" }, 400); }
    const juego = String(body.juego || "");
    const def = CATALOGO[juego];
    if (!def) return json({ error: "juego_invalido" }, 400);
    if (typeof body.puntos !== "number" || !Number.isFinite(body.puntos)) return json({ error: "puntos_invalidos" }, 400);
    const entero = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
    const nueva: Partida = {
      juego, puntos: entero(body.puntos, def.max), aciertos: entero(body.aciertos, 1000), total: entero(body.total, 1000),
      segundos: entero(body.segundos, 36000), en: ahora,
    };
    const ruta = `juegos/semanas/${lunes}/${jugador.id}.json`;
    for (let i = 0; i < 3; i++) {
      const doc = await store.get<Semana>(ruta);
      const s: Semana = doc?.data ?? { id: jugador.id, nombre: jugador.nombre, tipo: jugador.tipo, partidas: [], mejores: {}, total: 0 };
      if (s.partidas.filter((p) => p.en.slice(0, 10) === ahora.slice(0, 10)).length >= LIMITE_DIARIO) return json({ error: "limite_diario" }, 429);
      const anterior = s.mejores[juego] ?? 0;
      const nuevoRecord = nueva.puntos > anterior;
      s.nombre = jugador.nombre;
      s.avatar = jugador.avatar;
      s.partidas = [...s.partidas, nueva].slice(-MAX_PARTIDAS_GUARDADAS);
      s.mejores = { ...s.mejores, [juego]: Math.max(anterior, nueva.puntos) };
      s.total = Object.values(s.mejores).reduce((a, b) => a + b, 0);
      s.actualizado = ahora;
      if (await store.put(ruta, s, doc?.sha ?? null, `juegos: ${jugador.nombre} ${juego} ${nueva.puntos}`)) {
        cache.delete(lunes);
        const docs = await leerSemana(store, lunes);
        return json({ guardado: true, puntos: nueva.puntos, mejor: s.mejores[juego], nuevoRecord, total: s.total, pos: posicionDe(docs, jugador.id), semana: lunes });
      }
    }
    return json({ error: "conflicto_escritura" }, 503);
  }

  // GET /juegos/ranking → top 20 de la semana y la posición propia
  if (sub === "/ranking" && req.method === "GET") {
    const semana = new URL(req.url).searchParams.get("semana") || lunes;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return json({ error: "semana_invalida" }, 400);
    const docs = ordenar(await leerSemana(store, lunesDe(semana)));
    const top = docs.slice(0, 20).map((d, i) => ({ pos: i + 1, nombre: d.nombre, tipo: d.tipo, total: d.total, juegos: Object.keys(d.mejores).length, yo: d.id === jugador.id, avatar: d.avatar ?? avatarPorDefecto(d.id) }));
    const mio = docs.find((d) => d.id === jugador.id);
    return json({ semana: lunesDe(semana), top, jugadores: docs.length, yo: { pos: posicionDe(docs, jugador.id), total: mio?.total ?? 0, mejores: mio?.mejores ?? {} } });
  }

  // GET /juegos/yo → jugador, mejores de la semana y catálogo
  if (sub === "/yo" && req.method === "GET") {
    const docs = await leerSemana(store, lunes);
    const mio = docs.find((d) => d.id === jugador.id);
    const catalogo = Object.entries(CATALOGO).map(([id, d]) => ({ id, ...d }));
    return json({ jugador, semana: lunes, total: mio?.total ?? 0, mejores: mio?.mejores ?? {}, pos: posicionDe(docs, jugador.id), catalogo, avatares: { emojis: AVATARES, colores: COLORES } });
  }

  // GET /juegos/invitados → solo admin: lista para análisis (con correos)
  if (sub === "/invitados" && req.method === "GET") {
    if (jugador.tipo !== "admin") return json({ error: "solo_admin" }, 403);
    const docs = await leerSemana(store, lunes);
    const lista = await Promise.all(Object.entries(invitados).map(async ([correo, inv]) => {
      const id = `i-${await hash10(correo)}`;
      return { email: correo, ...inv, puntosSemana: docs.find((d) => d.id === id)?.total ?? 0 };
    }));
    lista.sort((a, b) => b.ultimaVisita.localeCompare(a.ultimaVisita));
    return json({ semana: lunes, total: lista.length, invitados: lista });
  }

  return json({ error: "not_found" }, 404);
}
