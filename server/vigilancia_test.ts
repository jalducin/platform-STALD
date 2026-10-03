// Vigilante del servidor: qué hacer según el estado de /salud y el aviso abierto (openspec: vigilancia-servidor).
import { assertEquals } from "jsr:@std/assert@1";
import { decidir, horaCDMX, TITULOS } from "./vigilancia.ts";

const ab = (titulo: string) => ({ numero: 7, titulo });

Deno.test("vigilancia: bloqueado o caído sin aviso abierto → crear el aviso rojo", () => {
  assertEquals(decidir("bloqueado", null), { accion: "crear", titulo: TITULOS.bloqueado });
  assertEquals(decidir("caido", null), { accion: "crear", titulo: TITULOS.bloqueado });
});

Deno.test("vigilancia: sin spam mientras el estado no cambie; comentar si cambia", () => {
  assertEquals(decidir("bloqueado", ab(TITULOS.bloqueado)), { accion: "nada" });
  assertEquals(decidir("advertencia", ab(TITULOS.advertencia)), { accion: "nada" });
  assertEquals(decidir("bloqueado", ab(TITULOS.advertencia)), { accion: "cambiar", titulo: TITULOS.bloqueado, numero: 7 });
});

Deno.test("vigilancia: advertencia crea su aviso; ok cierra el abierto o no hace nada", () => {
  assertEquals(decidir("advertencia", null), { accion: "crear", titulo: TITULOS.advertencia });
  assertEquals(decidir("ok", ab(TITULOS.bloqueado)), { accion: "cerrar", numero: 7 });
  assertEquals(decidir("ok", null), { accion: "nada" });
});

Deno.test("vigilancia: hora de reinicio en hora de CDMX", () => {
  assertEquals(horaCDMX("2026-10-03T04:01:22Z"), "22:01");
});
