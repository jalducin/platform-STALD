// Progreso individual de los juegos de Arcade (openspec: juegos-plataformas-karts; Dragon Run: dragon-run-misiones).
// GET/PUT /juegos/progreso/<juego> → juegos/progreso/<juego>/<id-jugador>.json = { v, datos, actualizado }, sin correos.
// Cada jugador lee y escribe solo el suyo (el id sale de la sesión). Escritura condicional: la versión `v` del cliente
// debe ser la guardada (409 version_vieja si no) y el put usa el sha leído (3 reintentos ante conflicto).
import type { Jugador } from "./juegos.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export const JUEGOS_PROGRESO = ["plataformas", "karts", "dragon-run", "golf", "futbol"] as const; // dragon-run: openspec dragon-run-misiones; golf; futbol: futbol-estelar
export const MAX_PROGRESO = 4096; // bytes de `datos` serializado

export interface DocProgreso {
  v: number;
  datos: unknown;
  actualizado: string;
}

const rutaProgreso = (juego: string, id: string) => `juegos/progreso/${juego}/${id}.json`;

// ---------- Validación de forma (exacta: sin llaves extra ni faltantes) ----------
type Obj = Record<string, unknown>;
const esObj = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);
const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const llaves = (o: Obj, permitidas: string[]) => {
  const k = Object.keys(o);
  return k.length === permitidas.length && permitidas.every((p) => k.includes(p));
};
const sinRepetir = (a: unknown[]) => new Set(a).size === a.length;

const NIVEL = /^(1[0-2]|[1-9])-[1-3]$/; // "mundo-nivel": 12 mundos de 3 niveles
const PODERES = ["base", "grande", "fuego"];

function validarPlataformas(d: unknown): boolean {
  if (!esObj(d) || !llaves(d, ["mundo", "nivel", "vidas", "monedas", "poder", "completados", "mejores", "enCurso"])) return false;
  if (!entero(d.mundo, 1, 12) || !entero(d.nivel, 1, 3) || !entero(d.vidas, 0, 99) || !entero(d.monedas, 0, 99)) return false;
  if (!PODERES.includes(String(d.poder))) return false;
  const c = d.completados;
  if (!Array.isArray(c) || c.length > 36 || !c.every((x) => typeof x === "string" && NIVEL.test(x)) || !sinRepetir(c)) return false;
  const m = d.mejores;
  if (!esObj(m) || Object.keys(m).length > 36 || !Object.entries(m).every(([k, v]) => NIVEL.test(k) && entero(v, 1, 999))) return false;
  const e = d.enCurso;
  if (e !== null && !(esObj(e) && llaves(e, ["nivel", "checkpoint"]) && typeof e.nivel === "string" && NIVEL.test(e.nivel) && typeof e.checkpoint === "boolean")) return false;
  return true;
}

export const PIEZAS_KART = ["chasis-ligero", "llantas-todoterreno", "pintura-dorada"];
export const COLORES_KART = ["rojo", "azul", "verde", "morado", "naranja", "rosa", "turquesa", "dorado"];
const COPA = /^[a-z]{2,12}$/;
const PISTA = /^[a-z][a-z-]{1,19}$/;

function validarKarts(d: unknown): boolean {
  if (!esObj(d) || !llaves(d, ["copas", "records", "piezas", "equipo", "copaEnCurso"])) return false;
  const copas = d.copas;
  if (!esObj(copas) || Object.keys(copas).length > 8) return false;
  for (const [k, v] of Object.entries(copas)) {
    if (!COPA.test(k) || !esObj(v) || !llaves(v, ["lugar", "puntos"]) || !entero(v.lugar, 1, 8) || !entero(v.puntos, 0, 60)) return false;
  }
  const rec = d.records;
  if (!esObj(rec) || Object.keys(rec).length > 32 || !Object.entries(rec).every(([k, v]) => PISTA.test(k) && entero(v, 10_000, 900_000))) return false;
  const piezas = d.piezas;
  if (!Array.isArray(piezas) || !piezas.every((p) => PIEZAS_KART.includes(String(p))) || !sinRepetir(piezas)) return false;
  const eq = d.equipo;
  if (!esObj(eq) || !llaves(eq, ["chasis", "llantas", "color"])) return false;
  if (!["estandar", "ligero"].includes(String(eq.chasis)) || !["estandar", "todoterreno"].includes(String(eq.llantas)) || !COLORES_KART.includes(String(eq.color))) return false;
  // Una pieza equipada debe estar desbloqueada.
  if (eq.chasis === "ligero" && !piezas.includes("chasis-ligero")) return false;
  if (eq.llantas === "todoterreno" && !piezas.includes("llantas-todoterreno")) return false;
  if (eq.color === "dorado" && !piezas.includes("pintura-dorada")) return false;
  const cc = d.copaEnCurso;
  if (cc !== null) {
    if (!esObj(cc) || !llaves(cc, ["copa", "carrera", "puntos", "dif"]) || !COPA.test(String(cc.copa)) || !entero(cc.carrera, 0, 3) || !entero(cc.dif, 80, 110)) return false;
    if (!Array.isArray(cc.puntos) || cc.puntos.length !== 8 || !cc.puntos.every((p) => entero(p, 0, 60))) return false;
  }
  return true;
}

// ---------- Dragon Run: misiones, logros y premios cosméticos (openspec: dragon-run-misiones) ----------
// Las mismas listas viven en juegos/dragon-misiones.js; server/dragon_misiones_test.ts comprueba que coincidan.
export const COLORES_DRAGON = ["verde", "azul", "morado", "rojo", "rosa", "dorado", "noche"];
export const ESTELAS_DRAGON = ["fuego", "estrellas", "burbujas", "hojas", "arcoiris"];
export const PREMIOS_DRAGON = [
  "color-azul", "color-morado", "color-rojo", "color-rosa", "color-dorado", "color-noche",
  "estela-estrellas", "estela-burbujas", "estela-hojas", "estela-arcoiris",
];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaReal = (x: unknown) => {
  if (typeof x !== "string" || !FECHA.test(x)) return false;
  const d = new Date(x + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
};
const TOPES_DRAGON: Record<string, number> = {
  metros: 10_000_000, monedas: 1_000_000, esquivados: 10_000_000, carreras: 1_000_000, castillos: 1_000_000, dobles: 10_000_000,
};

function validarDragon(d: unknown): boolean {
  if (!esObj(d) || !llaves(d, ["totales", "mejorRacha", "dias", "diaria", "cumplidas", "premios", "equipo"])) return false;
  const t = d.totales;
  if (!esObj(t) || !llaves(t, Object.keys(TOPES_DRAGON)) || !Object.entries(TOPES_DRAGON).every(([k, max]) => entero(t[k], 0, max))) return false;
  if (!entero(d.mejorRacha, 0, 999) || !entero(d.cumplidas, 0, 100_000)) return false;
  const dias = d.dias;
  if (!esObj(dias) || !llaves(dias, ["ultimo", "racha", "mejor"]) || !entero(dias.racha, 0, 3660) || !entero(dias.mejor, 0, 3660)) return false;
  if ((dias.racha as number) > (dias.mejor as number)) return false;
  if (dias.ultimo === null ? dias.racha !== 0 : !fechaReal(dias.ultimo)) return false;
  const di = d.diaria;
  if (di !== null) {
    if (!esObj(di) || !llaves(di, ["fecha", "avance"]) || !fechaReal(di.fecha)) return false;
    if (!Array.isArray(di.avance) || di.avance.length !== 3 || !di.avance.every((n) => entero(n, 0, 100_000))) return false;
  }
  const premios = d.premios;
  if (!Array.isArray(premios) || !premios.every((p) => PREMIOS_DRAGON.includes(String(p))) || !sinRepetir(premios)) return false;
  const eq = d.equipo;
  if (!esObj(eq) || !llaves(eq, ["color", "estela"]) || !COLORES_DRAGON.includes(String(eq.color)) || !ESTELAS_DRAGON.includes(String(eq.estela))) return false;
  // Lo equipado debe estar desbloqueado (verde y fuego son los de siempre).
  if (eq.color !== "verde" && !premios.includes("color-" + eq.color)) return false;
  if (eq.estela !== "fuego" && !premios.includes("estela-" + eq.estela)) return false;
  return true;
}

// ---------- Golf: mejor resultado y estrellas por hoyo (openspec: golf) ----------
const HOYO_GOLF = /^[1-9]$/;
const porHoyo = (x: unknown, min: number, max: number) => esObj(x) && Object.keys(x).length <= 9 && Object.entries(x).every(([k, v]) => HOYO_GOLF.test(k) && entero(v, min, max));
function validarGolf(d: unknown): boolean {
  if (!esObj(d) || !llaves(d, ["mejores", "estrellas", "recorridos", "mejorRecorrido"])) return false;
  if (!porHoyo(d.mejores, 1, 20) || !porHoyo(d.estrellas, 0, 3) || !entero(d.recorridos, 0, 100_000)) return false;
  return d.mejorRecorrido === null || entero(d.mejorRecorrido, 9, 200);
}

// ---------- Fútbol Estelar 2010: estadísticas, clasificatoria semanal, táctica y carrera (openspec: futbol-estelar) ----------
// Las mismas listas viven en juegos/futbol-motor.js y juegos/futbol-liga.js; server/futbol_test.ts comprueba que
// coincidan. Forma completa en docs/data-model.md.
export const FORMACIONES_FUTBOL = ["4-4-2", "4-3-3", "3-5-2", "5-3-2"];
export const CARTAS_FUTBOL = ["hueco", "lejano", "muro", "regate", "felino", "cabeza", "veloz", "pulmon"];
export const FORMAS_FUTBOL = ["escudo", "circulo", "diamante", "hexagono"];
export const SIMBOLOS_FUTBOL = ["estrella", "rayo", "corona", "balon", "montana", "ola", "sol", "llama", "ave", "arbol"];
export const PATRONES_FUTBOL = ["liso", "rayas", "aros", "mitades", "banda"];
const HEX = /^#[0-9a-f]{6}$/;
const TEXTO_CLUB = /^[\p{L}\p{N} .'-]{2,24}$/u; // nombre del club y del estadio (los escribe la persona; se escapan al pintar)
const SIGLAS = /^[A-ZÑ]{3}$/;
const SEMANA_ISO = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const ID_JUGADOR = /^(u(1?\d|2[0-3])-(1[0-5]|\d)|g\d{1,9})$/; // del universo (club-índice) o generado
const enteros = (o: Obj, ks: string[], min: number, max: number) => ks.every((k) => entero(o[k], min, max));

function statsFutbol(x: unknown): boolean {
  const ks = ["partidos", "ganados", "empatados", "perdidos", "gf", "gc", "copas"];
  return esObj(x) && llaves(x, ks) && enteros(x, ks, 0, 1_000_000);
}
function clasifFutbol(x: unknown): boolean {
  if (x === null) return true;
  return esObj(x) && llaves(x, ["semana", "mejor", "jugados"]) && typeof x.semana === "string" && SEMANA_ISO.test(x.semana) &&
    entero(x.mejor, 0, 1000) && entero(x.jugados, 0, 100_000);
}
function tacticaFutbol(x: unknown): boolean {
  const ks = ["linea", "ancho", "mentalidad", "presion"];
  return esObj(x) && llaves(x, ["formacion", ...ks]) && FORMACIONES_FUTBOL.includes(String(x.formacion)) && enteros(x, ks, 0, 100);
}
const textoClub = (x: unknown) => typeof x === "string" && TEXTO_CLUB.test(x) && x.trim().length >= 2;
function clubFutbol(x: unknown): boolean {
  if (!esObj(x) || !llaves(x, ["nombre", "corto", "escudo", "uniforme", "estadio"])) return false;
  if (!textoClub(x.nombre) || !textoClub(x.estadio) || typeof x.corto !== "string" || !SIGLAS.test(x.corto)) return false;
  const e = x.escudo, u = x.uniforme;
  return esObj(e) && llaves(e, ["forma", "c1", "c2", "simbolo"]) && FORMAS_FUTBOL.includes(String(e.forma)) && SIMBOLOS_FUTBOL.includes(String(e.simbolo)) &&
    HEX.test(String(e.c1)) && HEX.test(String(e.c2)) &&
    esObj(u) && llaves(u, ["c1", "c2", "patron"]) && PATRONES_FUTBOL.includes(String(u.patron)) && HEX.test(String(u.c1)) && HEX.test(String(u.c2));
}
// Tres divisiones de 8 clubes (0–23 del universo y 24 = tu club), sin repetir y con tu club en alguna.
function divisionesFutbol(x: unknown): boolean {
  if (!Array.isArray(x) || x.length !== 3) return false;
  if (!x.every((d) => Array.isArray(d) && d.length === 8 && d.every((c) => entero(c, 0, 24)))) return false;
  const todos = x.flat();
  return sinRepetir(todos) && todos.includes(24);
}
function plantillaFutbol(x: unknown): boolean {
  if (!Array.isArray(x) || x.length < 14 || x.length > 20) return false;
  const ok = x.every((e) => Array.isArray(e) && e.length === 3 && typeof e[0] === "string" && ID_JUGADOR.test(e[0]) && entero(e[1], -20, 20) &&
    (e[2] === null || CARTAS_FUTBOL.includes(String(e[2]))));
  return ok && sinRepetir(x.map((e) => e[0]));
}
function copaFutbol(x: unknown): boolean {
  return x === null || (esObj(x) && llaves(x, ["ronda", "viva"]) && entero(x.ronda, 0, 3) && typeof x.viva === "boolean");
}
function avanceCarrera(c: Obj): boolean {
  if (!entero(c.jornada, 0, 14) || !Array.isArray(c.resultados) || c.resultados.length !== c.jornada) return false;
  if (!c.resultados.every((r) => Array.isArray(r) && r.length === 2 && entero(r[0], 0, 20) && entero(r[1], 0, 20))) return false;
  const cartas = c.cartas, oj = c.ojeador, pal = c.palmares;
  if (!Array.isArray(cartas) || !cartas.every((k) => CARTAS_FUTBOL.includes(String(k))) || !sinRepetir(cartas)) return false;
  if (!Array.isArray(oj) || oj.length > 3 || !oj.every((k) => typeof k === "string" && /^g\d{1,9}$/.test(k)) || !sinRepetir(oj)) return false;
  return esObj(pal) && llaves(pal, ["ascensos", "ligas", "copas"]) && enteros(pal, ["ascensos", "ligas", "copas"], 0, 999);
}
function carreraFutbol(c: unknown): boolean {
  const ks = ["semilla", "club", "temporada", "divisiones", "jornada", "resultados", "dinero", "plantilla", "cartas", "ojeador", "ojeadas", "copa", "palmares"];
  if (!esObj(c) || !llaves(c, ks)) return false;
  if (!entero(c.semilla, 1, 2_147_483_647) || !entero(c.temporada, 1, 99) || !entero(c.dinero, 0, 9_999_999) || !entero(c.ojeadas, 0, 9999)) return false;
  return clubFutbol(c.club) && divisionesFutbol(c.divisiones) && plantillaFutbol(c.plantilla) && copaFutbol(c.copa) && avanceCarrera(c);
}
function validarFutbol(d: unknown): boolean {
  if (!esObj(d) || !llaves(d, ["stats", "clasif", "tactica", "carrera"])) return false;
  return statsFutbol(d.stats) && clasifFutbol(d.clasif) && tacticaFutbol(d.tactica) && (d.carrera === null || carreraFutbol(d.carrera));
}

export function validarProgreso(juego: string, datos: unknown): boolean {
  if (juego === "plataformas") return validarPlataformas(datos);
  if (juego === "karts") return validarKarts(datos);
  if (juego === "dragon-run") return validarDragon(datos);
  if (juego === "golf") return validarGolf(datos);
  if (juego === "futbol") return validarFutbol(datos);
  return false;
}

// sub: "/<juego>"
export async function handleProgreso(req: Request, sub: string, jugador: Jugador, store: Store, ahora: string, json: Json): Promise<Response> {
  const juego = sub.replace(/^\//, "");
  if (!(JUEGOS_PROGRESO as readonly string[]).includes(juego)) return json({ error: "juego_sin_progreso" }, 400);
  const ruta = rutaProgreso(juego, jugador.id);

  if (req.method === "GET") {
    const doc = await store.get<DocProgreso>(ruta);
    return json({ juego, v: doc?.data.v ?? 0, datos: doc?.data.datos ?? null, actualizado: doc?.data.actualizado ?? null });
  }

  if (req.method === "PUT") {
    let body: Obj;
    try { body = JSON.parse(await req.text()); } catch { return json({ error: "json_invalido" }, 400); }
    if (!esObj(body)) return json({ error: "json_invalido" }, 400);
    if (!entero(body.v, 0, Number.MAX_SAFE_INTEGER)) return json({ error: "version_invalida" }, 400);
    if (new TextEncoder().encode(JSON.stringify(body.datos ?? null)).length > MAX_PROGRESO) return json({ error: "progreso_grande" }, 413);
    if (!validarProgreso(juego, body.datos)) return json({ error: "progreso_invalido" }, 400);
    for (let i = 0; i < 3; i++) {
      const doc = await store.get<DocProgreso>(ruta);
      const actual = doc?.data.v ?? 0;
      if (actual !== body.v) return json({ error: "version_vieja", v: actual, datos: doc?.data.datos ?? null }, 409);
      const nuevo: DocProgreso = { v: actual + 1, datos: body.datos, actualizado: ahora };
      if (await store.put(ruta, nuevo, doc?.sha ?? null, `juegos: progreso de ${juego} (${jugador.id})`)) return json({ ok: true, v: nuevo.v, actualizado: ahora });
    }
    return json({ error: "conflicto_escritura" }, 503);
  }

  return json({ error: "metodo_no_permitido" }, 405);
}
