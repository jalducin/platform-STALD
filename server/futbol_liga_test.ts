// Reglas de liga de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar): universo ficticio regenerado igual al JSON
// versionado, calendario de 14 jornadas, resultados rápidos, tabla, temporada con ascensos y descensos, mercado,
// ojeador y cartas deterministas, copa y torneo, puntos por partido, semana ISO y rival semanal.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import "../juegos/futbol-motor.js";
import "../juegos/futbol-liga.js";
import { generarUniverso } from "../herramientas/generar-futbol.ts";

const L = (globalThis as any).FutbolLiga;
const M = (globalThis as any).FutbolMotor;
const U = JSON.parse(Deno.readTextFileSync(new URL("../juegos/datos/futbol.json", import.meta.url)));
const CLUB = { nombre: "Club Prueba", corto: "CPR", escudo: { forma: "escudo", c1: "#123456", c2: "#ffffff", simbolo: "estrella" }, uniforme: { c1: "#123456", c2: "#ffffff", patron: "rayas" }, estadio: "Estadio Prueba" };
const HEX = /^#[0-9a-f]{6}$/;

Deno.test("futbol-liga: el script regenera exactamente el JSON versionado", () => {
  assertEquals(JSON.stringify(generarUniverso()), JSON.stringify(U));
});

Deno.test("futbol-liga: 3 ligas de 8, 24 clubes de 16 con posiciones, números y cartas válidas, todo inventado", () => {
  assertEquals(U.ligas.map((l: any) => l.nombre), ["Liga Volcán", "Liga del Pacífico", "Liga Norte"]);
  assertEquals(U.ligas.map((l: any) => l.clubes.length), [8, 8, 8]);
  assertEquals(U.copa.nombre, "Copa Continental de Clubes");
  assertEquals(U.clubes.length, 24);
  assertEquals(new Set(U.clubes.map((c: any) => c.nombre)).size, 24);
  assertEquals(new Set(U.clubes.map((c: any) => c.corto)).size, 24);
  const cartas = new Set(M.CARTAS.map((c: any) => c.id));
  let mujeres = 0, hombres = 0;
  for (const c of U.clubes) {
    assertEquals(c.jugadores.length, 16, c.nombre);
    const pos = c.jugadores.map((j: any) => j.pos);
    assertEquals(["POR", "DEF", "MED", "DEL"].map((p) => pos.filter((x: string) => x === p).length), [2, 6, 5, 3], c.nombre);
    assertEquals(new Set(c.jugadores.map((j: any) => j.num)).size, 16, c.nombre + ": números sin repetir");
    assertEquals(new Set(c.jugadores.map((j: any) => j.nombre)).size, 16, c.nombre + ": nombres sin repetir");
    assert([c.uniforme.c1, c.uniforme.c2, c.escudo.c1, c.escudo.c2, c.portero.c1, c.portero.c2].every((x: string) => HEX.test(x)), c.nombre);
    assert(L.FORMAS.includes(c.escudo.forma) && L.SIMBOLOS.includes(c.escudo.simbolo) && L.PATRONES.includes(c.uniforme.patron), c.nombre);
    assert(c.estadio && c.ciudad && /^[A-Z]{3}$/.test(c.corto));
    for (const j of c.jugadores) {
      assert(j.carta === null || cartas.has(j.carta), j.nombre);
      assert(["vel", "pas", "tir", "def", "fis", "por", "reg"].every((k) => Number.isInteger(j[k]) && j[k] >= 20 && j[k] <= 99), j.nombre);
      if (j.g === "f") mujeres++; else hombres++;
    }
  }
  assert(mujeres > 100 && hombres > 100, "jugadores y jugadoras: " + mujeres + "/" + hombres);
  const niveles = U.ligas.map((l: any) => l.clubes.reduce((a: number, i: number) => a + U.clubes[i].fuerza, 0) / 8);
  assert(niveles[0] > niveles[1] && niveles[1] > niveles[2], "Primera > Segunda > Tercera: " + niveles);
});

Deno.test("futbol-liga: calendario de doble vuelta con 14 jornadas y cada pareja dos veces (local y visita)", () => {
  const cal = L.calendario(8);
  assertEquals(cal.length, 14);
  const vistos = new Map<string, number>();
  for (const jornada of cal) {
    assertEquals(jornada.length, 4);
    assertEquals(new Set(jornada.flat()).size, 8, "cada equipo juega una vez por jornada");
    for (const [a, b] of jornada) vistos.set(a + "-" + b, (vistos.get(a + "-" + b) || 0) + 1);
  }
  assertEquals(vistos.size, 56, "cada quien recibe a cada quien una vez");
});

Deno.test("futbol-liga: resultado rápido determinista y el más fuerte gana más", () => {
  assertEquals(L.resultadoRapido(75, 70, M.rngDe("x", "y")), L.resultadoRapido(75, 70, M.rngDe("x", "y")));
  let a = 0, b = 0;
  for (let k = 0; k < 300; k++) { const [ga, gb] = L.resultadoRapido(80, 62, M.rngDe("s", String(k))); a += ga; b += gb; }
  assert(a > b * 1.8, a + " vs " + b);
});

Deno.test("futbol-liga: alinear elige el mejor once por formación y arma el equipo del motor", () => {
  const club = U.clubes[0];
  const eq = L.equipoMotor(U, 0, null, { formacion: "4-3-3" });
  assertEquals(eq.jugadores.length, 11);
  assertEquals(eq.jugadores.map((j: any) => j.pos), M.FORMACIONES["4-3-3"].map((s: any) => s[0]));
  assertEquals(eq.corto, club.corto);
  const p = M.crearPartido({ semilla: "liga", equipos: [eq, L.equipoMotor(U, 8, null)], minutos: 2 });
  M.simular(p, 400);
  assertEquals(p.estado, "fin");
});

Deno.test("futbol-liga: la carrera empieza en la Liga Norte con 16 propios y la tabla cuenta tus resultados", () => {
  const c = L.nuevaCarrera(U, { club: CLUB, semilla: 12345 });
  assertEquals(c.divisiones.length, 3);
  assert(c.divisiones[2].includes(24) && !c.divisiones[0].includes(24));
  assertEquals(new Set(c.divisiones.flat()).size, 24);
  assertEquals(c.plantilla.length, 16);
  assertEquals(c.jornada, 0);
  const r = L.rivalJornada(U, c);
  assert(r.club >= 0 && r.club < 24 && c.divisiones[2].includes(r.club));
  L.registrarPartido(U, c, 3, 1);
  assertEquals(c.jornada, 1);
  assertEquals(c.resultados, [[3, 1]]);
  const tabla = L.tablaDivision(U, c, 2);
  const yo = tabla.find((f: any) => f.club === 24);
  assertEquals([yo.pj, yo.g, yo.gf, yo.gc, yo.pts], [1, 1, 3, 1, 3]);
  assertEquals(tabla.reduce((a: number, f: any) => a + f.pj, 0), 8);
  assert(c.dinero > 0);
});

Deno.test("futbol-liga: al cerrar la temporada asciendes si quedas en los 2 primeros y la tabla ordena por puntos", () => {
  const c = L.nuevaCarrera(U, { club: CLUB, semilla: 777 });
  for (let k = 0; k < 14; k++) L.registrarPartido(U, c, 4, 0);
  const tabla = L.tablaDivision(U, c, 2);
  assertEquals(tabla[0].club, 24);
  for (let k = 1; k < tabla.length; k++) assert(tabla[k - 1].pts >= tabla[k].pts);
  const antes = c.dinero;
  const res = L.finTemporada(U, c);
  assert(res.ascenso && res.campeon, JSON.stringify(res));
  assert(c.divisiones[1].includes(24), "sube a la Liga del Pacífico");
  assertEquals(c.temporada, 2);
  assertEquals(c.jornada, 0);
  assertEquals(c.resultados, []);
  assert(c.dinero >= antes + 3000);
  assertEquals(new Set(c.divisiones.flat()).size, 24);
  assertEquals(c.divisiones.map((d: any) => d.length), [8, 8, 8]);
});

Deno.test("futbol-liga: mercado, ojeador y cartas son deterministas y cuidan el dinero", () => {
  const c = L.nuevaCarrera(U, { club: CLUB, semilla: 42 });
  c.dinero = 20000;
  const m1 = L.mercado(U, c), m2 = L.mercado(U, c);
  assertEquals(m1, m2);
  assertEquals(m1.length, 8);
  assert(m1.every((o: any) => o.precio > 0 && !c.plantilla.some((x: any) => x[0] === o.id)));
  const barato = m1.slice().sort((a: any, b: any) => a.precio - b.precio)[0];
  assert(L.fichar(U, c, barato.id, null).ok);
  assertEquals(c.plantilla.length, 17);
  assertEquals(c.dinero, 20000 - barato.precio);
  assert(!L.fichar(U, c, barato.id, null).ok, "no se ficha dos veces");
  const o1 = L.ojear(U, c);
  assert(o1.ok && c.ojeador.length === 3 && c.ojeadas === 1);
  const otro = L.nuevaCarrera(U, { club: CLUB, semilla: 42 });
  otro.dinero = 20000;
  L.fichar(U, otro, barato.id, null);
  L.ojear(U, otro);
  assertEquals(otro.ojeador, c.ojeador);
  assert(L.comprarCarta(c, "veloz").ok);
  assert(!L.comprarCarta(c, "veloz").ok, "ya la tienes");
  assert(L.asignarCarta(c, 3, "veloz").ok);
  assertEquals(c.plantilla[3][2], "veloz");
  const pobre = L.nuevaCarrera(U, { club: CLUB, semilla: 1 });
  pobre.dinero = 10;
  assert(!L.comprarCarta(pobre, "muro").ok && !L.ojear(U, pobre).ok);
});

Deno.test("futbol-liga: una carrera llena cabe holgada en 4096 bytes", () => {
  const c = L.nuevaCarrera(U, { club: { ...CLUB, nombre: "Club Larguísimo Nombre", estadio: "Estadio Monumental Grande" }, semilla: 2147483647 });
  c.dinero = 9999999;
  for (const m of L.mercado(U, c).slice(0, 4)) L.fichar(U, c, m.id, null);
  L.ojear(U, c);
  for (const id of M.CARTAS.map((x: any) => x.id)) { c.dinero += 1000; L.comprarCarta(c, id); }
  for (let k = 0; k < 14; k++) L.registrarPartido(U, c, 10, 10);
  const avance = { stats: { partidos: 999, ganados: 999, empatados: 999, perdidos: 999, gf: 9999, gc: 9999, copas: 99 }, clasif: { semana: "2026-W42", mejor: 1000, jugados: 99 }, tactica: { ...M.TACTICA_BASE }, carrera: c };
  const bytes = new TextEncoder().encode(JSON.stringify(avance)).length;
  assert(bytes < 2600, "bytes: " + bytes);
});

Deno.test("futbol-liga: puntos por partido según resultado, goles y nivel (tope 1000)", () => {
  assertEquals(L.puntosPartido({ gf: 0, gc: 0, dificultad: "medio" }), 120);
  assertEquals(L.puntosPartido({ gf: 2, gc: 1, dificultad: "medio" }), 300 + 120 - 20);
  assertEquals(L.puntosPartido({ gf: 0, gc: 5, dificultad: "facil" }), 0);
  assertEquals(L.puntosPartido({ gf: 9, gc: 0, dificultad: "leyenda", clasificatoria: true }), 1000);
  assert(L.puntosPartido({ gf: 1, gc: 0, dificultad: "dificil" }) > L.puntosPartido({ gf: 1, gc: 0, dificultad: "facil" }));
});

Deno.test("futbol-liga: semana ISO y rival de la semana igual para todos", () => {
  assertEquals(L.semanaISO(new Date("2026-10-12T12:00:00")), "2026-W42");
  assertEquals(L.semanaISO(new Date("2021-01-03T12:00:00")), "2020-W53");
  assertEquals(L.semanaISO(new Date("2026-01-01T12:00:00")), "2026-W01");
  const r = L.rivalSemana(U, "2026-W42");
  assertEquals(r, L.rivalSemana(U, "2026-W42"));
  assert(U.ligas[0].clubes.includes(r.club) && r.dificultad === "dificil");
  assertNotEquals(JSON.stringify(L.rivalSemana(U, "2026-W43")), JSON.stringify({}));
});

Deno.test("futbol-liga: torneo de 4 con la IA llega a un campeón y uno con persona espera su partido", () => {
  const t = L.crearTorneo(U, [{ club: 0 }, { club: 1 }, { club: 8 }, { club: 16 }], "sillon");
  L.simularIA(U, t);
  assert(t.campeon !== null && t.campeon !== undefined, JSON.stringify(t));
  assertEquals(t.rondas.length, 2);
  const h = L.crearTorneo(U, [{ club: 0, humano: 0 }, { club: 1 }, { club: 8 }, { club: 16 }], "sillon2");
  L.simularIA(U, h);
  const sig = L.siguientePartido(h);
  assert(sig && (h.equipos[sig.a].humano === 0 || h.equipos[sig.b].humano === 0));
  L.registrarTorneo(U, h, 2, 2, 0);
  L.simularIA(U, h);
  assert(h.rondas[0].every((m: any) => m.ganador !== null));
  const t8 = L.crearTorneo(U, Array.from({ length: 8 }, (_, k) => ({ club: k * 3 })), "ocho");
  L.simularIA(U, t8);
  assertEquals(t8.rondas.length, 3);
  assert(t8.campeon !== null);
});

Deno.test("futbol-liga: la Copa de la carrera arma la llave con los fuertes de Primera", () => {
  const c = L.nuevaCarrera(U, { club: CLUB, semilla: 99 });
  c.divisiones = [[24, 0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13, 14], [15, 16, 17, 18, 19, 20, 21, 22]];
  c.copa = { ronda: 0, viva: true };
  const r0 = L.rivalCopa(U, c);
  assert(r0 >= 0 && r0 !== 24);
  L.registrarCopa(U, c, true);
  assertEquals(c.copa.ronda, 1);
  L.registrarCopa(U, c, true);
  const antes = c.dinero;
  L.registrarCopa(U, c, true);
  assertEquals(c.copa, null);
  assertEquals(c.palmares.copas, 1);
  assert(c.dinero >= antes + 3000);
});
