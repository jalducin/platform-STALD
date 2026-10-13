// Personajes de Arcade (openspec: personajes-estilo-karts). Prueba el mismo archivo que cargan Axo y Karts
// (juegos/personajes.js). Sin DOM: el dibujo se prueba con un contexto de canvas falso que cuenta rellenos y trazos.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";

const nada = () => undefined; // trazos y degradados falsos: no dibujan nada
(globalThis as any).Path2D ??= function () { return new Proxy({}, { get: () => nada }); };
await import("../juegos/personajes.js");
const P = (globalThis as any).Personajes;

// Contexto de canvas falso: acepta cualquier método o propiedad, cuenta rellenos y trazos y anota colores inválidos.
function lienzo() {
  const cuenta = { fill: 0, stroke: 0, error: "" };
  const grad = { addColorStop: nada };
  const ctx: any = new Proxy({}, {
    get(o: any, k: string) {
      if (k in o) return o[k];
      if (k === "fill" || k === "stroke") return () => { cuenta[k]++; };
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad;
      if (k === "measureText") return () => ({ width: 10 });
      return nada;
    },
    set(o: any, k: string, v: unknown) {
      if ((k === "fillStyle" || k === "strokeStyle") && typeof v === "string" && !/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v)) cuenta.error = k + "=" + v;
      o[k] = v;
      return true;
    },
  });
  return { ctx, cuenta };
}
const HEX = /^#[0-9a-f]{6}$/i;
const NUEVOS = ["xolo", "tlali", "tona", "kinich"];
const POSES = ["quieto", "camina", "salta", "cae", "aterriza", "dano", "pierde", "gana"];

Deno.test("personajes: los 8 con datos completos, en el orden del selector", () => {
  assertEquals(P.LISTA.map((p: any) => p.id), ["xalli", "itzae", "yahui", "xochiquetzal", ...NUEVOS]);
  for (const p of P.LISTA) {
    assert(p.nombre && p.titulo && p.personalidad && p.emoji, p.id + ": nombre, título, personalidad y emoji");
    assert(["ligero", "medio", "pesado"].includes(p.peso), p.id + ": peso");
    assert(HEX.test(p.firma), p.id + ": firma");
    for (const k of ["cuerpo", "acento", "oscuro", "ropa"]) assert(HEX.test(p.kart[k]), p.id + ": kart." + k);
    assert(p.piel.base && p.piel.fuego, p.id + ": paletas base y fuego");
    assert(Array.isArray(p.estela) && p.estela.length >= 2 && p.estela.every((c: string) => HEX.test(c)), p.id + ": colores de la estela");
    assert(Array.isArray(p.encuadre) && p.encuadre.length === 2, p.id + ": encuadre del retrato");
  }
  assertEquals(new Set(P.LISTA.map((p: any) => p.particula)).size, 8, "una partícula distinta por personaje");
  assertEquals(new Set(P.LISTA.map((p: any) => p.nombre)).size, 8);
  // Los rivales: con cualquiera elegido quedan 7 personajes libres, uno por rival.
  for (const p of P.LISTA) assertEquals(P.LISTA.filter((x: any) => x.id !== p.id).length, 7);
});

Deno.test("personajes: peso estilo karts que solo reparte el empuje de los choques", () => {
  assertEquals(new Set(P.LISTA.map((p: any) => p.peso)).size, 3);
  assertEquals(P.porId("xolo").peso, "ligero");
  assertEquals(P.porId("tlali").peso, "ligero");
  assertEquals(P.porId("tona").peso, "pesado");
  assertEquals(P.porId("kinich").peso, "medio");
  assertEquals(P.masa("tona"), P.MASA.pesado);
  assertEquals(P.masa("desconocido"), P.MASA.medio); // normaliza a Xalli (medio)
  assert(P.MASA.ligero < P.MASA.medio && P.MASA.medio < P.MASA.pesado);
  // Reparto: entre iguales, mitad y mitad (como antes); el ligero se mueve más que el pesado; siempre suma 1.
  assertEquals(P.repartoChoque(1, 1), [0.5, 0.5]);
  const [xolo, tona] = P.repartoChoque(P.masa("xolo"), P.masa("tona"));
  assert(xolo > tona, "el ligero sale más empujado");
  assert(Math.abs(xolo + tona - 1) < 1e-9);
  // El peso no es estadística de velocidad: los datos del personaje no traen aceleración ni velocidad.
  for (const p of P.LISTA) for (const k of ["acel", "velocidad", "top", "giro"]) assertEquals(p[k], undefined, p.id + "." + k);
});

Deno.test("personajes: cada pose y cada poder se dibuja sin errores y con detalle", () => {
  for (const p of P.LISTA) {
    for (const poder of ["base", "grande", "fuego"]) {
      for (const pose of POSES) {
        const { ctx, cuenta } = lienzo();
        P.pintar(ctx, p.id, { pose, fase: 1.2, t: 0.7, poder });
        assertEquals(cuenta.error, "", p.id + " " + pose + " " + poder);
        assert(cuenta.fill >= 20, p.id + " " + pose + " " + poder + ": " + cuenta.fill + " rellenos");
      }
    }
  }
});

Deno.test("personajes: piloto de espaldas y partícula de los 4 nuevos", () => {
  for (const id of NUEVOS) {
    const pil = P.piloto(id);
    assert(pil && typeof pil.cabeza === "function", id + ": cabeza de piloto");
    for (const vista of [0, 8, 16, 24]) {
      const { ctx, cuenta } = lienzo();
      const rel = vista / 32 * Math.PI * 2, cr = Math.cos(rel), sr = Math.sin(rel);
      const S = (x: number, y: number, z: number) => ({ x: x * sr + y * cr, y: -z, d: x * cr - y * sr });
      pil.cabeza(ctx, S, cr, sr, [-2.5, 0, 17.6]);
      if (pil.extra) pil.extra.pintar(ctx, S);
      assertEquals(cuenta.error, "", id + " vista " + vista);
      assert(cuenta.fill + cuenta.stroke >= 6, id + " vista " + vista);
    }
    const per = P.porId(id), { ctx, cuenta } = lienzo();
    assert(P.pintarParticula(ctx, per.particula, 0, 0, 2, 0.5, per.estela[0]), id + ": pintarParticula");
    assert(cuenta.fill + cuenta.stroke >= 1);
  }
  assertEquals(P.piloto("xalli"), null); // las 4 originales siguen en karts.html
  assertEquals(P.pintarParticula(lienzo().ctx, "burbujas", 0, 0, 2, 0, "#ffffff"), false);
});
