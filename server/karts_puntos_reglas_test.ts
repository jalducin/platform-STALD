// Karts: reglas compartidas de la copa individual (openspec: karts-puntos-copas, sprint 41): KartsPistas.copaNueva, anotarRecord y sumarCarreraCopa.
// - «En la copa Reinos Antiguos no suma puntos y gané en la primera carrera»: en cada copa (la lista sale de
//   KartsPistas.COPAS), ganar la carrera 1 deja 15 puntos en la copa en curso y el servidor acepta ese avance, con
//   cualquier tiempo de carrera que el juego anote como récord.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { validarProgreso } from "./progreso.ts";
import { MemoryStore } from "./store.ts";

const g = globalThis as any;
const KP = g.KartsPistas, A = g.Arcade;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
function servidor() {
  clearCacheJuegos();
  const store = new MemoryStore();
  const deps = {
    store, admin: "admin@example.com", filasIngles: () => Promise.resolve([{ alumno: "Angel", userEmails: ["angel@example.com"], userNames: ["Angel"] }]),
    filasSecundaria: () => Promise.resolve([]), hoy: () => "2026-10-17", ahora: () => "2026-10-17T18:00:00.000Z",
  };
  return async (method: string, sub: string, body?: unknown) => {
    const req = new Request(`http://x/juegos${sub}?email=angel%40example.com`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await handleJuegos(req, sub, "angel@example.com", deps, json);
    return { status: res.status, body: await res.json() };
  };
}

// Avance como lo arma el juego (progresoNuevo + podios en las otras copas para abrir cualquiera).
const avance = () => ({
  copas: { fiesta: { lugar: 1, puntos: 50 }, mesoamerica: { lugar: 2, puntos: 40 } }, records: {}, piezas: [],
  equipo: { chasis: "estandar", llantas: "estandar", color: "azul" }, copaEnCurso: null, pistasV: KP.VERSION_PISTAS, recordsV1: {}, recordsV2: {},
});
// Orden de llegada de la carrera: índices de los 8 karts (el tuyo, `yo`, primero si ganaste).
const orden = (yo: number, lugar = 1) => { const o = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== yo); o.splice(lugar - 1, 0, yo); return o; };

for (const copa of KP.copasOrdenadas()) {
  Deno.test(`puntos: ${copa.nombre}, carrera 1 en 1.er lugar → 15 puntos guardados y aceptados por el servidor`, async () => {
    const prog: any = avance();
    assert(KP.copaDesbloqueada(copa, prog), "con 2 podios todas las copas se abren");
    prog.copaEnCurso = KP.copaNueva(copa.id);
    const yo = 5, pista = copa.pistas[0];
    const ms = Math.round(A.refKarts(pista) * 0.95); // una carrera real que gana a los bots
    KP.anotarRecord(prog, pista, ms);
    const r = KP.sumarCarreraCopa(prog, orden(yo), yo);
    assertEquals(prog.copaEnCurso.copa, copa.id);
    assertEquals(prog.copaEnCurso.carrera, 1);
    assertEquals(prog.copaEnCurso.puntos[yo], 15);
    assertEquals(r.terminada, false);
    assertEquals(prog.records[pista], ms);
    assert(validarProgreso("karts", prog), JSON.stringify(prog));
    const call = servidor();
    const p = await call("PUT", "/progreso/karts", { v: 0, datos: prog });
    assertEquals(p.status, 200, JSON.stringify(p.body));
    const leido = await call("GET", "/progreso/karts");
    assertEquals(leido.body.datos.copaEnCurso.puntos[yo], 15);
    // Puntos de ranking de esa carrera: el servidor los acepta (tope del catálogo).
    const puntos = (9 - 1) * 60 + 3 * 10;
    const q = await call("POST", "/partida", { juego: "karts", puntos, aciertos: 3, total: 0, segundos: Math.round(ms / 1000) });
    assertEquals([q.status, q.body.guardado, q.body.puntos], [200, true, puntos], JSON.stringify(q.body));
  });

  Deno.test(`puntos: ${copa.nombre} completa (4 carreras ganadas) → copa ganada con 60 y aceptada`, () => {
    const prog: any = avance();
    prog.copaEnCurso = KP.copaNueva(copa.id);
    let r: any = null;
    copa.pistas.forEach(() => { r = KP.sumarCarreraCopa(prog, orden(2), 2); });
    assertEquals([r.terminada, r.lugar, prog.copaEnCurso], [true, 1, null]);
    assertEquals(prog.copas[copa.id], { lugar: 1, puntos: KP.PUNTOS_COPA_MAX });
    assert(validarProgreso("karts", prog), JSON.stringify(prog));
  });
}

Deno.test("puntos: el récord de una carrera muy larga (pausa, pestaña oculta o atorado) no rompe el guardado", () => {
  for (const ms of [9_000, 10_000, KP.RECORD_MAX_MS, KP.RECORD_MAX_MS + 1, 20 * 60_000, 3_600_000]) {
    const prog: any = avance();
    prog.copaEnCurso = KP.copaNueva("reinos");
    KP.anotarRecord(prog, "giza", ms);
    KP.sumarCarreraCopa(prog, orden(0), 0);
    assert(validarProgreso("karts", prog), "ms=" + ms + " " + JSON.stringify(prog.records));
    assertEquals(prog.copaEnCurso.puntos[0], 15);
  }
});

Deno.test("puntos: el servidor deriva copas y tope de puntos de las definiciones (sin listas fijas)", () => {
  assertEquals(KP.PUNTOS_CARRERA, A.PUNTOS_COPA, "los puntos por lugar de la copa individual y de la sala son los mismos");
  assertEquals(KP.PUNTOS_COPA_MAX, A.PUNTOS_COPA[0] * Math.max(...KP.COPAS.map((c: any) => c.pistas.length)));
  const prog: any = avance();
  for (const c of KP.COPAS) prog.copas[c.id] = { lugar: 1, puntos: KP.PUNTOS_COPA_MAX };
  assert(validarProgreso("karts", prog));
  prog.copas.fantasma = { lugar: 1, puntos: 10 };
  assertEquals(validarProgreso("karts", prog), false, "una copa que no existe en KartsPistas.COPAS se rechaza");
});
