// Perfil de acceso del portal (openspec: portal-acceso), sin red.
import { assertEquals } from "jsr:@std/assert@1";
import { armarPerfil } from "./perfil.ts";

const ingles = [
  { alumno: "Sofy", userEmails: ["sofy@example.com"], userNames: ["Sofia Alducin"] },
  { alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] },
];
const secundaria = [
  { userEmails: ["sofy@example.com"], userNames: ["Sofia Alducin"] },
  { userEmails: ["hija@example.com"], userNames: ["Valeria Gómez"] },
];
const admin = "admin@example.com";

Deno.test("perfil: Inglés y Secundaria, nombre de Inglés", () => {
  assertEquals(armarPerfil("sofy@example.com", admin, ingles, secundaria), {
    email: "sofy@example.com", isAdmin: false, nombre: "Sofy", conocido: true, invitado: false,
    accesos: { ingles: true, secundaria: true, juegos: true },
  });
});

Deno.test("perfil: solo Secundaria, primer nombre de Notion", () => {
  const p = armarPerfil("hija@example.com", admin, ingles, secundaria);
  assertEquals([p.nombre, p.accesos.ingles, p.accesos.secundaria, p.conocido], ["Valeria", false, true, true]);
});

Deno.test("perfil: solo Inglés", () => {
  const p = armarPerfil("marisol@example.com", admin, ingles, secundaria);
  assertEquals([p.nombre, p.accesos.ingles, p.accesos.secundaria], ["Marisol", true, false]);
});

Deno.test("perfil: desconocido sin accesos", () => {
  assertEquals(armarPerfil("nadie@example.com", admin, ingles, secundaria), {
    email: "nadie@example.com", isAdmin: false, nombre: null, conocido: false, invitado: false,
    accesos: { ingles: false, secundaria: false, juegos: false },
  });
});

Deno.test("perfil: admin ve todo como Profe", () => {
  const p = armarPerfil("admin@example.com", admin, ingles, secundaria);
  assertEquals([p.isAdmin, p.nombre, p.accesos], [true, "Profe", { ingles: true, secundaria: true, juegos: true }]);
});

Deno.test("perfil: no incluye correos ni filas de otros", () => {
  const txt = JSON.stringify(armarPerfil("sofy@example.com", admin, ingles, secundaria));
  assertEquals(txt.includes("marisol") || txt.includes("hija@") || txt.includes("Alducin"), false);
});

Deno.test("perfil: invitado registrado solo con Juegos", () => {
  const inv = { "leo@example.com": { nombre: "Leo", registradoEn: "x", ultimaVisita: "x", visitas: 1 } };
  assertEquals(armarPerfil("leo@example.com", admin, ingles, secundaria, inv), {
    email: "leo@example.com", isAdmin: false, nombre: "Leo", conocido: true, invitado: true,
    accesos: { ingles: false, secundaria: false, juegos: true },
  });
  assertEquals(armarPerfil("sofy@example.com", admin, ingles, secundaria, inv).invitado, false);
});
