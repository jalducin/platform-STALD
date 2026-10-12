// Mando de Arcade (openspec: mando-arcade). Lógica sin DOM: el mismo archivo que cargan los juegos de Arcade.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import "../juegos/mando.js";

const M = (globalThis as any).Mando;
const ordenado = (s: Iterable<string>) => [...s].sort();
const cerca = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;

Deno.test("mando: botones canónicos y acciones normalizadas", () => {
  assertEquals(M.BOTONES, ["arriba", "abajo", "izq", "der", "A", "B", "X", "Y", "L", "R", "START", "SELECT"]);
  const n = M.normalizarAcciones({ izquierda: "izq", saltar: ["A", "arriba"], pausa: "START" });
  assertEquals(n, { izquierda: ["izq"], saltar: ["A", "arriba"], pausa: ["START"] });
  assertEquals(ordenado(M.botonesUsados(n)), ["A", "START", "arriba", "izq"]);
  const e = assertThrows(() => M.normalizarAcciones({ correr: "Z" }));
  assert(String((e as Error).message).includes("Z") && String((e as Error).message).includes("correr"));
  assertThrows(() => M.normalizarAcciones({ nada: [] }));
});

Deno.test("mando: teclado por omisión y cambios por juego", () => {
  const t = M.mapaTeclas();
  const espera: Record<string, string> = {
    ArrowLeft: "izq", KeyA: "izq", ArrowRight: "der", KeyD: "der", ArrowUp: "arriba", KeyW: "arriba",
    ArrowDown: "abajo", KeyS: "abajo", KeyJ: "A", KeyK: "B", KeyU: "X", KeyI: "Y", KeyQ: "L", KeyE: "R",
    Enter: "START", ShiftRight: "SELECT", Backspace: "SELECT",
  };
  for (const [code, b] of Object.entries(espera)) assertEquals(M.teclaABoton(code, t), b, code);
  assertEquals(M.teclaABoton("KeyZ", t), null);
  const axo = M.mapaTeclas({ Space: "A", ArrowUp: "A", KeyQ: null });
  assertEquals(M.teclaABoton("Space", axo), "A");
  assertEquals(M.teclaABoton("ArrowUp", axo), "A");
  assertEquals(M.teclaABoton("KeyQ", axo), null);
  assertEquals(M.teclaABoton("KeyJ", axo), "A"); // el resto se conserva
  assertThrows(() => M.mapaTeclas({ KeyZ: "Z" }));
});

Deno.test("mando: cruceta de 8 direcciones con zona muerta", () => {
  const c = (dx: number, dy: number) => ordenado(M.cruceta(dx, dy, 60));
  assertEquals(c(50, 0), ["der"]);
  assertEquals(c(-50, 0), ["izq"]);
  assertEquals(c(0, -50), ["arriba"]); // en pantalla, y negativa es arriba
  assertEquals(c(0, 50), ["abajo"]);
  assertEquals(c(40, -40), ["arriba", "der"]);
  assertEquals(c(-40, 40), ["abajo", "izq"]);
  assertEquals(c(50, 10), ["der"]); // casi horizontal: sin diagonal
  assertEquals(c(5, 5), []); // centro: zona muerta (0.25 del radio)
  assertEquals(c(200, 0), ["der"]); // fuera del radio sigue siendo una dirección
});

Deno.test("mando: zona muerta radial reescalada y ejes a cruceta", () => {
  assertEquals(M.zonaMuerta(0.1, 0.1, 0.2), { x: 0, y: 0 });
  const a = M.zonaMuerta(1, 0, 0.2);
  assert(cerca(a.x, 1) && cerca(a.y, 0));
  const b = M.zonaMuerta(0.6, 0, 0.2); // (0.6 − 0.2) / 0.8 = 0.5
  assert(cerca(b.x, 0.5), JSON.stringify(b));
  const c = M.zonaMuerta(3, 4, 0.2); // fuera del círculo: se acota a 1
  assert(cerca(Math.hypot(c.x, c.y), 1) && cerca(c.x, 0.6) && cerca(c.y, 0.8), JSON.stringify(c));
  assertEquals(ordenado(M.ejeABotones(0.8, -0.7)), ["arriba", "der"]);
  assertEquals(M.ejeABotones(0.3, 0.2), []);
  assertEquals(M.ejeABotones(-0.6, 0), ["izq"]);
});

Deno.test("mando: el botón más cercano del rombo", () => {
  const rombo = [{ id: "A", x: 100, y: 50 }, { id: "B", x: 50, y: 100 }, { id: "X", x: 50, y: 0 }, { id: "Y", x: 0, y: 50 }];
  assertEquals(M.masCercano(95, 52, rombo, 40), "A");
  assertEquals(M.masCercano(70, 80, rombo, 40), "B"); // entre A y B, más cerca de B: sin huecos
  assertEquals(M.masCercano(300, 300, rombo, 40), null);
  assertEquals(M.masCercano(10, 10, [], 40), null);
});

Deno.test("mando: dedos (multitáctil, deslizar y soltar)", () => {
  const s = M.crearSeguidor();
  s.poner(1, ["der"]);
  s.poner(2, ["A"]);
  assertEquals(ordenado(s.botones()), ["A", "der"]);
  assertEquals(s.dedos(), 2);
  s.mover(2, ["B"]); // desliza de A a B
  assertEquals(ordenado(s.botones()), ["B", "der"]);
  s.mover(1, ["arriba", "der"]); // a la diagonal
  assertEquals(ordenado(s.botones()), ["B", "arriba", "der"]);
  s.quitar(2);
  assertEquals(ordenado(s.botones()), ["arriba", "der"]);
  s.mover(1, []); // sale de todo control
  assertEquals(ordenado(s.botones()), []);
  assertEquals(s.dedos(), 1);
  s.mover(99, ["A"]); // un dedo que no empezó en el mando se ignora
  assertEquals(ordenado(s.botones()), []);
  s.quitar(1);
  assertEquals(s.dedos(), 0);
});

Deno.test("mando: control físico con el mapeo estándar", () => {
  const boton = (pressed: boolean, value = pressed ? 1 : 0) => ({ pressed, value });
  const gp = (presionados: number[], ejes = [0, 0, 0, 0], valores: Record<number, number> = {}) => ({
    connected: true, mapping: "standard", axes: ejes,
    buttons: Array.from({ length: 17 }, (_, i) => i in valores ? boton(false, valores[i]) : boton(presionados.includes(i))),
  });
  assertEquals(ordenado(M.controlABotones(gp([0, 1, 2, 3])).botones), ["A", "B", "X", "Y"]);
  assertEquals(ordenado(M.controlABotones(gp([4, 5, 8, 9])).botones), ["L", "R", "SELECT", "START"]);
  assertEquals(ordenado(M.controlABotones(gp([12, 15])).botones), ["arriba", "der"]);
  // Gatillos analógicos: cuentan pasado 0.5.
  assertEquals(ordenado(M.controlABotones(gp([], undefined, { 6: 0.3, 7: 0.9 })).botones), ["R"]);
  // Palanca izquierda: eje con zona muerta y dirección pasado 0.5.
  const p = M.controlABotones(gp([], [-1, 0, 0, 0]));
  assert(cerca(p.eje.x, -1) && cerca(p.eje.y, 0));
  assertEquals(p.botones, ["izq"]);
  const quieto = M.controlABotones(gp([], [0.1, -0.1, 0, 0]));
  assertEquals(quieto.eje, { x: 0, y: 0 });
  assertEquals(quieto.botones, []);
  // Reasignación por juego.
  assertEquals(M.controlABotones(gp([0]), { indices: { 0: "B" } }).botones, ["B"]);
  assertEquals(M.controlABotones(null).botones, []);
});

Deno.test("mando: núcleo (fuentes, presionado, eje y eventos por flanco)", () => {
  const n = M.crearNucleo({ acciones: { izquierda: "izq", derecha: "der", subir: "arriba", saltar: ["A", "X"], pausa: "START" } });
  const bajadas: string[] = [], subidas: string[] = [];
  n.al("saltar", () => bajadas.push("saltar"));
  const quitar = n.al("pausa", () => bajadas.push("pausa"));
  n.alSoltar("saltar", () => subidas.push("saltar"));
  n.ponerFuente("tactil", ["A", "der"]);
  assert(n.presionado("saltar") && n.presionado("derecha") && !n.presionado("izquierda"));
  n.ponerFuente("teclado", ["X"]); // la acción ya estaba presionada: no se repite
  assertEquals(bajadas, ["saltar"]);
  n.ponerFuente("tactil", ["der"]);
  assertEquals(subidas, []); // el teclado la sigue manteniendo
  n.ponerFuente("teclado", []);
  assertEquals(subidas, ["saltar"]);
  // Eje digital desde la cruceta (diagonal normalizada) y analógico con prioridad.
  n.ponerFuente("tactil", ["der", "arriba"]);
  const d = n.eje();
  assert(cerca(d.x, Math.SQRT1_2) && cerca(d.y, -Math.SQRT1_2), JSON.stringify(d));
  n.ponerEje("control", { x: 0.4, y: 0 });
  assertEquals(n.eje(), { x: 0.4, y: 0 });
  n.ponerEje("palanca", { x: -0.2, y: 0.3 });
  assertEquals(n.eje(), { x: -0.2, y: 0.3 });
  n.ponerEje("palanca", null); n.ponerEje("control", null);
  // Desactivar suelta todo y no acepta entradas; quitar un manejador.
  n.ponerFuente("control", ["START"]);
  assertEquals(bajadas, ["saltar", "pausa"]);
  n.activar(false);
  assert(!n.presionado("pausa") && !n.presionado("derecha"));
  n.ponerFuente("tactil", ["START"]);
  assert(!n.presionado("pausa"));
  n.activar(true);
  quitar();
  n.ponerFuente("tactil", ["START"]);
  assert(n.presionado("pausa"));
  assertEquals(bajadas, ["saltar", "pausa"]);
  n.soltarTodo();
  assertEquals(n.botones(), []);
  // Un botón que el juego no usa no cuenta.
  n.ponerFuente("tactil", ["Y"]);
  assertEquals(n.botones(), []);
});

Deno.test("mando: flancos entre dos estados", () => {
  const f = M.flancos(new Set(["a", "b"]), new Set(["b", "c"]));
  assertEquals(f, { bajan: ["c"], suben: ["a"] });
});

Deno.test("mando: guía de controles sin marcas", () => {
  const acciones = M.normalizarAcciones({ mover: ["izq", "der"], saltar: "A", pausa: "START" });
  const g = M.guia(acciones, M.mapaTeclas({ Space: "A" }), { saltar: "Saltar" });
  assertEquals(g.map((x: any) => x.accion), ["mover", "saltar", "pausa"]);
  const saltar = g[1];
  assertEquals(saltar.nombre, "Saltar");
  assertEquals(saltar.mando, "A");
  assertEquals(saltar.teclas, ["J", "Espacio"]);
  assertEquals(saltar.control, "Botón de abajo");
  assertEquals(g[0].nombre, "Mover");
  assertEquals(g[0].teclas, ["←", "A", "→", "D"]);
  assertEquals(g[2].teclas, ["Enter"]);
  const todo = JSON.stringify(g).toLowerCase();
  for (const marca of ["nintendo", "xbox", "playstation", "switch"]) assert(!todo.includes(marca), marca);
});
