// Netcode de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §11): foto con tope de tamaño para 8 personajes,
// 24 enemigos y 16 proyectiles; entrada con contadores de presiones; misiones completas en red de 4 y de 8 personas
// sobre los canales reales de juegos/en-vivo.js con su red simulada determinista (latencia, pérdida y desorden): los
// mismos enemigos en todos, el jefe vencido visto por todos, personaje propio predicho cerca del autoritativo,
// desconexión con IA y regreso, caída del anfitrión y mensajes por segundo medidos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/brigada-misiones.js";
import "../juegos/brigada-motor.js";
import "../juegos/en-vivo.js";
import "../juegos/brigada-red.js";

const g = globalThis as any;
const M = g.BrigadaMotor, R = g.BrigadaRed, EV = g.EnVivo;
const bytes = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;
const personajes = (n: number) => Array.from({ length: n }, (_, i) => ({ personaje: M.PERSONAJES[i % 8] }));
const mision = (id: number, n: number, semilla: string) => M.crearMision({ mision: id, personajes: personajes(n), semilla });

Deno.test("brigada-red: foto de 8 personajes con 24 enemigos y 16 proyectiles < 1700 B (sobre de 2048)", () => {
  const m = mision(3, 8, "foto");
  m.estado = "juego";
  for (let k = 0; k < 40; k++) M.ponerEnemigo(m, Object.keys(M.ENEMIGOS)[k % 6], 100 + k * 12, k % 3 ? 0 : 120);
  for (let k = 0; k < 30; k++) { const b = m.balasE[k]; Object.assign(b, { vivo: true, id: 9000 + k, x: 50 + k * 13, y: 150, vx: -100, vy: 0, tipo: "tuerca", r: 4, vida: 5, w: 0 }); }
  m.avisos.slice(0, 6).forEach((a: any, k: number) => Object.assign(a, { vivo: true, tipo: "sombra", x: 40 * k, y: 230, w: 26, t: 0.5, total: 0.7 }));
  m.jugadores.forEach((p: any) => { p.puntos = 99999; p.mun = { rafaga: 150, abanico: 40, laser: 80 }; });
  const ev = Array.from({ length: 30 }, (_, k) => R.eventoRed({ tipo: "boom", x: 123, y: 45, enemigo: "patrulla", i: 3 }, 99000 + k));
  const f = R.foto(M, m, { q: 99999, t: 1234567, a: m.jugadores.map(() => 9999), ia: 255, ev });
  // Lo lento viaja aparte (al cambiar o cada segundo) y también cabe holgado.
  const lento = R.lentoFoto(M, m);
  assert(bytes(lento) < 900, "lento de " + bytes(lento) + " B");
  const tam = bytes(f);
  assertEquals(f.n.length / 5, R.MAX_ENEMIGOS);
  assertEquals(f.p.length / 5, R.MAX_BALAS);
  assert(tam < 1700, "foto de " + tam + " B");
  assert(R.leerFoto(structuredClone(f), 8));
  assertEquals(R.leerFoto({ j: [1, 2, 3], n: [], p: [] }, 8), null);
});

Deno.test("brigada-red: la entrada pesa < 70 B y cuenta las presiones de A, X e Y", () => {
  const m = R.empacarEntrada({ x: 0.5, y: -1.7, a: true, b: true, c4: true }, 12, { na: 65, nx: 3, ny: 0 });
  assertEquals(m, { s: 12, x: 50, y: -100, m: 7, na: 1, nx: 3, ny: 0 });
  assert(bytes(m) < 70);
  assertEquals(R.leerEntrada(m), { x: 0.5, y: -1, a: true, b: true, c4: true, na: 1, nx: 3, ny: 0 });
  assertEquals(R.presiones(62, 1), 3);
});

// Misión en red: el anfitrión (personaje 0) y los invitados corren cada uno su página. Cada persona juega con el piloto
// automático (calculado sobre la misión del anfitrión, para que el equipo avance) y lo manda por su canal.
async function misionEnRed(id: number, n: number, red: { latencia: number; perdida: number; desorden: number }, semilla: string, extra: (k: number, x: any) => void = () => {}, maxSeg = 400) {
  let reloj = 0;
  const ahora = () => reloj;
  const ids = Array.from({ length: n }, (_, i) => "p" + i);
  const hzEnt = R.hzEntrada(n);
  const rs = EV.redSimulada({ reloj: ahora, latencia: red.latencia, variacion: red.desorden * Math.max(100, 2 * red.latencia), perdida: red.perdida, azar: M.rng("red-" + semilla) });
  const cs = await Promise.all(ids.map((id) => EV.conectar({ transporte: rs.transporte(id), yo: { id }, participantes: ids, hz: id === "p0" ? R.HZ_FOTO : hzEnt, reloj: ahora, manual: true })));
  const m0 = mision(id, n, semilla);
  const anf = R.anfitrion({ canal: cs[0], m: m0, M, ids, yo: 0, ahora });
  const sombras = ids.slice(1).map(() => mision(id, n, semilla));
  const invs = sombras.map((m: any, k: number) => R.invitado({ canal: cs[k + 1], m, M, anfitrion: "p0", yo: k + 1, ahora, hz: hzEnt }));
  const errores: number[] = [], coincidencias: number[] = [], eventos = invs.map(() => new Set<string>());
  const PASO_MS = 1000 / 60;
  let k = 0;
  for (; k < 60 * maxSeg && m0.estado !== "cumplida"; k++) {
    reloj = k * PASO_MS;
    extra(k, { rs, anf, invs, ids, reloj, m0 });
    if (m0.estado === "fallida") M.reintentar(m0);
    anf.paso(M.ia(m0, 0));
    anf.enviarSiToca();
    invs.forEach((inv: any, j: number) => {
      const e = M.ia(m0, j + 1);
      inv.entrada({ ...e, ga: e.ga, gx: e.gx, gy: e.gy });
      const d = inv.dibujar(PASO_MS / 1000);
      if (d) for (const ev of d.eventos) eventos[j].add(ev.tipo);
    });
    rs.entregar();
    if (k % 30 === 0 && k > 120) {
      invs.forEach((inv: any, j: number) => {
        const p = sombras[j].jugadores[j + 1], q = m0.jugadores[j + 1];
        if (p.estado === "vivo" && q.estado === "vivo" && inv.pred.lista) errores.push(Math.abs(p.x - q.x));
        const a = new Set(m0.enemigos.filter((e: any) => e.vivo).map((e: any) => e.id)), b = sombras[j].enemigos.filter((e: any) => e.vivo).map((e: any) => e.id);
        if (a.size) coincidencias.push(b.filter((x: number) => a.has(x)).length / Math.min(a.size, R.MAX_ENEMIGOS));
      });
    }
  }
  // Un segundo más para que lleguen las últimas fotos.
  for (let z = 0; z < 120; z++) { reloj = (k + z) * PASO_MS; anf.enviarSiToca(); invs.forEach((inv: any) => inv.dibujar(PASO_MS / 1000)); rs.entregar(); }
  const seg = (k + 120) * PASO_MS / 1000;
  const envios = cs.reduce((s: number, c: any) => s + c.estadisticas().enviados, 0) / seg;
  const ord = errores.slice().sort((a, b) => a - b);
  return { m0, sombras, invs, anf, eventos, envios, p90: ord[Math.floor(ord.length * 0.9)] ?? 0, mediana: ord[Math.floor(ord.length / 2)] ?? 0, coincidencia: coincidencias.reduce((s, x) => s + x, 0) / Math.max(1, coincidencias.length), seg };
}

Deno.test("brigada-red: misión 1 con 4 personas en red (120 ms, 5 % de pérdida): mismos enemigos, jefe vencido visto por todos", async () => {
  const r = await misionEnRed(1, 4, { latencia: 120, perdida: 0.05, desorden: 0.2 }, "cuatro");
  assertEquals(r.m0.estado, "cumplida");
  r.sombras.forEach((s: any, j: number) => assertEquals(s.estado, "cumplida", "invitado " + (j + 1)));
  r.eventos.forEach((e, j) => assert(e.has("jefeFin") && e.has("boom"), "invitado " + (j + 1) + ": " + [...e].join(",")));
  assert(r.coincidencia > 0.8, "enemigos iguales: " + r.coincidencia.toFixed(2));
  // El personaje predicho va adelantado a lo que simula el anfitrión una latencia + un intervalo de entrada + el
  // retraso de dibujo: a 120 px/s y 120 ms eso es ≈ 36 px. Se pide que no pase de 48 px (p90).
  assert(r.p90 < 48, "personaje propio predicho: p90 " + r.p90.toFixed(1) + " px, mediana " + r.mediana.toFixed(1));
  // Puntos del equipo: los invitados ven los del anfitrión (lo lento llega al cambiar).
  r.sombras.forEach((s: any) => assertEquals(s.jugadores.map((p: any) => p.puntos), r.m0.jugadores.map((p: any) => p.puntos)));
  console.log(`4 personas: ${r.envios.toFixed(1)} envíos/s, p90 ${r.p90.toFixed(1)} px, coincidencia ${r.coincidencia.toFixed(2)}, foto máx ${Math.max(...r.anf.st.bytes)} B`);
});

Deno.test("brigada-red: misión 2 con 8 personas en red (80 ms): termina, presupuesto del canal y foto máxima", async () => {
  const r = await misionEnRed(2, 8, { latencia: 80, perdida: 0.03, desorden: 0.1 }, "ocho");
  assertEquals(r.m0.estado, "cumplida");
  r.sombras.forEach((s: any) => assertEquals(s.estado, "cumplida"));
  const maxFoto = Math.max(...r.anf.st.bytes), prom = r.anf.st.bytes.reduce((s: number, x: number) => s + x, 0) / r.anf.st.bytes.length;
  assert(maxFoto < 1700, "foto máx " + maxFoto);
  assert(r.envios < 95, "envíos por sala/s: " + r.envios.toFixed(1));
  assert(r.coincidencia > 0.8, "coincidencia " + r.coincidencia.toFixed(2));
  console.log(`8 personas: ${r.envios.toFixed(1)} envíos/s, foto prom ${prom.toFixed(0)} B y máx ${maxFoto} B, p90 ${r.p90.toFixed(1)} px, coincidencia ${r.coincidencia.toFixed(2)}`);
});

Deno.test("brigada-red: desconexión (la IA toma el personaje y lo devuelve) y caída del anfitrión", async () => {
  let caidoVisto = false, regreso = false, invCaido = false, cierra = false;
  await misionEnRed(4, 3, { latencia: 60, perdida: 0, desorden: 0 }, "corte", (k, x) => {
    if (k === 600) x.rs.cortar("p2");
    if (k > 600 && k < 1100 && x.anf.caidos().includes(2)) caidoVisto = true;
    if (k === 1100) x.rs.reanudar("p2");
    if (k > 1200 && caidoVisto && !x.anf.caidos().includes(2)) regreso = true;
    if (k === 1500) x.rs.cortar("p0");
    if (k > 1500 && x.invs[0].anfitrionCaido() !== null) invCaido = true;
    if (k > 1500 + 60 * 16 && x.invs[0].cerrarPorCaida()) cierra = true;
  }, 50);
  assert(caidoVisto, "la IA toma al desconectado");
  assert(regreso, "vuelve a su persona");
  assert(invCaido && cierra, "los invitados detectan la caída del anfitrión y cierran a los 15 s");
});
