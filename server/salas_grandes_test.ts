// Juegos para salas grandes (openspec: juegos-salas-grandes): Bingo, Blackjack, Dibuja y adivina, y Memorama y Sopa
// de letras en partida. Sin red: MemoryStore y un fetch falso para Realtime.
// deno-lint-ignore-file no-explicit-any require-await
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/bingo.js";
import "../juegos/mesas.js";
import "../juegos/blackjack.js";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { clearCacheSalas, enMesa, JUEGOS_PARTIDA } from "./salas.ts";
import { BINGO, calendarioDibuja, DIBUJA, normalizarPalabra, PALABRAS_DIBUJA, palabraDibuja } from "./salas_grandes.ts";
import { MemoryStore } from "./store.ts";

const B = (globalThis as any).Bingo;
const Mesas = (globalThis as any).Mesas;
const BJ = (globalThis as any).Blackjack;
const PERSONAS = ["marisol", "angel", "laura", "jesus", "fernando", "sofy", "rocio", "beto", "ana", "luis", "toño", "lupe", "nico"];
const ingles = PERSONAS.map((n) => ({ alumno: n[0].toUpperCase() + n.slice(1), userEmails: [`${n}@example.com`], userNames: [n] }));
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const correo = (n: string) => `${n}@example.com`;

function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const enviados: any[] = [];
  const fetchFalso = (async (_url: string | URL | Request, init?: RequestInit) => {
    enviados.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  let t = Date.parse("2026-10-07T18:00:00.000Z");
  const deps: any = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]),
    hoy: () => "2026-10-07", ahora: () => new Date(t).toISOString(),
    realtime: { url: "https://proj.supabase.co", publica: "sb_publishable_x", servicio: "sb_secret_y", fetch: fetchFalso },
  };
  const call = async (method: string, sub: string, quien: string, body?: unknown) => {
    clearCacheSalas();
    const email = quien.includes("@") ? quien : correo(quien);
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  const sala = async (codigo: string) => (await store.get<any>(`juegos/salas/${codigo}/sala.json`))!.data;
  const jugador = async (codigo: string, id: string) => (await store.get<any>(`juegos/salas/${codigo}/${id}.json`))?.data;
  return { store, call, enviados, sala, jugador, ahora: () => t, avanzar: (ms: number) => { t += ms; }, ir: (ms: number) => { t = ms; } };
}
type Ctx = ReturnType<typeof ctx>;

// Crea una sala, mete a las personas y (opcional) la empieza. Devuelve el código.
async function abrir(c: Ctx, juego: string, quienes: string[], opciones: Record<string, unknown> = {}, bots = true, empezar = true) {
  const r = await c.call("POST", "/sala", quienes[0], { juego, opciones, bots });
  assertEquals(r.status, 200, juego + " " + JSON.stringify(r.body));
  for (const q of quienes.slice(1)) assertEquals((await c.call("POST", `/sala/${r.body.codigo}/unirse`, q)).status, 200, q);
  if (empezar) assertEquals((await c.call("POST", `/sala/${r.body.codigo}/empezar`, quienes[0])).status, 200);
  return r.body.codigo as string;
}
const responder = (c: Ctx, codigo: string, quien: string, body: unknown) => c.call("POST", `/sala/${codigo}/respuesta`, quien, body);

// ---------------------------------------------------------------- Bingo
Deno.test("bingo: canto y cartón deterministas, iguales en el servidor y en juegos/bingo.js", () => {
  for (const seed of [1, 77, 123456789, 2147483646]) {
    const o = BINGO.orden(seed);
    assertEquals([...o].sort((a, b) => a - b), Array.from({ length: 75 }, (_, i) => i + 1), "permutación de 1 a 75");
    assertEquals(o, BINGO.orden(seed), "misma semilla, mismo canto");
    assertEquals(o, B.orden(seed), "paridad con la página");
    for (const id of ["a-marisol", "i-0123456789", "bot-vachira"]) {
      const t = BINGO.carton(seed, id);
      assertEquals(t, B.carton(seed, id), "paridad del cartón " + id);
      assertEquals([t.length, t[12]], [25, 0], "25 casillas y la libre al centro");
      for (let i = 0; i < 25; i++) if (i !== 12) { const col = i % 5; assert(t[i] >= col * 15 + 1 && t[i] <= col * 15 + 15, `columna ${col}: ${t[i]}`); }
      assertEquals(new Set(t).size, 25, "sin repetidos");
    }
  }
  assert(JSON.stringify(BINGO.orden(1)) !== JSON.stringify(BINGO.orden(2)), "otra semilla, otro canto");
  assert(JSON.stringify(BINGO.carton(5, "a")) !== JSON.stringify(BINGO.carton(5, "b")), "otro jugador, otro cartón");
  assertEquals([BINGO.cantadosA(1000, 999), BINGO.cantadosA(1000, 1000), BINGO.cantadosA(1000, 1000 + 4499), BINGO.cantadosA(1000, 1000 + 4500), BINGO.cantadosA(1000, 1e9)], [0, 1, 1, 2, 75]);
});

Deno.test("bingo: figuras línea, esquinas y lleno (la libre cuenta)", () => {
  const t = BINGO.carton(42, "x");
  const con = (idx: number[]) => new Set(idx.map((i) => t[i]));
  assertEquals(BINGO.cumple(t, con([10, 11, 13, 14]), "linea"), true, "fila del centro con la libre");
  assertEquals(BINGO.cumple(t, con([2, 7, 17, 22]), "linea"), true, "columna N con la libre");
  assertEquals(BINGO.cumple(t, con([0, 6, 18, 24]), "linea"), true, "diagonal");
  assertEquals(BINGO.cumple(t, con([0, 1, 2, 3]), "linea"), false);
  assertEquals(BINGO.cumple(t, con([0, 4, 20, 24]), "esquinas"), true);
  assertEquals(BINGO.cumple(t, con([0, 4, 20]), "esquinas"), false);
  assertEquals(BINGO.cumple(t, con([...Array(25).keys()].filter((i) => i !== 3)), "lleno"), false);
  assertEquals(BINGO.cumple(t, con([...Array(25).keys()]), "lleno"), true);
  for (const f of ["linea", "esquinas", "lleno"]) assertEquals(B.cumple(t, con([0, 4, 20, 24]), f), BINGO.cumple(t, con([0, 4, 20, 24]), f), "paridad " + f);
});

Deno.test("bingo: figura al crear (por omisión línea; inválida 400) y hasta 30 personas", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol", { juego: "bingo", opciones: {}, bots: true });
  assertEquals([r.status, r.body.sala.opciones.figura], [200, "linea"]);
  const e = await c.call("POST", "/sala", "marisol", { juego: "bingo", opciones: { figura: "esquinas" }, bots: true });
  assertEquals(e.body.sala.opciones.figura, "esquinas");
  assertEquals((await c.call("POST", "/sala", "marisol", { juego: "bingo", opciones: { figura: "estrella" } })).body.error, "figura_invalida");
  assert(JUEGOS_PARTIDA.has("bingo"));
});

Deno.test("bingo: el servidor valida el bingo (falso 409; verdadero se guarda una vez)", async () => {
  const c = ctx();
  const codigo = await abrir(c, "bingo", ["marisol", "angel"], { figura: "linea" });
  const s = await c.sala(codigo);
  assertEquals((await responder(c, codigo, "angel", { bingo: true })).status, 409, "antes de empezar: no_empezo o falso");
  c.ir(s.inicio + 100); // sale el primer número
  const falso = await responder(c, codigo, "angel", { bingo: true });
  assertEquals([falso.status, falso.body.error], [409, "bingo_falso"]);
  const angel = await c.jugador(codigo, "a-angel");
  assertEquals([angel.bingo, angel.bingoFalsos], [undefined, 1]);
  // ¿Con cuántos números completa línea el cartón de Marisol?
  const carton = BINGO.carton(s.seed, "a-marisol"), orden = BINGO.orden(s.seed);
  let k = 1;
  while (!BINGO.cumple(carton, new Set(orden.slice(0, k)), "linea")) k++;
  if (k > 1) {
    c.ir(s.inicio + (k - 2) * BINGO.CANTO_MS + 10); // un número antes
    assertEquals((await responder(c, codigo, "marisol", { bingo: true })).body.error, "bingo_falso", "un número antes todavía no");
  }
  c.ir(s.inicio + (k - 1) * BINGO.CANTO_MS + 10);
  const ok = await responder(c, codigo, "marisol", { bingo: true });
  assertEquals([ok.status, ok.body.bingo.n], [200, k], JSON.stringify(ok.body));
  c.avanzar(9000);
  const otra = await responder(c, codigo, "marisol", { bingo: true });
  assertEquals(otra.body.bingo, ok.body.bingo, "solo cuenta el primero");
  assertEquals((await c.call("POST", "/partida", "marisol", { juego: "bingo", puntos: 5000, aciertos: 5, total: 24, segundos: 90, sala: codigo })).body.puntos, 5000, "en sala: tope de partidas");
  assertEquals((await c.call("POST", "/partida", "angel", { juego: "bingo", puntos: 5000, aciertos: 5, total: 24, segundos: 90 })).body.puntos, 1000, "individual: tope 1000");
});

// ---------------------------------------------------------------- Blackjack
// Reglas del motor (juegos/blackjack.js). Cartas: id = palo·13 + rango (rango 0 = 2 … 8 = 10, 9 J, 10 Q, 11 K, 12 A).
const carta = (r: string) => ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"].indexOf(r);
// Mesa de prueba con el mazo en el orden en que salen las cartas (se reparte 1 a cada quien, 1 a la banca, y otra vuelta).
function mesa(n: number, salen: string[], fichas = 500) {
  const st = BJ.nueva(Array.from({ length: n }, (_, i) => ({ id: "j" + i, nombre: "J" + i })), { fichas });
  BJ.mano(st, () => 0.5);
  st.mazo = salen.map(carta).reverse();
  return st;
}
Deno.test("blackjack: valores, ases suaves y blackjack natural", () => {
  assertEquals(BJ.total([carta("A"), carta("6")]), { v: 17, suave: true });
  assertEquals(BJ.total([carta("A"), carta("6"), carta("9")]).v, 16, "el as baja a 1");
  assertEquals(BJ.total([carta("A"), carta("A"), carta("K")]).v, 12);
  assertEquals([BJ.esBJ([carta("A"), carta("Q")]), BJ.esBJ([carta("7"), carta("7"), carta("7")])], [true, false]);
  assertEquals([BJ.pagoBJ(20), BJ.pagoBJ(5), BJ.pagoBJ(25)], [50, 10, 60], "3 a 2 en múltiplos de 5");
});
Deno.test("blackjack: plantarse con 19 contra 18 paga el doble; la banca pide hasta 17", () => {
  const st = mesa(1, ["10", "10", "9", "6", "2"]); // tú 10+9 = 19; banca 10+6 = 16, pide 2 → 18
  assertEquals(BJ.actuar(st, { accion: "apostar", monto: 7 }), false, "no es múltiplo de 5");
  assertEquals(BJ.actuar(st, { accion: "apostar", monto: 505 }), false, "más de tus fichas");
  assertEquals(BJ.actuar(st, { accion: "apostar", monto: 20 }), true);
  assertEquals([st.fase, st.jugadores[0].fichas, BJ.total(st.cartas[0]).v], ["turnos", 480, 19]);
  assertEquals(BJ.actuar(st, { accion: "plantarse" }), true);
  assertEquals([st.fase, BJ.total(st.banca).v, st.resultado.premios[0], st.jugadores[0].fichas], ["fin", 18, 40, 520]);
});
Deno.test("blackjack: pasarse, doblar, empate, blackjack y la banca con blackjack", () => {
  let st = mesa(1, ["10", "10", "6", "7", "K"]); // tú 16, pides K → 26
  BJ.actuar(st, { accion: "apostar", monto: 50 }); BJ.actuar(st, { accion: "pedir" });
  assertEquals([st.estado[0], st.resultado.premios[0], st.jugadores[0].fichas, st.banca.length], ["pasado", 0, 450, 2], "la banca no pide si nadie sigue");
  st = mesa(1, ["5", "10", "6", "7", "K"]); // tú 11, doblas y recibes K → 21; banca 17
  BJ.actuar(st, { accion: "apostar", monto: 30 });
  assertEquals(BJ.opciones(st).doblar, true);
  BJ.actuar(st, { accion: "doblar" });
  assertEquals([st.apuesta[0], BJ.total(st.cartas[0]).v, st.resultado.premios[0], st.jugadores[0].fichas], [60, 21, 120, 560]);
  st = mesa(1, ["10", "10", "8", "8"]); // 18 contra 18
  BJ.actuar(st, { accion: "apostar", monto: 10 }); BJ.actuar(st, { accion: "plantarse" });
  assertEquals(st.resultado.neto[0], 0, "empate: recuperas tu apuesta");
  st = mesa(1, ["A", "10", "K", "7"]); // blackjack natural contra 17
  BJ.actuar(st, { accion: "apostar", monto: 20 });
  assertEquals([st.estado[0], st.fase, st.resultado.premios[0]], ["bj", "fin", 50]);
  st = mesa(2, ["10", "9", "A", "10", "8", "K"]); // la banca A+K: se paga de inmediato
  BJ.actuar(st, { accion: "apostar", monto: 10 }); BJ.actuar(st, { accion: "apostar", monto: 20 });
  assertEquals([st.fase, st.resultado.bjBanca, st.resultado.premios], ["fin", true, [0, 0]]);
});
Deno.test("blackjack: turnos en orden, auto al vencer y bots; termina en 8 manos o sin fichas", () => {
  const st = mesa(2, ["10", "9", "10", "8", "7", "7", "10", "10"]);
  assertEquals(st.turno, 0);
  BJ.actuar(st, BJ.auto(st));
  assertEquals([st.apuesta[0], st.turno], [5, 1], "al vencer el turno: apuesta mínima");
  BJ.actuar(st, { accion: "apostar", monto: 10 });
  assertEquals(BJ.auto(st), { accion: "plantarse" });
  const b = BJ.bot(st, () => 0.3);
  assert(["pedir", "plantarse", "doblar"].includes(b.accion));
  const p = BJ.nueva([{ id: "a", nombre: "A" }]);
  let manos = 0;
  for (BJ.mano(p, () => 0.4); !p.terminada; BJ.mano(p, () => 0.4)) {
    manos++;
    for (let g = 0; g < 30 && p.fase !== "fin"; g++) BJ.actuar(p, BJ.bot(p, () => 0.4));
  }
  assertEquals(manos <= 8, true);
  const quebrado = mesa(1, ["10", "10", "6", "7", "K"], 5);
  BJ.actuar(quebrado, { accion: "apostar", monto: 5 }); BJ.actuar(quebrado, { accion: "pedir" });
  BJ.mano(quebrado, () => 0.5);
  assertEquals(quebrado.terminada, true, "sin fichas se acaba");
});

Deno.test("blackjack: acciones y montos en múltiplos de 5 (como el póker)", async () => {
  const c = ctx();
  const codigo = await abrir(c, "blackjack", ["marisol", "angel"]);
  c.avanzar(6000);
  const jug = (q: string, jugada: unknown) => responder(c, codigo, q, { jugada });
  const ok = await jug("marisol", { n: 0, accion: "apostar", monto: 25 });
  assertEquals([ok.status, ok.body.jugadas[0].accion, ok.body.jugadas[0].monto], [200, "apostar", 25]);
  for (const mala of [{ n: 1, accion: "apostar" }, { n: 1, accion: "apostar", monto: 7 }, { n: 1, accion: "apostar", monto: 0 }, { n: 1, accion: "apostar", monto: "20" },
    { n: 1, accion: "pedir", monto: 5 }, { n: 1, accion: "subir", monto: 10 }, { n: 1, accion: "jugar", carta: 3 }, { n: 1, accion: "plantarse", carta: 2 }]) {
    assertEquals((await jug("angel", mala)).body.error, "jugada_invalida", JSON.stringify(mala));
  }
  assertEquals((await jug("angel", { n: 0, accion: "apostar", monto: 10 })).body.error, "turno_tomado");
  for (const [n, accion] of [[1, "pedir"], [2, "doblar"], [3, "plantarse"]] as const) assertEquals((await jug("angel", { n, accion })).status, 200, accion);
  assertEquals((await c.call("POST", "/partida", "angel", { juego: "blackjack", puntos: 4000, aciertos: 3, total: 8, segundos: 300 })).body.puntos, 1000, "tope 1000");
});

Deno.test("blackjack: mesa de 3 asientos (cada persona quita un bot), hasta 6 personas y solo contra la banca", async () => {
  const c = ctx();
  assertEquals([1, 2, 3, 4].map((h) => Mesas.botsEnMesa("blackjack", h, true)), [2, 1, 0, 0], "1 persona + 2 bots; al entrar otra, un bot menos");
  assertEquals([1, 2, 6].map((h) => enMesa("blackjack", h, true)), [3, 3, 6]);
  for (const j of ["bingo", "en-memorama", "mente-sopa"]) assertEquals(Mesas.botsEnMesa(j, 3, true), null, j + ": bots aparte");
  assertEquals(Mesas.botsEnMesa("dibuja", 3, true), null, "dibuja: solo personas");
  const r = await c.call("POST", "/sala", "marisol", { juego: "blackjack", opciones: {}, bots: true });
  for (const q of PERSONAS.slice(1, 6)) assertEquals((await c.call("POST", `/sala/${r.body.codigo}/unirse`, q)).status, 200, q);
  assertEquals((await c.call("POST", `/sala/${r.body.codigo}/unirse`, "rocio")).body.error, "sala_llena");
  const solo = await c.call("POST", "/sala", "marisol", { juego: "blackjack", opciones: {}, bots: false });
  assertEquals((await c.call("POST", `/sala/${solo.body.codigo}/empezar`, "marisol")).status, 200, "una persona sola contra la banca");
});

// ---------------------------------------------------------------- Dibuja y adivina
Deno.test("dibuja: sin bots, de 3 a 12 personas y con secreto que nunca sale del servidor", async () => {
  const c = ctx();
  const r = await c.call("POST", "/sala", "marisol", { juego: "dibuja", opciones: {}, bots: true });
  assertEquals([r.status, r.body.sala.bots], [200, false], "nunca lleva bots");
  const codigo = r.body.codigo;
  await c.call("POST", `/sala/${codigo}/unirse`, "angel");
  assertEquals((await c.call("POST", `/sala/${codigo}/empezar`, "marisol")).body.error, "faltan_jugadores", "con 2 no empieza");
  for (const q of PERSONAS.slice(2, 12)) assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, q)).status, 200, q);
  assertEquals((await c.call("POST", `/sala/${codigo}/unirse`, "nico")).body.error, "sala_llena", "máximo 12");
  const e = await c.call("POST", `/sala/${codigo}/empezar`, "marisol");
  assertEquals([e.status, e.body.sala.secreto], [200, undefined]);
  const s = await c.sala(codigo);
  assert(/^[0-9a-f]{24}$/.test(s.secreto), "el secreto se guarda al empezar");
  assert(PALABRAS_DIBUJA.length > 50 && PALABRAS_DIBUJA.every((p) => /^[a-z]+( [a-z]+)?$/.test(p.en)), "vocabulario de ingles.json");
});

Deno.test("dibuja: la palabra solo la recibe quien dibuja (ni GET de los demás ni Realtime)", async () => {
  const c = ctx();
  const codigo = await abrir(c, "dibuja", ["marisol", "angel", "laura"]);
  const s = await c.sala(codigo);
  const p0 = palabraDibuja(s.secreto, 0);
  c.ir(s.inicio + 1000);
  const yo = await c.call("GET", `/sala/${codigo}`, "marisol");
  assertEquals([yo.body.dibuja.turno, yo.body.dibuja.fase, yo.body.dibuja.palabra], [0, "dibujo", p0.en]);
  assertEquals(yo.body.sala.secreto, undefined);
  for (const q of ["angel", "laura"]) {
    const g = await c.call("GET", `/sala/${codigo}`, q);
    assertEquals([g.body.dibuja.turno, g.body.dibuja.palabra, g.body.dibuja.es, g.body.dibuja.letras], [0, undefined, undefined, p0.en.replace(/ /g, "").length]);
    assertEquals(JSON.stringify(g.body).includes(s.secreto), false);
    // La palabra en inglés puede coincidir con un valor legítimo de la sala (p. ej. un color «green»), así que se
    // busca dentro de `dibuja`; en todo el cuerpo se buscan la traducción y la llave `palabra`.
    assertEquals(JSON.stringify(g.body.dibuja).includes(`"${p0.en}"`), false, "la palabra no viaja en dibuja");
    assertEquals([JSON.stringify(g.body).includes(`"${p0.es}"`), /"palabra":"/.test(JSON.stringify(g.body))], [false, false], "ni la traducción ni la llave palabra");
  }
  // Realtime: tras un trazo se publica el estado sin secreto ni palabra.
  assertEquals((await responder(c, codigo, "marisol", { trazo: { turno: 0, nuevos: [{ c: 1, g: 2, p: [10, 10, 40, 60, 90, 90] }] } })).status, 200);
  const ult = JSON.stringify(c.enviados.at(-1));
  assertEquals([ult.includes(s.secreto), ult.includes(`"${p0.es}"`), /"palabra":"/.test(ult), ult.includes('"trazos"')], [false, false, false, true]);
});

Deno.test("dibuja: trazos solo de quien dibuja, con límites de tamaño y frecuencia", async () => {
  const c = ctx();
  const codigo = await abrir(c, "dibuja", ["marisol", "angel", "laura"]);
  const s = await c.sala(codigo);
  const trazo = (q: string, t: unknown) => responder(c, codigo, q, { trazo: t });
  const linea = { c: 0, g: 1, p: [0, 0, 255, 255] };
  c.ir(s.inicio - 2000);
  assertEquals((await trazo("marisol", { turno: 0, nuevos: [linea] })).status, 409, "antes del inicio");
  c.ir(s.inicio + 500);
  assertEquals((await trazo("angel", { turno: 0, nuevos: [linea] })).body.error, "no_dibujas");
  assertEquals((await trazo("marisol", { turno: 1, nuevos: [linea] })).body.error, "turno_cerrado");
  for (const malo of [{ turno: 0 }, { turno: 0, nuevos: [] }, { turno: 0, nuevos: Array(7).fill(linea) }, { turno: 0, nuevos: [{ c: 8, g: 1, p: [1, 1, 2, 2] }] },
    { turno: 0, nuevos: [{ c: 0, g: 4, p: [1, 1, 2, 2] }] }, { turno: 0, nuevos: [{ c: 0, g: 1, p: [1, 1] }] }, { turno: 0, nuevos: [{ c: 0, g: 1, p: [1, 1, 2] }] },
    { turno: 0, nuevos: [{ c: 0, g: 1, p: [1, 1, 256, 2] }] }, { turno: 0, nuevos: [{ c: 0, g: 1, p: [1.5, 1, 2, 2] }] },
    { turno: 0, nuevos: [{ c: 0, g: 1, p: Array(130).fill(3) }] }, { turno: 0, nuevos: [{ c: 0, g: 1, p: [1, 1, 2, 2], x: 1 }] }]) {
    assertEquals((await trazo("marisol", malo)).body.error, "trazo_invalido", JSON.stringify(malo).slice(0, 80));
  }
  const ok = await trazo("marisol", { turno: 0, nuevos: [{ c: 2, g: 3, p: Array(128).fill(7) }] });
  assertEquals(ok.status, 200, "64 puntos sí");
  assertEquals((await trazo("marisol", { turno: 0, nuevos: [linea] })).status, 429, "dos envíos seguidos: muy_rapido");
  c.avanzar(DIBUJA.TRAZO_CADA_MS);
  assertEquals((await trazo("marisol", { turno: 0, nuevos: [linea, linea] })).status, 200);
  assertEquals((await c.jugador(codigo, "a-marisol")).dibujo.trazos.length, 3);
  c.avanzar(DIBUJA.TRAZO_CADA_MS);
  assertEquals((await trazo("marisol", { turno: 0, borrar: true })).status, 200);
  assertEquals((await c.jugador(codigo, "a-marisol")).dibujo.trazos.length, 0, "borrar deja el lienzo vacío");
  // Tope por turno: 200 trazos.
  let r: any = null;
  for (let i = 0; i < 40; i++) { c.avanzar(DIBUJA.TRAZO_CADA_MS); r = await trazo("marisol", { turno: 0, nuevos: Array(6).fill(linea) }); if (r.status !== 200) break; }
  assertEquals([r.status, r.body.error], [413, "dibujo_lleno"]);
  assertEquals((await c.jugador(codigo, "a-marisol")).dibujo.trazos.length <= DIBUJA.MAX_TRAZOS, true);
});

Deno.test("dibuja: adivinar bien, mal, «casi» y repetido; quien dibuja no adivina", async () => {
  const c = ctx();
  const codigo = await abrir(c, "dibuja", ["marisol", "angel", "laura"]);
  const s = await c.sala(codigo);
  const p0 = palabraDibuja(s.secreto, 0).en;
  const adivina = (q: string, texto: string, turno = 0) => responder(c, codigo, q, { adivina: { turno, texto } });
  c.ir(s.inicio + 3000);
  assertEquals((await adivina("marisol", p0)).body.error, "eres_quien_dibuja");
  const mal = await adivina("angel", "zzz nope");
  assertEquals([mal.status, mal.body.correcta], [200, false]);
  assertEquals((await adivina("angel", "otra")).status, 429, "muy seguido");
  c.avanzar(DIBUJA.INTENTO_CADA_MS);
  const casi = await adivina("angel", "the " + p0 + " is big");
  assertEquals([casi.body.correcta, casi.body.casi], [false, true]);
  const angel = await c.jugador(codigo, "a-angel");
  assertEquals(angel.intentos.map((x: any) => x.texto ?? "(casi)"), ["zzz nope", "(casi)"], "lo que contiene la palabra se guarda sin texto");
  c.avanzar(DIBUJA.INTENTO_CADA_MS);
  const bien = await adivina("angel", " " + p0.toUpperCase().replace(/A/g, "Á") + "s ");
  assertEquals(bien.body.correcta, true, JSON.stringify(bien.body));
  assert(bien.body.pts > 100 && bien.body.pts <= 200, "más puntos por rapidez: " + bien.body.pts);
  c.avanzar(DIBUJA.INTENTO_CADA_MS);
  assertEquals((await adivina("angel", p0)).body.error, "ya_adivinaste");
  assertEquals((await adivina("laura", "x".repeat(41))).body.error, "adivina_invalida");
  assertEquals(normalizarPalabra("  Ñandú  Grande "), "nandu grande");
});

Deno.test("dibuja: el turno termina antes si todos adivinan y luego dibuja la siguiente persona", async () => {
  const c = ctx();
  const codigo = await abrir(c, "dibuja", ["marisol", "angel", "laura"]);
  const s = await c.sala(codigo);
  const [p0, p1] = [palabraDibuja(s.secreto, 0).en, palabraDibuja(s.secreto, 1).en];
  assert(p0 !== p1, "palabras distintas por turno");
  c.ir(s.inicio + 2000);
  assertEquals((await responder(c, codigo, "angel", { adivina: { turno: 0, texto: p0 } })).body.correcta, true);
  c.ir(s.inicio + 4000);
  assertEquals((await responder(c, codigo, "laura", { adivina: { turno: 0, texto: p0 } })).body.correcta, true);
  const pausa = await c.call("GET", `/sala/${codigo}`, "laura");
  assertEquals([pausa.body.dibuja.turno, pausa.body.dibuja.fase], [0, "pausa"], "todos adivinaron: pausa");
  assertEquals(pausa.body.dibuja.reveladas, [{ turno: 0, palabra: p0, es: palabraDibuja(s.secreto, 0).es, emoji: palabraDibuja(s.secreto, 0).emoji }]);
  c.ir(s.inicio + 4000 + DIBUJA.PAUSA_MS + 100);
  const t1 = await c.call("GET", `/sala/${codigo}`, "angel");
  assertEquals([t1.body.dibuja.turno, t1.body.dibuja.fase, t1.body.dibuja.palabra], [1, "dibujo", p1], "ahora dibuja Angel");
  assertEquals((await c.call("GET", `/sala/${codigo}`, "marisol")).body.dibuja.palabra, undefined);
  assertEquals((await responder(c, codigo, "marisol", { adivina: { turno: 0, texto: p0 } })).body.error, "turno_cerrado");
  // Calendario puro: sin aciertos, el turno dura 60 s + 5 s de pausa.
  const cal = calendarioDibuja(1000, ["a", "b", "c"], () => undefined);
  assertEquals(cal.map((x) => [x.dibuja, x.ini, x.fin]), [["a", 1000, 61000], ["b", 66000, 126000], ["c", 131000, 191000]]);
});

// ---------------------------------------------------------------- Memorama y Sopa en sala
Deno.test("memorama en sala: criterio, resultado válido, imposible y solo el primero", async () => {
  const c = ctx();
  assertEquals((await c.call("POST", "/sala", "marisol", { juego: "en-memorama", opciones: { gana: "suerte" } })).body.error, "criterio_invalido");
  const r = await c.call("POST", "/sala", "marisol", { juego: "en-memorama", opciones: {}, bots: true });
  assertEquals(r.body.sala.opciones.gana, "tiempo", "por omisión gana el menor tiempo");
  const codigo = await abrir(c, "en-memorama", ["marisol", "angel"], { gana: "errores" });
  assertEquals((await c.sala(codigo)).opciones.gana, "errores");
  const s = await c.sala(codigo);
  c.ir(s.inicio + 40_000);
  for (const malo of [{ ms: 2000, errores: 0, pares: 8, fin: true }, { ms: 40_000, errores: 0, pares: 7, fin: true }, { ms: 40_000, errores: -1, pares: 8, fin: true },
    { ms: 40_000, errores: 0, pares: 8, fin: false }, { ms: 40_000, errores: 0, pares: 8 }, { ms: 70_000, errores: 0, pares: 8, fin: true }, { ms: 40_000, errores: 0, encontradas: 6, fin: true }]) {
    assertEquals((await responder(c, codigo, "angel", { resultado: malo })).body.error, "resultado_invalido", JSON.stringify(malo));
  }
  const ok = await responder(c, codigo, "angel", { resultado: { ms: 39_500, errores: 3, pares: 8, fin: true } });
  assertEquals(ok.status, 200);
  c.avanzar(5000);
  await responder(c, codigo, "angel", { resultado: { ms: 44_000, errores: 0, pares: 8, fin: true } });
  assertEquals((await c.jugador(codigo, "a-angel")).resultado.errores, 3, "se ignora el segundo");
  assertEquals((await responder(c, codigo, "marisol", { resultado: { ms: null, errores: 9, pares: 5, fin: true } })).status, 200, "no terminó");
});

Deno.test("sopa en sala: avance que no baja, final con tiempo y tiempo imposible", async () => {
  const c = ctx();
  const codigo = await abrir(c, "mente-sopa", ["marisol", "angel"]);
  const s = await c.sala(codigo);
  c.ir(s.inicio + 1_500);
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: 1_400, encontradas: 1, fin: false } })).status, 200, "el avance puede llegar en el primer segundo");
  assertEquals((await responder(c, codigo, "marisol", { resultado: { ms: 1_400, encontradas: 6, fin: true } })).body.error, "resultado_invalido", "terminar tan rápido no");
  c.ir(s.inicio + 20_000);
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: 19_800, encontradas: 2, fin: false } })).status, 200);
  c.ir(s.inicio + 25_000);
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: 24_000, encontradas: 1, fin: false } })).status, 200);
  assertEquals((await c.jugador(codigo, "a-angel")).resultado.encontradas, 2, "el avance no baja");
  c.ir(s.inicio + 40_000);
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: 2000, encontradas: 6, fin: true } })).body.error, "resultado_invalido");
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: null, encontradas: 6, fin: true } })).body.error, "resultado_invalido", "terminar con todas requiere tiempo");
  assertEquals((await responder(c, codigo, "angel", { resultado: { ms: 39_000, encontradas: 6, fin: true, errores: 1 } })).body.error, "resultado_invalido");
  const fin = await responder(c, codigo, "angel", { resultado: { ms: 39_000, encontradas: 6, fin: true } });
  assertEquals(fin.status, 200);
  c.avanzar(1000);
  await responder(c, codigo, "angel", { resultado: { ms: 40_000, encontradas: 6, fin: false } });
  assertEquals((await c.jugador(codigo, "a-angel")).resultado.ms, 39_000, "tras el final no cambia");
  assertEquals((await responder(c, codigo, "marisol", { resultado: { ms: null, encontradas: 3, fin: true } })).status, 200, "se acabó el tiempo");
});

// ---------------------------------------------------------------- Catálogo y revancha
Deno.test("salas grandes: catálogo con título y tope, partidas permitidas y revancha con la misma figura", async () => {
  for (const id of ["bingo", "blackjack", "dibuja", "en-memorama", "mente-sopa"]) assert(JUEGOS_PARTIDA.has(id), id);
  assertEquals([CATALOGO.bingo.titulo, CATALOGO.blackjack.titulo, CATALOGO.dibuja.titulo], ["Bingo", "Blackjack (21)", "Dibuja y adivina"]);
  assertEquals([CATALOGO.bingo.max, CATALOGO.blackjack.max, CATALOGO.dibuja.max, CATALOGO.dibuja.categoria], [1000, 1000, 1000, "ingles"]);
  const c = ctx();
  const yo = await c.call("GET", "/yo", "marisol");
  for (const id of ["bingo", "blackjack", "dibuja"]) assert(yo.body.catalogo.some((x: any) => x.id === id), id);
  const codigo = await abrir(c, "bingo", ["marisol", "angel"], { figura: "lleno" });
  c.avanzar(10_000);
  await responder(c, codigo, "marisol", { final: 50 });
  const rev = await c.call("POST", `/sala/${codigo}/revancha`, "angel");
  assertEquals(rev.status, 200);
  assertEquals((await c.sala(rev.body.codigo)).opciones.figura, "lleno");
});
