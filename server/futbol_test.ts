// Servidor de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar): catálogo, avance en /juegos/progreso/futbol con su
// forma exacta (estadísticas, clasificatoria semanal, táctica y carrera), listas iguales a las del juego, carrera llena
// dentro de 4096 bytes, puntos con tope 1000 y Futbolito conservado en el catálogo (historial y salas en curso).
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOGO, clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { CARTAS_FUTBOL, FORMACIONES_FUTBOL, FORMAS_FUTBOL, JUEGOS_PROGRESO, PATRONES_FUTBOL, SIMBOLOS_FUTBOL, validarProgreso } from "./progreso.ts";
import { MemoryStore } from "./store.ts";
import "../juegos/futbol-motor.js";
import "../juegos/futbol-liga.js";

const M = (globalThis as any).FutbolMotor, L = (globalThis as any).FutbolLiga;
const U = JSON.parse(Deno.readTextFileSync(new URL("../juegos/datos/futbol.json", import.meta.url)));
const ingles = [{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }];
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function ctx() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = { store, admin: "admin@example.com", filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-12", ahora: () => "2026-10-12T18:00:00.000Z" };
  const call = async (method: string, sub: string, email: string, body?: unknown) => {
    const req = new Request(`http://x/juegos${sub}?email=${encodeURIComponent(email)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, email, deps, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, call };
}
const CLUB = { nombre: "Los Ajolotes", corto: "AJO", escudo: { forma: "circulo", c1: "#0d9488", c2: "#fde047", simbolo: "ola" }, uniforme: { c1: "#0d9488", c2: "#ffffff", patron: "aros" }, estadio: "Estadio Lago Azul" };
const avance = (carrera: any = null, extra: any = {}) => ({
  stats: { partidos: 3, ganados: 2, empatados: 0, perdidos: 1, gf: 5, gc: 2, copas: 0 },
  clasif: { semana: "2026-W42", mejor: 640, jugados: 2 },
  tactica: { formacion: "4-3-3", linea: 60, ancho: 55, mentalidad: 70, presion: 40 },
  carrera, ...extra,
});
const carrera = () => structuredClone(L.nuevaCarrera(U, { club: CLUB, semilla: 4242 }));

Deno.test("futbol: en el catálogo de Arcade (tope 1000) y con avance; Futbolito se conserva", () => {
  assertEquals(CATALOGO["futbol"], { categoria: "arcade", titulo: "Fútbol Estelar 2010", max: 1000 });
  assertEquals((CATALOGO as any)["futbolito"], { categoria: "arcade", titulo: "Futbolito", max: 1000 });
  assert((JUEGOS_PROGRESO as readonly string[]).includes("futbol"));
});

Deno.test("futbol: las listas del servidor son las mismas del juego", () => {
  assertEquals(CARTAS_FUTBOL, M.CARTAS.map((c: any) => c.id));
  assertEquals(FORMACIONES_FUTBOL, Object.keys(M.FORMACIONES));
  assertEquals([FORMAS_FUTBOL, SIMBOLOS_FUTBOL, PATRONES_FUTBOL], [L.FORMAS, L.SIMBOLOS, L.PATRONES]);
});

Deno.test("futbol: avance válido sin carrera, con carrera nueva y con temporada jugada", () => {
  assert(validarProgreso("futbol", avance()));
  assert(validarProgreso("futbol", avance(null, { clasif: null })));
  const c = carrera();
  assert(validarProgreso("futbol", avance(c)));
  for (let k = 0; k < 14; k++) L.registrarPartido(U, c, k % 3, 1);
  assert(validarProgreso("futbol", avance(c)));
  L.finTemporada(U, c);
  c.dinero += 5000;
  L.ojear(U, c); L.comprarCarta(c, "muro"); L.asignarCarta(c, 2, "muro");
  L.fichar(U, c, L.mercado(U, c)[0].id, null);
  assert(validarProgreso("futbol", avance(c)), JSON.stringify(c));
});

Deno.test("futbol: avance inválido (llaves, rangos, formación, textos, divisiones, plantilla, resultados)", () => {
  const malos: any[] = [
    { ...avance(), extra: 1 },
    avance(null, { tactica: { formacion: "4-2-4", linea: 50, ancho: 50, mentalidad: 50, presion: 50 } }),
    avance(null, { tactica: { formacion: "4-4-2", linea: 101, ancho: 50, mentalidad: 50, presion: 50 } }),
    avance(null, { clasif: { semana: "2026-42", mejor: 10, jugados: 1 } }),
    avance(null, { clasif: { semana: "2026-W42", mejor: 1001, jugados: 1 } }),
    avance(null, { stats: { partidos: -1, ganados: 0, empatados: 0, perdidos: 0, gf: 0, gc: 0, copas: 0 } }),
  ];
  const conCarrera = (f: (c: any) => void) => { const c = carrera(); f(c); return avance(c); };
  malos.push(
    conCarrera((c) => { c.club.nombre = "<script>"; }),
    conCarrera((c) => { c.club.nombre = "A"; }),
    conCarrera((c) => { c.club.corto = "ab"; }),
    conCarrera((c) => { c.club.escudo.c1 = "red"; }),
    conCarrera((c) => { c.club.uniforme.patron = "cuadros"; }),
    conCarrera((c) => { c.divisiones[0][0] = c.divisiones[1][0]; }),
    conCarrera((c) => { c.divisiones = c.divisiones.map((d: any) => d.filter((x: number) => x !== 24).concat(d.includes(24) ? [23] : [])); }),
    conCarrera((c) => { c.jornada = 2; c.resultados = [[1, 0]]; }),
    conCarrera((c) => { c.jornada = 1; c.resultados = [[21, 0]]; }),
    conCarrera((c) => { c.plantilla = c.plantilla.slice(0, 13); }),
    conCarrera((c) => { c.plantilla[1][0] = c.plantilla[0][0]; }),
    conCarrera((c) => { c.plantilla[0][0] = "u24-1"; }),
    conCarrera((c) => { c.plantilla[0][2] = "superpoder"; }),
    conCarrera((c) => { c.plantilla[0][1] = 30; }),
    conCarrera((c) => { c.cartas = ["muro", "muro"]; }),
    conCarrera((c) => { c.ojeador = ["u1-1"]; }),
    conCarrera((c) => { c.copa = { ronda: 4, viva: true }; }),
    conCarrera((c) => { c.dinero = 1.5; }),
    conCarrera((c) => { delete c.palmares; }),
  );
  malos.forEach((d, k) => assertEquals(validarProgreso("futbol", d), false, "caso " + k));
});

Deno.test("futbol: guardar y leer por HTTP; inválido 400 y cada quien su avance", async () => {
  const c = ctx(), datos = avance(carrera());
  const p = await c.call("PUT", "/progreso/futbol", "marisol@example.com", { v: 0, datos });
  assertEquals([p.status, p.body.ok, p.body.v], [200, true, 1], JSON.stringify(p.body));
  const g = await c.call("GET", "/progreso/futbol", "marisol@example.com");
  assertEquals([g.body.v, g.body.datos], [1, datos]);
  const doc = await c.store.get<any>("juegos/progreso/futbol/a-marisol.json");
  assert(doc && !JSON.stringify(doc.data).includes("@"));
  const mal = await c.call("PUT", "/progreso/futbol", "marisol@example.com", { v: 1, datos: { ...datos, carrera: { ...datos.carrera, club: { ...datos.carrera.club, nombre: "<b>" } } } });
  assertEquals([mal.status, mal.body.error], [400, "progreso_invalido"]);
  const vieja = await c.call("PUT", "/progreso/futbol", "marisol@example.com", { v: 0, datos });
  assertEquals([vieja.status, vieja.body.error], [409, "version_vieja"]);
});

Deno.test("futbol: los puntos de un partido se topan en 1000", async () => {
  const c = ctx();
  const r = await c.call("POST", "/partida", "marisol@example.com", { juego: "futbol", puntos: 5000, aciertos: 3, total: 0, segundos: 240 });
  assertEquals([r.status, r.body.guardado, r.body.puntos], [200, true, 1000], JSON.stringify(r.body));
});
