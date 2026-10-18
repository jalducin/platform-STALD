// Contenido de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §5): cada misión cumple el contrato del motor,
// se puede recorrer (escalones y plataformas al alcance del salto, sin paredes imposibles), sus jefes avisan antes de
// cada ataque, la dificultad crece de la 1 a la 4 y con el número de personajes, y el piloto automático la termina en
// solitario (Fácil: sin compañeros) y en equipo.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";

const g = globalThis as any;
const M = g.BrigadaMotor, MIS = g.BrigadaMisiones;
const W = M.W;
// Altura máxima del salto (pies): v² / 2g con las constantes del motor (≈ 57 px).
const ALTURA_SALTO = (M.SALTO * M.SALTO) / (2 * M.GRAV);
const MARGEN = 6; // holgura para que el salto no tenga que ser perfecto
const OBJETOS = new Set(["rafaga", "abanico", "laser", "escudo", "globos", "estrella", "corazon"]);
const DIFICULTADES = ["Fácil", "Normal", "Difícil", "Experta"];
const DUROS = new Set(["escudobot", "alien", "torreta"]);

const arenas = (d: any) => [d.minijefe, d.jefe].filter(Boolean).map((a: any) => [a.x - 20, a.x + W]);
const enArena = (d: any, x: number) => arenas(d).some(([a, b]: number[]) => x >= a && x <= b);
// Suelo más alto (y menor) entre x0 y x1.
function pisoMasAlto(d: any, x0: number, x1: number) {
  let y = Infinity;
  for (const s of d.suelo) if (s[0] < x1 && s[1] > x0 && s[2] < y) y = s[2];
  return y;
}
const plataformaEn = (d: any, x: number, y: number) => d.plataformas.some((p: number[]) => x >= p[0] && x <= p[1] && p[2] === y);

Deno.test("brigada contenido: cada misión cumple el contrato del motor", () => { // NOSONAR: una aserción por regla del contrato, en orden
  assertEquals(MIS.LISTA.map((d: any) => d.id), [1, 2, 3, 4]);
  assertEquals(new Set(MIS.LISTA.map((d: any) => d.clave)).size, 4, "claves únicas (el arte las usa)");
  for (const d of MIS.LISTA) {
    const q = d.clave;
    assert(d.nombre && d.emoji && d.lema && d.tiempoMeta > 0, "datos de portada en " + q);
    assertEquals(d.largo, d.jefe.x + W, "la arena del jefe cierra la misión en " + q);
    assert(M.JEFES[d.jefe.tipo] && d.jefe.pista, "jefe conocido y con pista en " + q);
    if (d.minijefe) assert(M.JEFES[d.minijefe.tipo] && d.minijefe.pista && d.minijefe.x + W < d.jefe.x - 200, "minijefe en " + q);
    if (d.id > 1) assert(d.minijefe, "minijefe desde la misión 2");
    for (const e of d.enemigos) {
      assert(M.ENEMIGOS[e[1]], `enemigo ${e[1]} en ${q}`);
      assert(e[0] > 400 && e[0] < d.jefe.x - 20, `enemigo dentro del recorrido en ${q}: ${e[0]}`);
      assert(!enArena(d, e[0]), `enemigo dentro de una arena en ${q}: ${e[0]}`);
      if (e[1] === "dron") assert(e[2] >= 96 && e[2] <= 140, `dron a altura de vuelo en ${q}: ${e[2]}`);
      if (e[1] === "torreta" && e[2]) assert(plataformaEn(d, e[0], e[2]), `torreta sobre una plataforma en ${q}: ${e[0]}`);
    }
    for (const o of d.objetos) assert(OBJETOS.has(o[1]), `objeto ${o[1]} en ${q}`);
    for (const j of d.jaulas) {
      assert(MIS.ANIMALES.includes(j[1]), `animalito ${j[1]} en ${q}`);
      if (j[2]) assert(plataformaEn(d, j[0], j[2]), `jaula sobre una plataforma en ${q}: ${j[0]}`);
      assert(!enArena(d, j[0]), `jaula fuera de las arenas en ${q}`);
    }
    for (const v of d.vehiculos) assert(!enArena(d, v[0]), "vehículo fuera de las arenas en " + q);
    // Puntos de control en orden, dentro del recorrido y fuera de las arenas.
    d.puntosControl.forEach((x: number, i: number) => {
      assert(x > 0 && x < d.jefe.x && !enArena(d, x), `punto de control ${x} en ${q}`);
      if (i) assert(x > d.puntosControl[i - 1], "puntos de control en orden en " + q);
    });
    // Tramos con nombre en orden, sin encimarse, fuera de las arenas y cubriendo a todos los enemigos.
    assert(d.secciones.length >= 4, "al menos 4 tramos en " + q);
    d.secciones.forEach((s: any, i: number) => {
      assert(s.nombre && s.desde < s.hasta && s.hasta <= d.jefe.x, `tramo ${s.nombre} en ${q}`);
      if (i) assert(s.desde >= d.secciones[i - 1].hasta, `tramos en orden en ${q}: ${s.nombre}`);
    });
    for (const e of d.enemigos) assert(d.secciones.some((s: any) => e[0] >= s.desde && e[0] <= s.hasta + 60), `enemigo ${e[0]} fuera de todo tramo en ${q}`);
    assert(d.puntosMeta > 0 && d.puntosMeta < M.puntosMaximos(d.id, 1), "meta de puntos posible en " + q);
  }
});

Deno.test("brigada contenido: se puede recorrer (escalones, plataformas y premios al alcance del salto)", () => {
  for (const d of MIS.LISTA) {
    const q = d.clave;
    // Paredes: subir de un tramo al siguiente nunca pide más que un salto.
    for (let i = 1; i < d.suelo.length; i++) {
      const sube = d.suelo[i - 1][2] - d.suelo[i][2];
      assert(sube <= ALTURA_SALTO - MARGEN, `pared de ${sube} px en x=${d.suelo[i][0]} (${q})`);
      assert(d.suelo[i][2] >= 150 && d.suelo[i][2] <= M.H - 20, `suelo dentro de la ventana en ${q}`);
    }
    // Plataformas: más arriba que el suelo de debajo y al alcance desde el suelo más alto de alrededor.
    for (const [x0, x1, y] of d.plataformas) {
      const debajo = pisoMasAlto(d, x0, x1), cerca = pisoMasAlto(d, x0 - 40, x1 + 40);
      assert(debajo - y >= 30, `plataforma ${x0} encima del suelo con espacio (${q})`);
      assert(cerca - y <= ALTURA_SALTO - MARGEN, `plataforma ${x0} a ${cerca - y} px (${q})`);
      assert(x1 - x0 >= 80, `plataforma ${x0} con lugar para aterrizar (${q})`);
    }
    // Premios flotando: la cabeza (26 px sobre los pies) los toca en lo alto del salto.
    for (const o of d.objetos) {
      if (!o[2]) continue;
      const piso = Math.min(pisoMasAlto(d, o[0] - 30, o[0] + 30), ...d.plataformas.filter((p: number[]) => o[0] >= p[0] - 30 && o[0] <= p[1] + 30).map((p: number[]) => p[2]));
      assert(piso - o[2] <= ALTURA_SALTO + 26 - MARGEN, `premio ${o[1]} en x=${o[0]} muy alto (${q})`);
    }
  }
});

Deno.test("brigada contenido: la dificultad crece de la misión 1 a la 4", () => {
  const L = MIS.LISTA;
  assertEquals(L.map((d: any) => d.dificultad), DIFICULTADES);
  const creciente = (f: (d: any) => number, que: string) => {
    const v = L.map(f);
    assert(v.every((x: number, i: number) => i === 0 || x > v[i - 1]), `${que}: ${v.join()}`);
  };
  creciente(d => d.enemigos.length, "enemigos");
  creciente(d => d.enemigos.filter((e: any) => DUROS.has(e[1])).length, "enemigos duros");
  creciente(d => d.largo, "largo");
  creciente(d => d.tiempoMeta, "tiempo meta");
  creciente(d => d.puntosMeta, "meta de puntos");
  creciente(d => M.JEFES[d.jefe.tipo].hp, "vida del jefe");
  // Variedad: cada misión usa caminantes, voladores, torretas y escudos; los alienígenas llegan en la 4.
  for (const d of L) for (const t of ["patrulla", "dron", "torreta", "saltabot", "escudobot"]) assert(d.enemigos.some((e: any) => e[1] === t), `${t} en ${d.clave}`);
  assert(L[3].enemigos.filter((e: any) => e[1] === "alien").length >= 10, "invasión en la estación");
  // Cajas de armas: abanico, láser, ráfaga y escudo aparecen a lo largo de la campaña.
  const cajas = new Set(L.flatMap((d: any) => d.objetos.map((o: any) => o[1])));
  for (const t of ["rafaga", "abanico", "laser", "escudo"]) assert(cajas.has(t), "caja de " + t);
});

Deno.test("brigada contenido: la misión escala con el número de personajes (1–8)", () => {
  for (const d of MIS.LISTA) {
    const r = [1, 2, 4, 8].map(n => MIS.dificultadPara(d.id, n));
    assertEquals(r[0].enemigos, d.enemigos.length, "con 1 personaje, los enemigos de la lista");
    for (let i = 1; i < r.length; i++) {
      assert(r[i].enemigos >= r[i - 1].enemigos && r[i].vidaJefe > r[i - 1].vidaJefe && r[i].vidaEnemigos > r[i - 1].vidaEnemigos, `escala en ${d.clave}`);
    }
    assert(r[3].enemigos > r[0].enemigos * 1.4, `con 8 hay más enemigos en ${d.clave}: ${r[3].enemigos}`);
    assertEquals(MIS.dificultadPara(d.id, 99).n, 8, "tope de 8");
  }
  assertEquals(MIS.dificultadPara(9, 1), null);
});

// Corre el jefe de una misión con un personaje invulnerable que no dispara y mide, por ataque, cuánto pasa entre el
// inicio de la fase (cuando la vista enseña el aviso) y el primer peligro real.
function medirAvisos(id: number, cual: "jefe" | "minijefe", semilla: string, seg = 60) {
  const def = MIS.porId(id), arena = def[cual];
  const m = M.crearMision({ mision: id, personajes: [{ personaje: "xalli" }], semilla });
  m.estado = "juego";
  if (cual === "jefe" && def.minijefe) m.miniHecho = true;
  const p = m.jugadores[0];
  m.cam.x = arena.x - 200;
  Object.assign(p, { x: arena.x + 40, y: M.sueloEn(def, arena.x + 40) });
  const quieto = { x: 0, y: 0, a: false, b: false, ga: false, gx: false, gy: false };
  const avisos: Record<string, number> = {};
  let fase = "", desde = 0, visto = false, conocidas = new Set<number>(), jx = 0;
  for (let k = 0; k < seg * 60; k++) {
    p.inv = 9; p.cor = 3; p.vidas = 3;
    const ev = M.paso(m, [quieto]);
    const j = m.jefe;
    if (!j) continue;
    for (const e of ev) if (e.tipo === "ataque") {
      fase = e.ataque; desde = m.t; visto = false; jx = j.x;
      conocidas = new Set([...m.balasE.filter((b: any) => b.vivo).map((b: any) => b.id), ...m.enemigos.filter((x: any) => x.vivo).map((x: any) => x.id)]);
    }
    if (!fase || visto || j.fase !== fase) continue;
    // Las gotas y babas son de los enemigos que invoca el jefe (esos ya se contaron al aparecer).
    const bala = m.balasE.some((b: any) => b.vivo && !conocidas.has(b.id) && !(b.retraso > 0) && b.tipo !== "gota" && b.tipo !== "baba");
    const invocado = m.enemigos.some((x: any) => x.vivo && x.invocado && !conocidas.has(x.id));
    const embiste = Math.abs(j.x - jx) > 10;
    if (bala || invocado || embiste) {
      visto = true;
      const dt = m.t - desde;
      avisos[fase] = Math.min(avisos[fase] ?? Infinity, dt);
    }
  }
  return avisos;
}

Deno.test("brigada contenido: los jefes avisan antes de cada ataque y usan todos sus patrones", () => { // NOSONAR: recorre jefes y ataques
  for (const d of MIS.LISTA) {
    for (const cual of ["minijefe", "jefe"] as const) {
      if (!d[cual]) continue;
      const tipo = d[cual].tipo, vistos: Record<string, number> = {};
      for (const s of ["a", "b", "c", "d"]) for (const [k, v] of Object.entries(medirAvisos(d.id, cual, s))) vistos[k] = Math.min(vistos[k] ?? Infinity, v);
      for (const at of M.JEFES[tipo].ataques) {
        assert(at in vistos, `${tipo} usa ${at}`);
        assert(vistos[at] >= 0.19, `${tipo}: ${at} sin aviso (${vistos[at].toFixed(2)} s)`);
      }
    }
  }
});

function piloto(id: number, n: number, semilla: string, maxSeg = 900) {
  const m = M.crearMision({ mision: id, personajes: Array.from({ length: n }, (_, i) => ({ personaje: M.PERSONAJES[i % 8], ia: true })), semilla });
  let reintentos = 0;
  for (let k = 0; k < maxSeg * 60 && m.estado !== "cumplida"; k++) {
    if (m.estado === "fallida") { reintentos++; M.reintentar(m); }
    M.paso(m, m.jugadores.map((_: any, i: number) => M.ia(m, i)));
  }
  return { m, reintentos };
}

Deno.test("brigada contenido: el piloto automático termina cada misión en solitario (Fácil, sin compañeros) y llega a la meta", () => {
  for (const d of MIS.LISTA) {
    let mejor = 0;
    for (const s of ["fa", "fb", "fc"]) {
      const { m, reintentos } = piloto(d.id, 1, s);
      assertEquals(m.estado, "cumplida", `${d.clave} (${s}): ${m.estado} en x=${Math.round(m.jugadores[0].x)} reintentos=${reintentos}`);
      assert(reintentos <= (d.id === 1 ? 1 : 3), `${d.clave} (${s}): ${reintentos} reintentos`);
      assert(m.jugadores[0].puntos <= M.puntosMaximos(d.id, 1), "puntos plausibles");
      mejor = Math.max(mejor, m.jugadores[0].puntos);
    }
    assert(mejor >= d.puntosMeta, `${d.clave}: la meta ${d.puntosMeta} se alcanza (piloto: ${mejor})`);
  }
});

Deno.test("brigada contenido: el piloto automático termina cada misión con 2 y 8 personajes", () => {
  for (const d of MIS.LISTA) {
    for (const n of [2, 8]) {
      const { m, reintentos } = piloto(d.id, n, "eq" + n);
      assertEquals(m.estado, "cumplida", `${d.clave} con ${n}: ${m.estado} reintentos=${reintentos}`);
      assert(reintentos <= 3, `${d.clave} con ${n}: ${reintentos} reintentos`);
    }
  }
});
