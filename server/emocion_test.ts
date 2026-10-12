// Emoción sonora (openspec: emocion-sonora): pruebas del módulo juegos/emocion.js con un AudioContext falso que anota
// cada oscilador y ruido programado (frecuencia y momento). Sin navegador: el mismo archivo que cargan los juegos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/emocion.js";

const Em = (globalThis as any).Emocion;

// ---- Dobles de WebAudio ----
type Inicio = { tipo: string; t: number; f: number };
let inicios: Inicio[] = [];
let creados = 0;
class Param {
  value = 0;
  llamadas: string[] = [];
  setValueAtTime(v: number) { this.value = v; this.llamadas.push("set"); }
  exponentialRampToValueAtTime(v: number) { this.value = v; this.llamadas.push("exp"); }
  linearRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number, t: number) { this.llamadas.push("target:" + v + "@" + t.toFixed(2)); }
  cancelScheduledValues() { this.llamadas.push("cancel"); }
}
class Nodo {
  connect() {}
  disconnect() {}
}
class Osc extends Nodo {
  type = "sine";
  frequency = new Param();
  detune = new Param();
  start(t: number) { inicios.push({ tipo: "osc:" + this.type, t, f: this.frequency.value }); }
  stop() {}
}
class Fuente extends Nodo {
  buffer: unknown = null;
  loop = false;
  start(t: number) { inicios.push({ tipo: "ruido", t, f: 0 }); }
  stop() {}
}
class FalsoContexto {
  currentTime = 10;
  sampleRate = 8000;
  state = "running";
  destination = new Nodo();
  constructor() { creados++; }
  createOscillator() { return new Osc(); }
  createGain() { const n: any = new Nodo(); n.gain = new Param(); n.gain.value = 1; return n; }
  createBiquadFilter() { const n: any = new Nodo(); n.frequency = new Param(); n.Q = new Param(); n.type = ""; return n; }
  createDynamicsCompressor() { const n: any = new Nodo(); for (const k of ["threshold", "ratio", "attack", "release"]) n[k] = new Param(); return n; }
  createBuffer(_c: number, n: number) { const d = new Float32Array(n); return { getChannelData: () => d }; }
  createBufferSource() { return new Fuente(); }
  resume() { this.state = "running"; return Promise.resolve(); }
}
const memoria = (x: Record<string, string> = {}) => ({ getItem: (k: string) => (k in x ? x[k] : null), setItem: (k: string, v: string) => { x[k] = v; } });
function preparar(o: Record<string, unknown> = {}) {
  inicios = []; creados = 0;
  Em._probar({ AudioContext: FalsoContexto, almacen: memoria(), gesto: true, ...o });
}
const ultimo = () => Em.eventos().at(-1);

Deno.test("emocion: expone todos los stingers y cada receta devuelve una duración razonable", () => {
  preparar();
  for (const n of ["gol", "victoria", "derrota", "record", "nivelSuperado", "logro", "cuentaRegresiva", "ultimoSegundos", "suspenso", "revelacion", "acierto", "error", "racha", "silbato", "campana", "canto", "revancha", "podio"]) {
    assertEquals(typeof Em[n], "function", n);
    const c = new FalsoContexto();
    const d = Em.renderizar(n, c, { n: 3, lugar: 1, ms: 1500 });
    assert(d > 0.15 && d < 12, n + " dura " + d);
  }
  assertEquals(typeof Em.intensidad, "function");
  Em._reiniciar();
});

Deno.test("emocion: gol programa tribuna (ruido) y fanfarria (metales) y anota el evento", () => {
  preparar();
  assert(Em.gol({ voz: false }));
  const e = ultimo();
  assertEquals([e.ev, e.sono, e.motivo], ["gol", true, ""]);
  assert(inicios.filter(x => x.tipo === "ruido").length >= 2, "tribuna");
  const metales = inicios.filter(x => x.tipo === "osc:sawtooth");
  assert(metales.length >= 8, "fanfarria: " + metales.length);
  assert(inicios.every(x => x.t >= 10), "todo se programa desde el tiempo actual del contexto");
  Em._reiniciar();
});

Deno.test("emocion: cuenta regresiva 3-2-1-¡YA! un segundo aparte y el ¡YA! más agudo", () => {
  preparar();
  Em.cuentaRegresiva(3);
  const bips = inicios.filter(x => x.tipo === "osc:square").sort((a, b) => a.t - b.t);
  assertEquals(bips.length, 4);
  const t0 = bips[0].t;
  assertEquals(bips.map(b => Math.round(b.t - t0)), [0, 1, 2, 3]);
  assertEquals(bips.slice(0, 3).map(b => b.f), [440, 440, 440]);
  assertEquals(bips[3].f, 880);
  Em._reiniciar();
});

Deno.test("emocion: la racha sube de tono con cada acierto y tiene tope", () => {
  preparar();
  const primera = (n: number) => { inicios = []; Em._reiniciar(); Em._probar({ AudioContext: FalsoContexto, almacen: memoria(), gesto: true }); Em.racha(n); return inicios[0].f; };
  const f2 = primera(2), f5 = primera(5), f12 = primera(12), f40 = primera(40);
  assert(f2 < f5 && f5 < f12, JSON.stringify({ f2, f5, f12 }));
  assertEquals(f40, f12);
  Em._reiniciar();
});

Deno.test("emocion: silencio de Arcade, «Efectos de emoción» y silencio de la página no suenan (pero se anotan)", () => {
  for (const almacen of [memoria({ arcade_sonido: "0" }), memoria({ juegos_emocion: "0" })]) {
    preparar({ almacen });
    assertEquals(Em.gol({ voz: false }), false);
    assertEquals([ultimo().ev, ultimo().sono, ultimo().motivo], ["gol", false, "silencio"]);
    assertEquals(inicios.length, 0);
    assertEquals(creados, 0, "ni siquiera crea el AudioContext");
    assert(Em.silenciado());
  }
  preparar();
  Em.silencio(true);
  assertEquals(Em.victoria(), false);
  assertEquals(ultimo().motivo, "silencio");
  Em.silencio(false);
  assert(Em.victoria());
  Em._reiniciar();
});

Deno.test("emocion: sin gesto no suena (política de reproducción automática)", () => {
  preparar({ gesto: false });
  assertEquals(Em.record(), false);
  assertEquals(ultimo().motivo, "sin-gesto");
  assertEquals(creados, 0);
  Em._reiniciar();
});

Deno.test("emocion: sin AudioContext (o si falla al crearse) no lanza errores", () => {
  preparar({ AudioContext: null });
  for (const n of ["gol", "victoria", "derrota", "podio", "suspenso"]) assertEquals(Em[n](n === "gol" ? { voz: false } : 1), false);
  assertEquals(ultimo().motivo, "sin-audio");
  Em.intensidad(0.8);
  assertEquals(Em.estado().tensionActiva, false);
  Em.calma();
  preparar({ AudioContext: class { constructor() { throw new Error("no permitido"); } } });
  assertEquals(Em.logro(), false);
  assertEquals(ultimo().motivo, "sin-audio");
  Em._reiniciar();
});

Deno.test("emocion: el mismo stinger seguido se anota como repetido (no se amontona)", () => {
  preparar();
  assert(Em.gol({ voz: false }));
  assertEquals(Em.gol({ voz: false }), false);
  assertEquals(ultimo().motivo, "repetido");
  assert(Em.acierto(), "otro stinger sí suena");
  Em._reiniciar();
});

Deno.test("emocion: los stingers grandes bajan la música (ducking); los chicos no", () => {
  const bajadas: number[] = [];
  preparar({ agachar: (ms: number) => bajadas.push(ms) });
  Em.acierto();
  assertEquals(bajadas.length, 0);
  Em.victoria();
  assertEquals(bajadas.length, 1);
  assert(bajadas[0] >= 1500 && bajadas[0] <= 2500, String(bajadas[0]));
  assertEquals(Em.estado().agachados, 1);
  Em._reiniciar();
});

Deno.test("emocion: la capa de tensión sube, programa latidos más rápidos y se apaga con 0, silencio o calma", () => {
  preparar();
  Em.intensidad(0.3);
  assert(Em.estado().tensionActiva);
  const lentos = inicios.filter(x => x.tipo === "osc:sine" && x.f === 64).length;
  Em._reiniciar(); preparar();
  Em.intensidad(1);
  const rapidos = inicios.filter(x => x.tipo === "osc:sine" && x.f === 64).length;
  assert(rapidos >= lentos, JSON.stringify({ lentos, rapidos }));
  assertEquals(ultimo().ev, "intensidad");
  // Un cambio pequeño no llena el registro.
  const n = Em.eventos().length;
  Em.intensidad(0.99);
  assertEquals(Em.eventos().length, n);
  Em.intensidad(0);
  assertEquals(Em.estado().tensionActiva, false);
  Em.intensidad(0.8);
  Em.silencio(true);
  assertEquals(Em.estado().tensionActiva, false);
  Em.silencio(false);
  Em.intensidad(0.8);
  Em.calma();
  assertEquals([Em.estado().tensionActiva, Em.estado().intensidad], [false, 0]);
  Em._reiniciar();
});

Deno.test("emocion: el registro guarda a lo más 200 eventos y se puede limpiar", () => {
  preparar({ gesto: false });
  for (let i = 0; i < 250; i++) Em.acierto();
  assertEquals(Em.eventos().length, 200);
  Em.limpiar();
  assertEquals(Em.eventos().length, 0);
  Em._reiniciar();
});
