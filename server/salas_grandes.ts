// Juegos para salas grandes (openspec: juegos-salas-grandes): 🎱 Bingo, 🂡 Blackjack, 🎨 Dibuja y adivina, y 🃏 Memorama
// y 🔎 Sopa de letras en partida. server/salas.ts solo llama a estas funciones (ganchos `// juegos-salas-grandes`).
// Reglas del cliente: juegos/bingo.js, juegos/blackjack.js, juegos/dibuja.js y juegos/memo-sopa-sala.js.
import ingles from "../juegos/datos/ingles.json" with { type: "json" };

type Rec = Record<string, unknown>;
export interface SalaGrande {
  juego: string;
  opciones: Record<string, string>;
  seed: number;
  inicio: number | null;
  bots: boolean;
  secreto?: string; // Dibuja: de aquí sale la palabra de cada turno; nunca sale del servidor
}
export interface JugadorGrande {
  id: string;
  nombre: string;
  unido: number;
  bingo?: { t: number; n: number };
  bingoFalsos?: number;
  dibujo?: { turno: number; trazos: Trazo[]; t: number };
  aciertos?: Record<string, { t: number; pts: number }>;
  intentos?: { turno: number; texto?: string; casi?: true; t: number }[];
  resultado?: Resultado & { t: number };
}
export interface Trazo {
  c: number;
  g: number;
  p: number[];
}
export interface Resultado {
  ms: number | null;
  fin: boolean;
  errores?: number;
  pares?: number;
  encontradas?: number;
}
// Lo que salas.ts aplica al archivo del jugador y, opcional, lo que agrega a la respuesta. Una falla puede traer también
// un cambio que se guarda antes de responder el error (p. ej. contar un bingo falso).
export type Cambio<E> = { cambiar: (e: E) => E; respuesta?: Rec };
export type Falla<E> = { error: string; status: number; cambiar?: (e: E) => E };

export const JUEGOS_GRANDES = ["bingo", "blackjack", "dibuja", "en-memorama", "mente-sopa"];

const entero = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const llaves = (o: Rec, permitidas: string[], obligatorias: string[] = []) =>
  Object.keys(o).every((k) => permitidas.includes(k)) && obligatorias.every((k) => k in o);
const esObjeto = (x: unknown): x is Rec => !!x && typeof x === "object" && !Array.isArray(x);

// ---------- Azar con semilla: igual que rngDe de juegos.html y que juegos/bingo.js ----------
function fnv(s: string): number {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(a: number) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = (seed: number | string, etiqueta: string) => mulberry(fnv(seed + "|" + etiqueta));
function barajar<T>(a: T[], r: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const rango = (de: number, n: number) => Array.from({ length: n }, (_, i) => de + i);

// ---------- 🎱 Bingo ----------
const LINEAS_BINGO = [
  ...rango(0, 5).map((f) => rango(0, 5).map((c) => f * 5 + c)),
  ...rango(0, 5).map((c) => rango(0, 5).map((f) => f * 5 + c)),
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];
export const FIGURAS_BINGO = ["linea", "esquinas", "lleno"];
export const BINGO = {
  CANTO_MS: 4500, // el ritmo de la Lotería
  orden: (seed: number) => barajar(rango(1, 75), rng(seed, "bingo-orden")),
  // Cartón de 5×5 (índice = fila·5 + columna); columna c con números de c·15+1 a c·15+15; el centro (12) es libre (0).
  carton(seed: number, id: string): number[] {
    const r = rng(seed, "bingo-carton|" + id);
    const cols = rango(0, 5).map((c) => barajar(rango(c * 15 + 1, 15), r).slice(0, c === 2 ? 4 : 5));
    const t: number[] = [];
    for (let f = 0; f < 5; f++) for (let c = 0; c < 5; c++) t.push(c === 2 ? (f === 2 ? 0 : cols[2][f < 2 ? f : f - 1]) : cols[c][f]);
    return t;
  },
  cantadosA: (inicio: number, t: number) => t < inicio ? 0 : Math.min(75, Math.floor((t - inicio) / BINGO.CANTO_MS) + 1),
  cumple(carton: number[], cantados: Set<number>, figura: string): boolean {
    const ok = (i: number) => carton[i] === 0 || cantados.has(carton[i]);
    if (figura === "esquinas") return [0, 4, 20, 24].every(ok);
    if (figura === "lleno") return carton.every((_, i) => ok(i));
    return LINEAS_BINGO.some((l) => l.every(ok));
  },
};

// ---------- 🎨 Dibuja y adivina ----------
export const DIBUJA = {
  DIBUJO_MS: 60_000, PAUSA_MS: 5_000, // cupo y mínimo: MESAS de server/salas.ts
  TRAZO_CADA_MS: 300, INTENTO_CADA_MS: 700,
  MAX_POR_ENVIO: 6, MAX_PUNTOS: 64, MAX_TRAZOS: 200, MAX_NUMEROS: 8000, MAX_TEXTO: 40, MAX_INTENTOS: 20,
};
// Vocabulario de inglés de una o dos palabras en minúsculas (sin días ni meses).
export const PALABRAS_DIBUJA: { en: string; es: string; emoji: string }[] = (ingles as { vocabulario: { en: string; es: string; emoji: string; tema: string }[] })
  .vocabulario.filter((v) => /^[a-z]+( [a-z]+)?$/.test(v.en) && v.en.length >= 3 && v.en.length <= 14 && v.tema !== "dias-meses")
  .map(({ en, es, emoji }) => ({ en, es, emoji }));
export function palabraDibuja(secreto: string, turno: number) {
  const orden = barajar(rango(0, PALABRAS_DIBUJA.length), rng(secreto, "dibuja"));
  return PALABRAS_DIBUJA[orden[turno % orden.length]];
}
// Minúsculas, sin acentos, solo letras y espacios sencillos.
export const normalizarPalabra = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
const esLaPalabra = (texto: string, palabra: string) => { const n = normalizarPalabra(texto), w = normalizarPalabra(palabra); return n === w || n === w + "s" || n + "s" === w || n === w + "es"; };

export interface TurnoDibuja {
  i: number;
  dibuja: string;
  ini: number;
  finDibujo: number;
  fin: number;
}
// Calendario (igual que Dibuja.calendario en juegos/dibuja.js): cada persona dibuja una vez en orden de llegada; el turno
// dura DIBUJO_MS o termina cuando todas las demás adivinaron; luego PAUSA_MS y empieza el siguiente.
export function calendarioDibuja(inicio: number, ids: string[], acierto: (id: string, turno: number) => number | undefined): TurnoDibuja[] {
  const turnos: TurnoDibuja[] = [];
  let ini = inicio;
  ids.forEach((dibuja, i) => {
    const finDibujo = ini + DIBUJA.DIBUJO_MS;
    const ts = ids.filter((x) => x !== dibuja).map((x) => acierto(x, i));
    const todos = ts.every((t) => t !== undefined && t <= finDibujo);
    const fin = todos && ts.length ? Math.max(...ts as number[]) : finDibujo;
    turnos.push({ i, dibuja, ini, finDibujo, fin });
    ini = fin + DIBUJA.PAUSA_MS;
  });
  return turnos;
}
function calendarioDe(sala: SalaGrande, jugadores: JugadorGrande[]) {
  const ids = [...jugadores].sort((a, b) => a.unido - b.unido).map((j) => j.id);
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  return calendarioDibuja(sala.inicio!, ids, (id, turno) => porId.get(id)?.aciertos?.[turno]?.t);
}
// Turno en curso a la hora t: { turno, fase: dibujo | pausa } o null antes del inicio o al terminar.
function turnoEn(cal: TurnoDibuja[], t: number): { turno: TurnoDibuja; fase: "dibujo" | "pausa" } | null {
  for (const x of cal) {
    if (t < x.ini) return null;
    if (t < x.fin) return { turno: x, fase: "dibujo" };
    if (t < x.fin + DIBUJA.PAUSA_MS) return { turno: x, fase: "pausa" };
  }
  return null;
}
function validarTrazo(x: unknown): Trazo | null {
  if (!esObjeto(x) || !llaves(x, ["c", "g", "p"], ["c", "g", "p"]) || !entero(x.c, 0, 7) || !entero(x.g, 1, 3)) return null;
  const p = x.p;
  if (!Array.isArray(p) || p.length < 4 || p.length > DIBUJA.MAX_PUNTOS * 2 || p.length % 2 || !p.every((v) => entero(v, 0, 255))) return null;
  return { c: x.c as number, g: x.g as number, p: p as number[] };
}

// ---------- 🃏 Memorama y 🔎 Sopa de letras en sala ----------
export const LIMITES_RESULTADO: Record<string, { minMs: number; limiteMs: number }> = {
  "en-memorama": { minMs: 8_000, limiteMs: 180_000 },
  "mente-sopa": { minMs: 5_000, limiteMs: 180_000 },
};
const ADELANTO_MS = 3_000, ATRASO_MS = 20_000; // como las carreras de Arcade (server/carreras.ts)
const PARES_MEMO = 8, PALABRAS_SOPA = 6; // igual que MemoSopaSala en juegos/memo-sopa-sala.js
function validarResultado(juego: string, x: unknown, inicio: number, ahora: number): Resultado | null {
  const lim = LIMITES_RESULTADO[juego];
  if (!esObjeto(x) || typeof x.fin !== "boolean") return null;
  const ms = x.ms;
  // El mínimo solo vale para terminar (el avance de la sopa puede llegar en los primeros segundos).
  if (ms !== null && !entero(ms, x.fin === true ? lim.minMs : 0, lim.limiteMs)) return null;
  if (ms !== null) { const pasado = ahora - inicio; if ((ms as number) > pasado + ADELANTO_MS || (ms as number) < pasado - ATRASO_MS) return null; }
  if (juego === "en-memorama") {
    if (!llaves(x, ["ms", "fin", "errores", "pares"], ["ms", "fin", "errores", "pares"]) || x.fin !== true || !entero(x.errores, 0, 500) || !entero(x.pares, 0, PARES_MEMO)) return null;
    if (ms !== null && x.pares !== PARES_MEMO) return null;
    return { ms: ms as number | null, fin: true, errores: x.errores as number, pares: x.pares as number };
  }
  if (!llaves(x, ["ms", "fin", "encontradas"], ["ms", "fin", "encontradas"]) || !entero(x.encontradas, 0, PALABRAS_SOPA)) return null;
  if (!x.fin && ms === null) return null; // el avance trae la hora de la última palabra
  if (x.fin && (ms === null) !== (x.encontradas !== PALABRAS_SOPA)) return null; // terminar con todas lleva tiempo; sin todas, no
  return { ms: ms as number | null, fin: x.fin as boolean, encontradas: x.encontradas as number };
}

// ---------- Ganchos de server/salas.ts ----------
// Opciones al crear la sala; devuelve un error o null.
export function opcionesGrandes(juego: string, op: Rec, opciones: Record<string, string>): string | null {
  if (juego === "bingo") {
    if (op.figura !== undefined && !FIGURAS_BINGO.includes(String(op.figura))) return "figura_invalida";
    opciones.figura = op.figura === undefined ? "linea" : String(op.figura);
  }
  if (juego === "en-memorama") {
    if (op.gana !== undefined && op.gana !== "tiempo" && op.gana !== "errores") return "criterio_invalido";
    opciones.gana = op.gana === undefined ? "tiempo" : String(op.gana);
  }
  return null;
}
// Campos extra de la sala al empezar (el secreto de Dibuja; también en la revancha).
export const alEmpezarGrande = (sala: SalaGrande, aleatorioHex: () => string): Partial<SalaGrande> => sala.juego === "dibuja" ? { secreto: aleatorioHex() } : {};

// Jugada por pasos del Blackjack (como el póker: `monto` entero, múltiplo de la ficha de 5 y obligatorio al apostar).
const ACCIONES_BLACKJACK = ["apostar", "pedir", "plantarse", "doblar"];
const FICHA = 5;
export function validarJugadaBlackjack(j: Rec, base: { n: number; accion: string }): (typeof base & { monto?: number }) | null {
  if (!ACCIONES_BLACKJACK.includes(base.accion) || !llaves(j, ["n", "accion", "monto"])) return null;
  if (base.accion !== "apostar") return j.monto === undefined ? base : null;
  return entero(j.monto, FICHA, 1_000_000) && (j.monto as number) % FICHA === 0 ? { ...base, monto: j.monto as number } : null;
}

// Respuesta propia de estos juegos (bingo, trazo, adivina o resultado); null si el cuerpo no es de ellos.
export function respuestaGrande<E extends JugadorGrande>(sala: SalaGrande, jugadores: E[], yo: string, body: Rec, ahora: number): Cambio<E> | Falla<E> | null {
  const inicio = sala.inicio!;
  const mio = jugadores.find((x) => x.id === yo);
  if (sala.juego === "bingo" && body.bingo === true) {
    if (ahora < inicio) return { error: "no_empezo", status: 409 };
    if (mio?.bingo) return { cambiar: (e) => e };
    const n = BINGO.cantadosA(inicio, ahora);
    if (!BINGO.cumple(BINGO.carton(sala.seed, yo), new Set(BINGO.orden(sala.seed).slice(0, n)), sala.opciones.figura || "linea")) {
      return { error: "bingo_falso", status: 409, cambiar: (e) => ({ ...e, bingoFalsos: Math.min(99, (e.bingoFalsos ?? 0) + 1) }) };
    }
    return { cambiar: (e) => e.bingo ? e : { ...e, bingo: { t: ahora, n } } };
  }
  if (sala.juego === "dibuja" && (body.trazo !== undefined || body.adivina !== undefined)) {
    const cal = calendarioDe(sala, jugadores);
    const ahoraTurno = turnoEn(cal, ahora);
    if (body.trazo !== undefined) {
      const t = body.trazo;
      if (!esObjeto(t) || !llaves(t, ["turno", "nuevos", "borrar"], ["turno"]) || !entero(t.turno, 0, 20)) return { error: "trazo_invalido", status: 400 };
      const borrar = t.borrar === true;
      const nuevos = Array.isArray(t.nuevos) ? t.nuevos.map(validarTrazo) : null;
      if ((t.borrar !== undefined && !borrar) || (!borrar && (!nuevos || !nuevos.length || nuevos.length > DIBUJA.MAX_POR_ENVIO || nuevos.some((x) => !x)))) return { error: "trazo_invalido", status: 400 };
      if (!ahoraTurno || ahoraTurno.fase !== "dibujo" || ahoraTurno.turno.i !== t.turno) return { error: "turno_cerrado", status: 409 };
      if (ahoraTurno.turno.dibuja !== yo) return { error: "no_dibujas", status: 409 };
      const previo = mio?.dibujo?.turno === t.turno ? mio.dibujo : null;
      if (previo && ahora - previo.t < DIBUJA.TRAZO_CADA_MS) return { error: "muy_rapido", status: 429 };
      const lista = borrar ? [] : [...(previo?.trazos ?? []), ...nuevos as Trazo[]];
      if (lista.length > DIBUJA.MAX_TRAZOS || lista.reduce((a, x) => a + x.p.length, 0) > DIBUJA.MAX_NUMEROS) return { error: "dibujo_lleno", status: 413 };
      const turno = t.turno as number;
      return { cambiar: (e) => ({ ...e, dibujo: { turno, trazos: lista, t: ahora } }) };
    }
    const a = body.adivina;
    if (!esObjeto(a) || !llaves(a, ["turno", "texto"], ["turno", "texto"]) || !entero(a.turno, 0, 20) || typeof a.texto !== "string" || a.texto.length > DIBUJA.MAX_TEXTO || !a.texto.trim()) {
      return { error: "adivina_invalida", status: 400 };
    }
    if (!ahoraTurno || ahoraTurno.fase !== "dibujo" || ahoraTurno.turno.i !== a.turno) return { error: "turno_cerrado", status: 409 };
    if (ahoraTurno.turno.dibuja === yo) return { error: "eres_quien_dibuja", status: 409 };
    const turno = a.turno as number;
    if (mio?.aciertos?.[turno]) return { error: "ya_adivinaste", status: 409 };
    const ultimo = Math.max(0, ...(mio?.intentos ?? []).map((x) => x.t));
    if (ahora - ultimo < DIBUJA.INTENTO_CADA_MS) return { error: "muy_rapido", status: 429 };
    const palabra = palabraDibuja(sala.secreto!, turno).en;
    if (esLaPalabra(a.texto, palabra)) {
      const pts = 100 + Math.round(100 * Math.max(0, 1 - (ahora - ahoraTurno.turno.ini) / DIBUJA.DIBUJO_MS));
      return { cambiar: (e) => e.aciertos?.[turno] ? e : { ...e, aciertos: { ...(e.aciertos ?? {}), [turno]: { t: ahora, pts } } }, respuesta: { correcta: true, pts } };
    }
    const casi = normalizarPalabra(a.texto).includes(normalizarPalabra(palabra));
    const intento = casi ? { turno, casi: true as const, t: ahora } : { turno, texto: a.texto.trim().replace(/\s+/g, " ").slice(0, 30), t: ahora };
    return { cambiar: (e) => ({ ...e, intentos: [...(e.intentos ?? []), intento].slice(-DIBUJA.MAX_INTENTOS) }), respuesta: { correcta: false, ...(casi ? { casi: true } : {}) } };
  }
  if (LIMITES_RESULTADO[sala.juego] && body.resultado !== undefined) {
    const r = validarResultado(sala.juego, body.resultado, inicio, ahora);
    if (!r) return { error: "resultado_invalido", status: 400 };
    return {
      cambiar: (e) => {
        const previo = e.resultado;
        if (previo?.fin) return e; // tras el final no cambia
        if (previo && !r.fin && (r.encontradas ?? 0) < (previo.encontradas ?? 0)) return e; // el avance no baja
        return { ...e, resultado: { ...r, t: ahora } };
      },
    };
  }
  return null;
}

// Extra del GET de la sala. Dibuja: turno y fase; la palabra solo para quien dibuja; las de turnos ya terminados.
export function vistaGrande(sala: SalaGrande, jugadores: JugadorGrande[], yo: string, ahora: number): Rec {
  if (sala.juego !== "dibuja" || sala.inicio === null || !sala.secreto) return {};
  const cal = calendarioDe(sala, jugadores);
  const actual = turnoEn(cal, ahora);
  const reveladas = cal.filter((x) => ahora >= x.fin).map((x) => ({ turno: x.i, ...renombrar(palabraDibuja(sala.secreto!, x.i)) }));
  if (!actual) return { dibuja: { turno: null, fase: ahora < sala.inicio ? "espera" : "fin", reveladas } };
  const p = palabraDibuja(sala.secreto, actual.turno.i);
  const mia = actual.turno.dibuja === yo && actual.fase === "dibujo";
  return {
    dibuja: {
      turno: actual.turno.i, fase: actual.fase, letras: p.en.replace(/ /g, "").length, forma: p.en.split(" ").map((w) => w.length),
      ...(mia ? renombrar(p) : {}), reveladas,
    },
  };
}
const renombrar = (p: { en: string; es: string; emoji: string }) => ({ palabra: p.en, es: p.es, emoji: p.emoji });
