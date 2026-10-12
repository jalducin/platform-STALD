// Forma de juegos/datos/ingles.json (openspec: juegos-ingles-gramatica): temas válidos, traducción, `correcta` en
// rango, opciones sin repetir, regla corta y mínimos por tema y por grupo del selector.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";

const d = JSON.parse(await Deno.readTextFile(new URL("../juegos/datos/ingles.json", import.meta.url)));

const TIEMPOS = ["to be", "to be pasado", "presente simple", "pasado simple", "futuro will"];
const OTROS = ["wh", "posesivos", "articulos", "plurales", "demostrativos", "adjetivos"];
const CONVERSACION = ["personal", "familia", "gustos", "rutina", "tiempo-fechas", "lugares", "cosas-colores", "comida", "clima", "habilidades", "cortesia"];
const TEMAS = {
  verbos: [...TIEMPOS, ...OTROS],
  oraciones: [...TIEMPOS, ...OTROS, "general"],
  preguntas: [...TIEMPOS, ...CONVERSACION],
  tiempos: ["regular", "irregular", "to be"],
};
// Grupos del selector (igual que juegos/ingles-gramatica.js).
const GRUPOS: Record<string, string[]> = {
  tobe: ["to be", "to be pasado"],
  presente: ["to be", "presente simple"],
  pasado: ["to be pasado", "pasado simple"],
  futuro: ["futuro will"],
};
const texto = (x: unknown) => typeof x === "string" && x.trim().length > 0;

Deno.test("ingles.json: cada elemento con tema válido y traducción", () => {
  for (const [clave, validos] of Object.entries(TEMAS)) {
    assert(Array.isArray(d[clave]), clave);
    for (const x of d[clave]) {
      assert(validos.includes(x.tema), `${clave}: tema inválido «${x.tema}» en ${JSON.stringify(x).slice(0, 80)}`);
      assert(texto(x.es), `${clave}: falta es en ${JSON.stringify(x).slice(0, 80)}`);
    }
  }
});

Deno.test("ingles.json: verbos con 3 opciones distintas, correcta en rango, ___ y regla corta", () => {
  for (const v of d.verbos) {
    const k = v.frase;
    assert(texto(v.frase) && v.frase.includes("___"), k);
    assertEquals(v.opciones.length, 3, k);
    assertEquals(new Set(v.opciones).size, 3, "opciones repetidas: " + k);
    assert(Number.isInteger(v.correcta) && v.correcta >= 0 && v.correcta < v.opciones.length, k);
    assert(texto(v.regla) && v.regla.length <= 90, "regla: " + k);
  }
  const frases = d.verbos.map((v: any) => v.frase);
  assertEquals(new Set(frases).size, frases.length, "frases repetidas");
});

Deno.test("ingles.json: al menos 40 frases por tema de tiempo en verbos", () => {
  for (const t of TIEMPOS) {
    const n = d.verbos.filter((v: any) => v.tema === t).length;
    assert(n >= 40, `${t}: ${n} frases`);
  }
  // Las respuestas correctas no siempre van en la misma posición
  for (const t of TIEMPOS) assert(new Set(d.verbos.filter((v: any) => v.tema === t).map((v: any) => v.correcta)).size === 3, t);
});

Deno.test("ingles.json: preguntas con 4 opciones distintas y correcta en rango", () => {
  for (const p of d.preguntas) {
    assertEquals(p.opciones.length, 4, p.pregunta);
    assertEquals(new Set(p.opciones).size, 4, "opciones repetidas: " + p.pregunta);
    assert(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4, p.pregunta);
    if (TIEMPOS.includes(p.tema)) assert(texto(p.regla) && p.regla.length <= 90, "regla: " + p.pregunta);
  }
});

Deno.test("ingles.json: oraciones de 3 a 9 palabras, sin punto final", () => {
  for (const o of d.oraciones) {
    const n = o.en.split(/\s+/).length;
    assert(n >= 3 && n <= 9, o.en);
    assert(!/[.!?]$/.test(o.en), "sin punto final: " + o.en);
  }
});

Deno.test("ingles.json: cada grupo del selector tiene contenido para jugar", () => {
  for (const [g, temas] of Object.entries(GRUPOS)) {
    const de = (clave: string) => d[clave].filter((x: any) => temas.includes(x.tema)).length;
    assert(de("verbos") >= 40, `${g}: verbos`);
    assert(de("preguntas") >= 5, `${g}: preguntas ${de("preguntas")}`);
    assert(de("oraciones") >= 6, `${g}: oraciones ${de("oraciones")}`);
  }
});

Deno.test("ingles.json: tiempos (Máquina del tiempo) con al menos 40 oraciones válidas", () => {
  assert(d.tiempos.length >= 40, String(d.tiempos.length));
  for (const t of ["regular", "irregular", "to be"]) assert(d.tiempos.filter((x: any) => x.tema === t).length >= 8, t);
  for (const x of d.tiempos) {
    const k = JSON.stringify(x).slice(0, 80);
    for (const c of ["sujeto", "verbo", "presente", "pasado", "resto"]) assert(texto(x[c]), `${c}: ${k}`);
    assert(/^[A-Z]/.test(x.sujeto), "sujeto con mayúscula: " + k);
    assert(/[.!]$/.test(x.resto), "resto con punto: " + k);
    assert(!/\b(yesterday|tomorrow|ago|last|next|now|every)\b/i.test(x.resto), "resto sin marcas de tiempo: " + k);
    if (x.tema === "regular") assert(x.pasado.endsWith("ed"), "regular con -ed: " + k);
    if (x.tema === "irregular") assert(!x.pasado.endsWith("ed"), "irregular sin -ed: " + k);
    if (x.tema === "to be") assert(x.verbo === "be" && ["am", "is", "are"].includes(x.presente) && ["was", "were"].includes(x.pasado), k);
  }
  const claves = d.tiempos.map((x: any) => x.sujeto + " " + x.presente + " " + x.resto);
  assertEquals(new Set(claves).size, claves.length, "oraciones repetidas");
});

// Funciones puras de juegos/ingles-gramatica.js (selector y Máquina del tiempo).
await import("../juegos/ingles-gramatica.js");
const IG = (globalThis as any).InglesGramatica;
const semilla = (s: number) => () => {
  s = (s * 1103515245 + 12345) % 2147483648;
  return s / 2147483648;
};

Deno.test("Máquina del tiempo: cada oración y cada par de tiempos da 3 opciones distintas con una sola correcta", () => {
  const T = ["pasado", "presente", "futuro"];
  for (const it of d.tiempos) {
    const f = IG.formas(it);
    assert(f.futuro.includes(" will " + it.verbo + " "), f.futuro);
    for (const origen of T) {
      for (const destino of T.filter((t) => t !== origen)) {
        const p0 = IG.preguntaTiempos(it, 0, { origen, destino });
        assert(p0.opciones[p0.correcta].toLowerCase().includes(origen), f[origen]);
        const p1 = IG.preguntaTiempos(it, 1, { origen, destino });
        assertEquals(new Set(p1.opciones).size, 3, JSON.stringify(p1.opciones));
        assertEquals(p1.opciones[p1.correcta], f[destino]);
        assert(p1.explicacion.includes("📌") && p1.dato && p1.fallo, f[origen]);
      }
    }
  }
});

Deno.test("Máquina del tiempo: reglas y trampas de ejemplo", () => {
  const plays = d.tiempos.find((x: any) => x.sujeto === "She" && x.verbo === "play");
  assertEquals(IG.trampa(plays, "pasado"), "She did played soccer with her friends.");
  assertEquals(IG.trampa(plays, "futuro"), "She will plays soccer with her friends.");
  assertEquals(IG.trampa(plays, "presente"), "She play soccer with her friends.");
  assertEquals(IG.reglaTiempo(plays, "presente"), "Con he / she / it el verbo lleva -s: plays.");
  const go = d.tiempos.find((x: any) => x.verbo === "go");
  assertEquals(IG.reglaTiempo(go, "pasado"), "Pasado irregular: go → went (se aprende de memoria).");
  assertEquals(IG.trampa(go, "pasado"), "He goed to the park.");
  const study = d.tiempos.find((x: any) => x.verbo === "study");
  assertEquals(IG.reglaTiempo(study, "pasado"), "Pasado regular: study → studied (y cambia a -ied).");
});

Deno.test("partidas: 10 preguntas con la misma semilla; el tema filtra en-frases", () => {
  const a = IG.preguntasTiempos(d, 10, semilla(7)).map((p: any) => p.q + p.correcta);
  assertEquals(a, IG.preguntasTiempos(d, 10, semilla(7)).map((p: any) => p.q + p.correcta));
  assertEquals(a.length, 10);
  const de = (clave: string, campo: string, tema: string) => new Set(d[clave].filter((v: any) => IG.GRUPOS[tema].includes(v.tema)).map((v: any) => v[campo]));
  for (const tema of ["tobe", "presente", "pasado", "futuro"]) {
    const ps = IG.preguntasFrasesPartida(d, tema, semilla(3), 10);
    assertEquals(ps.length, 10, tema);
    for (const p of ps) assert(p.big === "🧩" ? de("verbos", "frase", tema).has(p.q) : de("preguntas", "pregunta", tema).has(p.q), tema + ": " + p.q);
    assert(ps.every((p: any) => p.dato), tema + ": regla en la revelación");
  }
  const todo = IG.preguntasFrasesPartida(d, undefined, semilla(3), 10);
  assertEquals([todo.filter((p: any) => p.big === "🧩").length, todo.filter((p: any) => p.big === "💬").length], [5, 5]);
  assertEquals(IG.temaValido("marciano"), "todo");
  assertEquals(IG.masFallos({ a: 1, b: 3, c: 2, d: 2 }), [["b", 3], ["c", 2], ["d", 2]]);
});
