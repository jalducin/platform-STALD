// Netcode de «⚽ Futbolito Arena» (openspec: futbolito-arena, design.md §7 y §8): foto cuantizada, entrada con contador
// de presiones, y partidos 2 vs 2 y 3 vs 3 completos (anfitrión + invitados) sobre los canales reales de
// juegos/en-vivo.js con su red simulada determinista (latencia, pérdida y desorden): mismo marcador, robot propio
// predicho cerca del autoritativo, demás robots interpolados, desconexión con IA y regreso, caída del anfitrión y
// mensajes por segundo medidos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/arena-motor.js";
import "../juegos/en-vivo.js";
import "../juegos/arena-red.js";

const g = globalThis as any;
const M = g.ArenaMotor, R = g.ArenaRed, EV = g.EnVivo;

const robots = (formato: string) => {
  const [a, b] = M.FORMATOS[formato];
  return [...Array.from({ length: a }, (_, k) => ({ eq: 0, color: k, num: k + 1 })), ...Array.from({ length: b }, (_, k) => ({ eq: 1, color: k, num: a + k + 1 }))];
};
const partido = (formato: string, semilla = "sala") => M.crearPartido({ arena: formato === "3v3" ? "grande" : "normal", robots: robots(formato), goles: 3, semilla });
const bytes = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;

async function canales(ids: string[], o: { latencia: number; perdida: number; desorden: number; ahora: () => number; hz: (id: string) => number }) {
  const red = EV.redSimulada({ reloj: o.ahora, latencia: o.latencia, variacion: o.desorden * Math.max(100, 2 * o.latencia), perdida: o.perdida, azar: M.rng("red-" + ids.join()) });
  const cs = await Promise.all(ids.map((id) => EV.conectar({ transporte: red.transporte(id), yo: { id }, participantes: ids, hz: o.hz(id), reloj: o.ahora, manual: true })));
  return { red, cs };
}

Deno.test("arena-red: la foto de 2 vs 2 y de 3 vs 3 es chica y su error es ≤ 0.025", () => {
  for (const formato of ["2v2", "3v3"]) {
    const p = partido(formato);
    for (let k = 0; k < 400; k++) M.paso(p, p.robots.map((_: any, i: number) => M.ia(p, i, "medio")));
    const f = R.foto(p, { q: 9, t: 4321, a: p.robots.map(() => 17), ia: 2, ev: [{ n: 1, tipo: "gol", eq: 0, marcador: [1, 0] }] });
    const tam = bytes(f);
    assert(tam < (formato === "3v3" ? 560 : 420), formato + ": foto de " + tam + " B");
    const s = R.leerFoto(structuredClone(f));
    assertEquals([s.q, s.t, s.estado, s.goles, s.ia, s.a[0], s.ev.length], [9, 4321, p.estado, p.goles, 2, 17, 1]);
    p.robots.forEach((r: any, i: number) => {
      assert(Math.abs(s.robots[i].x - r.x) <= 0.025 + 1e-9 && Math.abs(s.robots[i].y - r.y) <= 0.025 + 1e-9, "robot " + i);
      const ang = Math.acos(Math.max(-1, Math.min(1, s.robots[i].fx * r.fx + s.robots[i].fy * r.fy)));
      assert(ang <= Math.PI / 64 + 1e-6, "dirección " + i);
    });
    assert(Math.abs(s.balon.x - p.balon.x) <= 0.025 + 1e-9);
  }
  assertEquals(R.leerFoto({ j: [1, 2, 3] }), null, "foto mal formada");
});

Deno.test("arena-red: la entrada pesa < 50 B y cuenta las presiones (un toque perdido no se pierde)", () => {
  const m = R.empacarEntrada({ x: 0.5, y: -1.7, a: true, b: false }, 12, 65, 3);
  assertEquals(m, { s: 12, x: 50, y: -100, m: 1, na: 1, nb: 3 });
  assert(bytes(m) < 50);
  assertEquals(R.leerEntrada(m), { x: 0.5, y: -1, a: true, b: false, na: 1, nb: 3 });
  assertEquals(R.presiones(62, 1), 3, "el contador da la vuelta en 64");
  assertEquals(R.presiones(5, 5), 0);
});

// Partido en red: el anfitrión (robot 0) y los invitados (el resto de las personas) corren cada uno su página; las
// personas mueven su robot hacia el balón que ven y aprietan A de vez en cuando. Se compara lo que dibuja cada invitado
// con lo que el anfitrión simuló.
async function partidoEnRed(formato: string, red: { latencia: number; perdida: number; desorden: number }, semilla: string, extra: (k: number, x: any) => void = () => {}) {
  let reloj = 0;
  const ahora = () => reloj;
  const p0 = partido(formato, semilla);
  const ids = p0.robots.map((_: any, i: number) => "p" + i);
  const hzEnt = R.hzEntrada(ids.length);
  const { red: rs, cs } = await canales(ids, { ...red, ahora, hz: (id) => (id === "p0" ? R.HZ_FOTO : hzEnt) });
  const anf = R.anfitrion({ canal: cs[0], p: p0, M, ids, yo: 0, ahora });
  const pis = ids.slice(1).map(() => partido(formato, semilla));
  const invs = pis.map((p: any, k: number) => R.invitado({ canal: cs[k + 1], p, M, anfitrion: "p0", yo: k + 1, ahora, hz: hzEnt }));
  const persona = (p: any, i: number, k: number) => {
    const r = p.robots[i], dx = p.balon.x - r.x, dy = p.balon.y - r.y, d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d, a: k % 50 < 3 && d < 2, b: false };
  };
  const hist: any[] = [], propios: any[] = [], errOtros: number[] = [];
  let dashInvitados = 0;
  const golesVistos = invs.map(() => 0);
  const PASO_MS = 1000 / 60;
  for (let k = 0; k < 60 * 200 && p0.estado !== "fin"; k++) {
    reloj = k * PASO_MS;
    extra(k, { rs, anf, invs, ids, reloj });
    invs.forEach((inv: any, j: number) => inv.entrada(persona(pis[j], j + 1, k + 7 * j)));
    for (const e of anf.paso(persona(p0, 0, k))) if (e.tipo === "dash" && e.i > 0) dashInvitados++;
    anf.enviarSiToca();
    hist.push({ t: reloj, pos: p0.robots.map((r: any) => [r.x, r.y]), estado: p0.estado });
    cs.forEach((c: any) => rs.entregar());
    invs.forEach((inv: any, j: number) => {
      const d = inv.dibujar();
      if (!d) return;
      golesVistos[j] += d.eventos.filter((e: any) => e.tipo === "gol").length;
      if (k % 20 || p0.estado !== "juego" || d.estado !== "juego") return;
      // El robot propio se predice ADELANTE: lo que dibuja ahora es lo que el anfitrión simulará cuando le llegue la
      // entrada (latencia + medio periodo de envío); se compara con el anfitrión en ese instante.
      const yo = j + 1, r = pis[j].robots[yo];
      propios.push({ t: reloj + red.latencia + 1000 / hzEnt / 2, i: yo, x: r.x, y: r.y });
      // Los demás se dibujan ~100 ms + latencia atrás: se comparan con el anfitrión en ese instante.
      const atras = hist.find((x) => x.t >= reloj - R.RETRASO_MS - red.latencia) || hist[0];
      if (atras.estado !== "juego") return;
      const otros = pis[j].robots.filter((_: any, i: number) => i !== yo).map((q: any) => Math.hypot(q.x - atras.pos[q.i][0], q.y - atras.pos[q.i][1]));
      errOtros.push(Math.max(...otros));
    });
  }
  for (let k = 0; k < 120; k++) { reloj += PASO_MS; anf.enviarSiToca(); rs.entregar(); invs.forEach((inv: any) => inv.dibujar()); }
  const errPropio = propios.map((m) => { const h = hist.find((x) => x.t >= m.t); return h && h.estado === "juego" ? Math.hypot(h.pos[m.i][0] - m.x, h.pos[m.i][1] - m.y) : null; }).filter((x) => x !== null) as number[];
  const p90 = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length * 0.9)];
  const seg = reloj / 1000;
  const envios = cs.map((c: any) => c.estadisticas().enviados / seg);
  return { p0, pis, invs, anf, golesVistos, dashInvitados, p90Propio: p90(errPropio), medPropio: errPropio.slice().sort((a, b) => a - b)[Math.floor(errPropio.length / 2)], p90Otros: p90(errOtros), muestras: errPropio.length, envios, seg, foto: anf.st.ultimaFoto };
}

Deno.test("arena-red: 2 vs 2 con 120 ms, 8 % de pérdida y desorden: mismo marcador, A llega y dibujo cercano", async () => {
  const r = await partidoEnRed("2v2", { latencia: 120, perdida: 0.08, desorden: 0.2 }, "red-2v2");
  console.log("2v2 120 ms:", { seg: r.seg.toFixed(0), goles: r.p0.goles, propio: r.p90Propio.toFixed(2), mediana: r.medPropio.toFixed(2), otros: r.p90Otros.toFixed(2), muestras: r.muestras, envios: r.envios.map((x: number) => x.toFixed(1)) });
  assertEquals(r.p0.estado, "fin");
  for (const p of r.pis) assertEquals([p.goles, p.estado], [r.p0.goles, "fin"], "mismo marcador y final en cada invitado");
  r.golesVistos.forEach((n: number) => assertEquals(n, r.p0.goles[0] + r.p0.goles[1], "un aviso de gol por gol"));
  assert(r.dashInvitados > 5, "las embestidas de los invitados llegan al anfitrión: " + r.dashInvitados);
  assert(r.muestras > 50);
  // Robot propio predicho: casi siempre encima del autoritativo; la cola son los choques con otros robots (que la
  // predicción no simula) y se corrigen suave.
  assert(r.medPropio < 0.5 && r.p90Propio < 1.5, "robot propio (predicho) cerca del autoritativo: mediana " + r.medPropio.toFixed(2) + ", p90 " + r.p90Propio.toFixed(2));
  assert(r.p90Otros < 1.0, "los demás (interpolados) cerca: " + r.p90Otros.toFixed(2));
  // Ritmo: foto a 15 Hz y entradas a 15 Hz (± latidos).
  assert(r.envios[0] > 13 && r.envios[0] < 17, "fotos/s " + r.envios[0]);
  for (const e of r.envios.slice(1)) assert(e > 13 && e < 17, "entradas/s " + e);
});

Deno.test("arena-red: 3 vs 3 cabe en el canal (≤ 80 envíos por sala/s, foto < 560 B)", async () => {
  const r = await partidoEnRed("3v3", { latencia: 80, perdida: 0.03, desorden: 0.1 }, "red-3v3");
  const total = r.envios.reduce((a: number, b: number) => a + b, 0);
  console.log("3v3 80 ms:", { goles: r.p0.goles, envios: total.toFixed(1), foto: bytes(r.foto), propio: r.p90Propio.toFixed(2), otros: r.p90Otros.toFixed(2) });
  assertEquals(R.hzEntrada(6), 12);
  assert(total <= 80, "envíos por sala/s: " + total);
  assert(bytes(r.foto) < 560);
  for (const p of r.pis) assertEquals(p.goles, r.p0.goles);
});

Deno.test("arena-red: si un invitado se calla, la IA toma su robot; al volver lo recupera", async () => {
  let caidoEn: number[] = [], volvio = false, movioSolo = 0;
  const r = await partidoEnRed("2v2", { latencia: 60, perdida: 0, desorden: 0 }, "red-caida", (k, x) => {
    if (k === 600) x.rs.cortar("p2");
    if (k === 600 + 60 * 4) { caidoEn = x.anf.caidos().slice(); const r2 = x.anf.p.robots[2]; movioSolo = Math.hypot(r2.vx, r2.vy); }
    if (k === 600 + 60 * 5) x.rs.reanudar("p2");
    if (k === 600 + 60 * 6) volvio = !x.anf.caidos().includes(2);
  });
  assertEquals(caidoEn, [2], "a los 3 s sin entradas la IA toma el robot 2");
  assert(movioSolo > 0.1 || r.p0.estado !== "juego", "la IA lo mueve");
  assert(volvio, "al volver recupera su robot");
});

Deno.test("arena-red: si se cae el anfitrión, el invitado avisa y cierra a los 15 s con la última foto", async () => {
  let aviso = null as number | null, cierra14 = true, cierra16 = false, goles: any = null;
  await partidoEnRed("2v2", { latencia: 60, perdida: 0, desorden: 0 }, "red-anf", (k, x) => {
    if (k === 600) { x.rs.cortar("p0"); goles = x.anf.p.goles.slice(); }
    if (k === 600 + 60 * 4) aviso = x.invs[0].anfitrionCaido();
    if (k === 600 + 60 * 14) cierra14 = x.invs[0].cerrarPorCaida();
    if (k === 600 + 60 * 19) { cierra16 = x.invs[0].cerrarPorCaida(); x.anf.p.estado = "fin"; }
  });
  assert(aviso !== null, "aviso de conexión perdida");
  assert(!cierra14 && cierra16, "cierra a los 15 s del silencio");
  assert(goles !== null);
});

Deno.test("arena-red: el anfitrión ignora entradas viejas y de quien no está en la mesa", async () => {
  let reloj = 0;
  const ids = ["p0", "p1", "p2", "p3"];
  const { red, cs } = await canales([...ids, "intruso"], { latencia: 0, perdida: 0, desorden: 0, ahora: () => reloj, hz: () => 0 });
  const p = partido("2v2");
  const anf = R.anfitrion({ canal: cs[0], p, M, ids, yo: 0, ahora: () => reloj });
  cs[1].enviar("fa:entrada", R.empacarEntrada({ x: 1, y: 0 }, 5, 0, 0)); red.entregar();
  cs[1].enviar("fa:entrada", R.empacarEntrada({ x: -1, y: 0 }, 4, 0, 0)); red.entregar();
  assertEquals(anf.st.ent[1].x, 1, "la 4 llegó tarde");
  cs[4].enviar("fa:entrada", R.empacarEntrada({ x: 0, y: 1 }, 99, 0, 0)); red.entregar();
  assert(anf.st.ent.every((e: any) => !e || e.y === 0), "el intruso no cuenta");
  // Presión que viaja en una entrada que llega aunque se perdió la anterior.
  cs[1].enviar("fa:entrada", R.empacarEntrada({ x: 0, y: 0 }, 6, 2, 0)); red.entregar();
  assertEquals(anf.st.pendA[1], true);
});
