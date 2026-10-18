// Ceremonia de premiación de Karts (openspec: karts-control-sala-y-ceremonia): la escena sube 3.º → 2.º → 1.º, toma los
// lugares tal como vienen del podio (no los calcula ni los reordena), repite la medalla en un empate, funciona con menos
// de 3 corredores y, en sala, todos la empiezan a la misma hora a partir del cierre del servidor.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import "../juegos/karts-ceremonia.js";

const KC = (globalThis as any).KartsCeremonia;
const fila = (nombre: string, o: any = {}) => ({ id: nombre.toLowerCase(), nombre, total: 0, ...o });

Deno.test("ceremonia: el podio toma las 3 primeras filas en el orden del servidor (sin reordenar)", () => {
  // El servidor manda este orden aunque los puntos digan otra cosa (p. ej. desempate por tiempo): se respeta.
  const filas = [fila("Ana", { total: 440, lugar: 1 }), fila("Beto", { total: 500, lugar: 2 }), fila("Ceci", { total: 380, lugar: 3 }), fila("Dani", { total: 999, lugar: 4 })];
  const p = KC.podioDe(filas, { yo: "beto" });
  assertEquals(p.map((x: any) => x.nombre), ["Ana", "Beto", "Ceci"]);
  assertEquals(p.map((x: any) => x.lugar), [1, 2, 3]);
  assertEquals(p.map((x: any) => x.puntos), [440, 500, 380]);
  assertEquals(p.map((x: any) => x.yo), [false, true, false]);
  assertEquals(p.map((x: any) => x.medalla), ["🥇", "🥈", "🥉"]);
});

Deno.test("ceremonia: sin `lugar` usa la posición; con empate repite la medalla", () => {
  assertEquals(KC.podioDe([fila("A"), fila("B"), fila("C")]).map((x: any) => x.lugar), [1, 2, 3]);
  const emp = KC.podioDe([fila("A", { lugar: 1 }), fila("B", { lugar: 1 }), fila("C", { lugar: 3 })]);
  assertEquals(emp.map((x: any) => x.medalla), ["🥇", "🥇", "🥉"]);
  assertEquals(emp.map((x: any) => x.escalon), [1, 2, 3]); // el escalón sigue siendo el de su posición
});

Deno.test("ceremonia: personaje y color salen de la fila; nombres acotados", () => {
  const p = KC.podioDe([fila("Una persona con un nombre larguísimo de verdad", { personaje: "tona", color: "#ff0000" })]);
  assertEquals(p[0].personaje, "tona");
  assertEquals(p[0].color, "#ff0000");
  assert(p[0].nombre.length <= 24);
  assertEquals(KC.podioDe([]), []);
  assertEquals(KC.podioDe(null), []);
});

Deno.test("ceremonia: la escena sube 3.º, luego 2.º y al final 1.º, con redoble antes del 1.º", () => {
  const s = KC.secuencia(3);
  assertEquals(s.filter((m: any) => m.tipo === "sube").map((m: any) => m.escalon), [3, 2, 1]);
  const t = (tipo: string, e?: number) => s.find((m: any) => m.tipo === tipo && (e === undefined || m.escalon === e)).t;
  assert(t("sube", 3) < t("sube", 2) && t("sube", 2) < t("redoble") && t("redoble") < t("sube", 1) && t("sube", 1) < t("fin"));
  assert(t("fin") >= 6000 && t("fin") <= 8000, "dura entre 6 y 8 s");
  assertEquals(KC.DURACION, t("fin"));
});

Deno.test("ceremonia: con 2 o 1 corredores sube solo quien hay, de abajo hacia arriba", () => {
  assertEquals(KC.secuencia(2).filter((m: any) => m.tipo === "sube").map((m: any) => m.escalon), [2, 1]);
  assertEquals(KC.secuencia(1).filter((m: any) => m.tipo === "sube").map((m: any) => m.escalon), [1]);
  assertEquals(KC.secuencia(0).filter((m: any) => m.tipo === "sube").length, 0);
});

Deno.test("ceremonia: estadoEn dice quién ya subió a cada momento", () => {
  const s = KC.secuencia(3);
  const t = (e: number) => s.find((m: any) => m.tipo === "sube" && m.escalon === e).t;
  assertEquals(KC.estadoEn(0, 3).arriba, []);
  assertEquals(KC.estadoEn(t(3) + 1, 3).arriba, [3]);
  assertEquals(KC.estadoEn(t(2) + 1, 3).arriba, [3, 2]);
  assertEquals(KC.estadoEn(t(1) + 1, 3).arriba, [3, 2, 1]);
  assertEquals(KC.estadoEn(KC.DURACION + 1, 3).terminada, true);
  assertEquals(KC.estadoEn(t(1) + 1, 3).terminada, false);
});

Deno.test("ceremonia en sala: todos empiezan a la misma hora del servidor (cierre + colchón)", () => {
  const cierre = 1_700_000_000_000;
  assertEquals(KC.inicioSala(cierre), cierre + KC.COLCHON_SALA);
  // Dos aparatos con distinto desfase calculan lo mismo con la hora del servidor.
  const a = KC.transcurridoSala(cierre, cierre + KC.COLCHON_SALA + 1200);
  assertEquals(a, 1200);
  assertEquals(KC.transcurridoSala(cierre, cierre), -KC.COLCHON_SALA);
  assertEquals(KC.debeMostrar(-500), true); // aún no empieza: se espera
  assertEquals(KC.debeMostrar(3000), true); // a media escena: se ve desde donde va
  assertEquals(KC.debeMostrar(KC.DURACION + 1), false); // ya pasó: queda la tabla
  assertEquals(KC.transcurridoSala(null, cierre), null);
});
