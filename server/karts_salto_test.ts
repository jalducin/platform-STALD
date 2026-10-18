// Salto de Karts (openspec: karts-salto): brinco corto con enfriamiento, giro suave en el aire, esquiva de cáscara y
// bola (no del cohete, el rayo ni la roca), salto + giro = derrape y, sobre todo, que el brinco NO es el aire de una
// rampa: no cruza los huecos del espacio ni el cenote, no acelera y no toca el conteo de vueltas.
// deno-lint-ignore-file no-explicit-any
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-pistas.js";
import "../juegos/arcade.js";
import "../juegos/karts-salto.js";

const g = globalThis as any;
const KS = g.KartsSalto, KP = g.KartsPistas, A = g.Arcade;
const DT = 1 / 60;
const kart = (o: any = {}) => ({ brinco: 0, brincoEnf: 0, aplasta: 0, aire: 0, cae: 0, remolque: 0, giro: 0, termino: null, vel: 230, idx: 50, vuelta: 0, mitadOk: false, derrape: null, ...o });
// Corre el brinco completo y devuelve los segundos en el aire y la altura máxima.
function brincoCompleto(k: any) {
  let t = 0, alto = 0, cayo = false;
  while (!cayo && t < 3) { cayo = KS.paso(k, DT) === "aterriza"; alto = Math.max(alto, KS.altura(k)); t += DT; }
  return { t, alto };
}

Deno.test("salto: brinco corto (0.35–0.45 s), bajito y con aplastón al caer", () => {
  const k = kart();
  assert(KS.iniciar(k), "en el piso se puede brincar");
  assert(KS.enAire(k));
  const { t, alto } = brincoCompleto(k);
  assert(t >= 0.35 && t <= 0.45 + DT, "dura " + t.toFixed(3) + " s");
  assert(alto > 10 && alto <= KS.ALTO && KS.ALTO < 22, "más bajito que la rampa (22 px): " + alto.toFixed(1));
  assertEquals(KS.altura(k), 0, "ya en el piso");
  assert(KS.aplastado(k) > 0, "aplastón al caer");
  for (let i = 0; i < 20; i++) KS.paso(k, DT);
  assertEquals(KS.aplastado(k), 0, "el aplastón dura poco");
});

Deno.test("salto: enfriamiento de ~0.6 s después de caer (no se puede spamear)", () => {
  const k = kart();
  KS.iniciar(k);
  assertEquals(KS.iniciar(k), false, "en el aire no brinca otra vez");
  brincoCompleto(k);
  assertEquals(KS.iniciar(k), false, "justo al caer no brinca");
  let t = 0;
  while (!KS.puede(k) && t < 3) { KS.paso(k, DT); t += DT; }
  assert(t >= 0.5 && t <= 0.7, "enfriamiento " + t.toFixed(2) + " s");
  assert(KS.iniciar(k), "pasado el enfriamiento sí");
  // Brincos por segundo con el botón apretado sin parar: a lo más 1.
  const s = kart();
  let n = 0;
  for (let i = 0; i < 600; i++) { if (KS.iniciar(s)) n++; KS.paso(s, DT); }
  assert(n <= 10, "10 s apretando: " + n + " brincos");
});

Deno.test("salto: no brinca con rampa, cayendo, con el dron, girando por un golpe ni al terminar", () => {
  for (const o of [{ aire: 0.3 }, { cae: 0.5 }, { remolque: 1 }, { giro: 0.5 }, { termino: 90000 }]) {
    const k = kart(o);
    assertEquals(KS.iniciar(k), false, JSON.stringify(o));
    assertEquals(k.brinco, 0);
  }
  // Si cae al vacío a medio brinco, el brinco se cancela (cancelar lo usa caer()).
  const k = kart(); KS.iniciar(k); KS.paso(k, 0.1); KS.cancelar(k);
  assertEquals(KS.altura(k), 0);
});

Deno.test("salto: no acelera ni toca vueltas, muestra ni el aire de rampa", () => {
  const k = kart({ idx: 399, vuelta: 1, mitadOk: true });
  const antes = JSON.stringify({ vel: k.vel, idx: k.idx, vuelta: k.vuelta, mitadOk: k.mitadOk, aire: k.aire });
  KS.iniciar(k);
  for (let i = 0; i < 40; i++) {
    KS.paso(k, DT);
    assertEquals(KS.enAireDeRampa(k), false, "el brinco nunca cuenta como aire de rampa");
  }
  assertEquals(JSON.stringify({ vel: k.vel, idx: k.idx, vuelta: k.vuelta, mitadOk: k.mitadOk, aire: k.aire }), antes);
  assertEquals(KS.enAireDeRampa(kart({ aire: 0.2 })), true, "la rampa sí");
});

Deno.test("salto: no cruza los huecos del espacio sin rampa (a la punta con turbo, brincando justo antes)", () => {
  const VEL = A.VEL_KART * 1.35 * 1.25; // punta con turbo y el mejor equipo, de sobra
  let huecos = 0;
  for (const id of ["orbital", "anillos", "cinturon", "nebulosa"]) {
    const p = A.pistaPorId(id), M = A.muestrearPista(p), zonas = KP.colocarMecanicas(p, M), marcas = KP.marcasEspacio(p, M, zonas);
    const n = M.pts.length, paso = Math.hypot(M.pts[1].x - M.pts[0].x, M.pts[1].y - M.pts[0].y);
    for (const z of zonas.filter((x: any) => x.tipo === "brecha")) {
      huecos++;
      // Brinca a distintas distancias antes del hueco y avanza por el centro (sin pasar por la rampa: k.aire = 0).
      for (let antes = 0; antes <= 6; antes++) {
        const k = kart({ idx: (z.i0 - antes + n) % n });
        let dist = 0, cae = false;
        KS.iniciar(k);
        for (let t = 0; t < 1.2 && !cae; t += DT) {
          KS.paso(k, DT);
          dist += VEL * DT;
          k.idx = (z.i0 - antes + Math.floor(dist / paso) + n) % n;
          // Regla de bordeEspacio (karts.html): con hueco y sin aire de rampa, cae.
          if ((marcas[k.idx] & KP.MARCA.HUECO) && !KS.enAireDeRampa(k)) cae = true;
        }
        assert(cae, id + " hueco en " + z.i0 + ": brincando " + antes + " muestras antes también cae");
      }
    }
  }
  assert(huecos >= 4, "hay huecos que revisar: " + huecos);
});

Deno.test("salto: no cruza el cenote ni salva del lodo (te mojas o te frenas igual)", () => {
  const p = A.pistaPorId("chichen"), M = A.muestrearPista(p), zonas = KP.colocarMecanicas(p, M);
  const cenotes = zonas.filter((z: any) => z.tipo === "cenote");
  assert(cenotes.length >= 1);
  for (const z of cenotes) {
    // Cruzando el cenote por el centro a la punta: siempre hay pasos dentro del agua sin aire de rampa.
    const k = kart();
    KS.iniciar(k);
    let mojado = 0;
    for (let d = -60; d <= 60; d += 4) {
      KS.paso(k, DT);
      const dentro = Math.abs(d) < z.r;
      if (dentro && !KS.enAireDeRampa(k) && !KS.esquiva(k, "cenote")) mojado++;
    }
    assert(mojado > 10, "se moja: " + mojado);
  }
  const k = kart(); KS.iniciar(k); KS.paso(k, 0.2);
  assertEquals(KS.esquiva(k, "lodo"), false, "el lodo frena aunque brinques");
});

Deno.test("salto: esquiva cáscara y bola en lo alto; no el cohete, el rayo, los bloques ni la roca", () => {
  const k = kart();
  assertEquals(KS.esquiva(k, "cascara"), false, "en el piso te pega");
  KS.iniciar(k);
  KS.paso(k, 0.01);
  assertEquals(KS.esquiva(k, "cascara"), false, "apenas despegando todavía te pega");
  KS.paso(k, 0.19); // arriba
  for (const t of ["cascara", "bola"]) assertEquals(KS.esquiva(k, t), true, t);
  for (const t of ["cohete", "rayo", "bloques", "roca", "hueco", "cenote", "lodo", "trajinera", "asteroide"]) assertEquals(KS.esquiva(k, t), false, t);
  // La ventana para esquivar es la parte central del brinco (≈ 0.2–0.3 s): hay que medir el momento.
  const v = kart(); KS.iniciar(v);
  let arriba = 0;
  for (let i = 0; i < 30; i++) { KS.paso(v, DT); if (KS.esquiva(v, "cascara")) arriba += DT; }
  assert(arriba > 0.18 && arriba < 0.32, "ventana " + arriba.toFixed(2) + " s");
});

Deno.test("salto: en el aire el giro es suave (salvo que ya vengas derrapando)", () => {
  const k = kart();
  assertEquals(KS.giroEnAire(1, k), 1, "en el piso, giro completo");
  KS.iniciar(k); KS.paso(k, 0.1);
  assertAlmostEquals(KS.giroEnAire(1, k), KS.GIRO_AIRE, 1e-9);
  assert(KS.GIRO_AIRE <= 0.5);
  k.derrape = { dir: 1 };
  assertEquals(KS.giroEnAire(-1, k), -1, "derrapando no cambia");
});

Deno.test("salto + giro al caer = derrape (con DERRAPE o mantenido el salto); en el aire no empieza", () => {
  const k = kart();
  KS.iniciar(k); KS.paso(k, 0.1);
  assertEquals(KS.derrapa({ derrape: false, salto: true }, k), false, "en el aire, el salto mantenido no empieza el derrape");
  assertEquals(KS.derrapa({ derrape: true, salto: true }, k), true, "ESPACIO / R del mando: el derrape de siempre");
  brincoCompleto(k);
  assertEquals(KS.derrapa({ derrape: false, salto: true }, k), true, "al caer con el salto mantenido: derrape");
  assertEquals(KS.derrapa({ derrape: false, salto: false }, k), false, "soltando: sin derrape");
  assertEquals(KS.derrapa({ derrape: true, salto: false }, kart()), true, "el botón DERRAPE sigue igual");
});
