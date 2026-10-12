// Progreso individual de los juegos de Arcade (openspec: juegos-plataformas-karts; Dragon Run: dragon-run-misiones).
// GET/PUT /juegos/progreso/<juego> → juegos/progreso/<juego>/<id-jugador>.json = { v, datos, actualizado }, sin correos.
// Cada jugador lee y escribe solo el suyo (el id sale de la sesión). Escritura condicional: la versión `v` del cliente
// debe ser la guardada (409 version_vieja si no) y el put usa el sha leído (3 reintentos ante conflicto).
import type { Jugador } from "./juegos.ts";
import type { Store } from "./store.ts";

type Json = (body: unknown, status?: number) => Response;

export const JUEGOS_PROGRESO = ["plataformas", "karts", "dragon-run"] as const; // dragon-run: openspec dragon-run-misiones
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

export function validarProgreso(juego: string, datos: unknown): boolean {
  if (juego === "plataformas") return validarPlataformas(datos);
  if (juego === "karts") return validarKarts(datos);
  if (juego === "dragon-run") return validarDragon(datos);
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
