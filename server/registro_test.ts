// Registro en Juegos sin validar el correo (openspec: registro-directo-juegos). Sin red: Auth falsa.
// deno-lint-ignore-file no-explicit-any
import { assertEquals } from "jsr:@std/assert@1";
import { handleRegistroJuegos } from "./registro.ts";
import { clearCacheJuegos } from "./juegos.ts";
import { MemoryStore } from "./store.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ingles = [{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }];
const secundaria = [{ userEmails: ["valeria@example.com"], userNames: ["Valeria Gómez"] }];

function ctx(sesion: (email: string) => Promise<unknown> = (e) => Promise.resolve({ token_hash: "th-" + e })) {
  clearCacheJuegos();
  const store = new MemoryStore();
  const pedidas: string[] = [];
  const deps = {
    store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve(secundaria),
    ahora: () => "2026-10-05T12:00:00.000Z", sesion: (e: string) => { pedidas.push(e); return sesion(e); },
  };
  const llamar = async (body: unknown, method = "POST") => {
    const res = await handleRegistroJuegos(new Request("http://x/juegos/registro", { method, body: method === "POST" ? JSON.stringify(body) : undefined }), deps as any, json);
    return { status: res.status, body: await res.json() };
  };
  return { store, llamar, pedidas };
}

Deno.test("registro: correo nuevo → invitado dado de alta y llave de sesión, sin correo de confirmación", async () => {
  const { store, llamar, pedidas } = ctx();
  const r = await llamar({ email: " Osvaldo@Example.com ", nombre: "  Osva  ", acepto: true });
  assertEquals([r.status, r.body.token_hash, r.body.jugador.nombre, r.body.jugador.tipo], [200, "th-osvaldo@example.com", "Osva", "invitado"]);
  assertEquals(pedidas, ["osvaldo@example.com"]);
  const inv = (await store.get<any>("juegos/invitados.json"))!.data;
  assertEquals(inv["osvaldo@example.com"], { nombre: "Osva", registradoEn: "2026-10-05T12:00:00.000Z", ultimaVisita: "2026-10-05T12:00:00.000Z", visitas: 1 });
});

Deno.test("registro: correos de las clases y del profe siguen con su enlace (409), sin tocar Auth", async () => {
  const { llamar, pedidas } = ctx();
  for (const email of ["marisol@example.com", "valeria@example.com", ADMIN]) {
    const r = await llamar({ email, nombre: "Yo", acepto: true });
    assertEquals([r.status, r.body.error], [409, "correo_de_clase"], email);
  }
  assertEquals(pedidas, []);
});

Deno.test("registro: validaciones (correo, apodo, aviso, método)", async () => {
  const { llamar, pedidas } = ctx();
  assertEquals((await llamar({ email: "no-es", nombre: "Leo", acepto: true })).body.error, "correo_invalido");
  assertEquals((await llamar({ email: "leo@example.com", nombre: "x", acepto: true })).body.error, "apodo_invalido");
  assertEquals((await llamar({ email: "leo@example.com", nombre: "Leo", acepto: false })).body.error, "debe_aceptar");
  assertEquals((await llamar(null, "GET")).status, 405);
  assertEquals(pedidas, []);
});

Deno.test("registro: el invitado que regresa entra otra vez y actualiza su apodo", async () => {
  const { store, llamar } = ctx();
  await llamar({ email: "leo@example.com", nombre: "Leo", acepto: true });
  const r = await llamar({ email: "leo@example.com", nombre: "Leonardo", acepto: true });
  assertEquals([r.status, r.body.jugador.nombre], [200, "Leonardo"]);
  assertEquals((await store.get<any>("juegos/invitados.json"))!.data["leo@example.com"].visitas, 2);
});

Deno.test("registro: si Auth falla responde 503 (el invitado queda dado de alta)", async () => {
  const { store, llamar } = ctx(() => Promise.reject(new Error("caída")));
  const r = await llamar({ email: "leo@example.com", nombre: "Leo", acepto: true });
  assertEquals([r.status, r.body.error], [503, "auth_no_disponible"]);
  assertEquals((await store.get<any>("juegos/invitados.json"))!.data["leo@example.com"].nombre, "Leo");
});

Deno.test("registro: modo de prueba devuelve { prueba: true }", async () => {
  const { llamar } = ctx(() => Promise.resolve({ prueba: true }));
  const r = await llamar({ email: "leo@example.com", nombre: "Leo", acepto: true });
  assertEquals([r.status, r.body.prueba, r.body.token_hash], [200, true, undefined]);
});
