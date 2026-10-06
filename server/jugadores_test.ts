// Jugadores registrados y registros pendientes para el admin (openspec: jugadores-admin). Sin red.
// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals } from "jsr:@std/assert@1";
import { armarJugadores, type Cuenta } from "./jugadores.ts";
import { clearCacheJuegos, handleJuegos } from "./juegos.ts";
import { MemoryStore } from "./store.ts";

const ADMIN = "admin@example.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });
const ingles = [{ alumno: "Marisol", userEmails: ["marisol@example.com"], userNames: ["Marisol"] }];
const secundaria = [{ userEmails: ["valeria@example.com"], userNames: ["Valeria Gómez"] }];
const invitados = {
  "leo@example.com": { nombre: "Leo", registradoEn: "2026-10-01T10:00:00Z", ultimaVisita: "2026-10-04T10:00:00Z", visitas: 3 },
  "marisol@example.com": { nombre: "Mari", registradoEn: "2026-10-01T10:00:00Z", ultimaVisita: "2026-10-01T10:00:00Z", visitas: 1 },
};
const cuenta = (email: string, confirmada: boolean, ultimoAcceso: string | null = null): Cuenta =>
  ({ email, creada: "2026-10-05T20:29:00Z", confirmada, ultimoAcceso, ultimoEnvio: "2026-10-05T20:29:00Z" });
const cuentas = [cuenta(ADMIN, true, "2026-10-05T01:00:00Z"), cuenta("marisol@example.com", true, "2026-10-04T09:00:00Z"),
  cuenta("osvaldo@example.com", false), cuenta("sinapodo@example.com", true, "2026-10-05T21:00:00Z")];

Deno.test("jugadores: alumnos, Secundaria e invitados una sola vez, sin el admin; pendientes clasificados", async () => {
  const semana = [{ id: "a-marisol", total: 120, partidas: [{}, {}] }];
  const r = await armarJugadores({ admin: ADMIN, ingles, secundaria, invitados, semana, cuentas });
  assertEquals(r.jugadores.map((j) => [j.email, j.tipo, j.espacio]), [
    ["marisol@example.com", "alumno", "Inglés"], ["valeria@example.com", "alumno", "Secundaria"], ["leo@example.com", "invitado", "Juegos"],
  ]);
  const mari = r.jugadores[0];
  assertEquals([mari.nombre, mari.puntosSemana, mari.partidasSemana, mari.ultimaVisita], ["Marisol", 120, 2, "2026-10-04T09:00:00Z"]);
  assertEquals(r.jugadores[2].ultimaVisita, "2026-10-04T10:00:00Z", "invitado: su última visita");
  assertEquals(r.pendientes.map((p) => [p.email, p.estado]), [["osvaldo@example.com", "sin confirmar"], ["sinapodo@example.com", "sin apodo"]]);
});

function ctx(cuentasFn?: () => Promise<Cuenta[]>) {
  clearCacheJuegos();
  const store = new MemoryStore();
  store.files.set("juegos/invitados.json", { data: invitados, sha: "s1" });
  const deps = { store, admin: ADMIN, filasIngles: () => Promise.resolve(ingles), filasSecundaria: () => Promise.resolve(secundaria),
    hoy: () => "2026-10-05", ahora: () => "2026-10-05T12:00:00.000Z", cuentas: cuentasFn };
  return async (email: string) => {
    const res = await handleJuegos(new Request(`http://x/juegos/jugadores?email=${email}`), "/jugadores", email, deps as any, json);
    return { status: res.status, body: await res.json() };
  };
}

Deno.test("jugadores: la ruta es solo del admin", async () => {
  const pedir = ctx(() => Promise.resolve(cuentas));
  assertEquals((await pedir("marisol@example.com")).status, 403);
  const a = await pedir(ADMIN);
  assertEquals([a.status, a.body.jugadores.length, a.body.pendientes.length, a.body.cuentasError], [200, 3, 2, false]);
});

Deno.test("jugadores: si Auth falla, muestra jugadores y avisa", async () => {
  const a = await ctx(() => Promise.reject(new Error("caída")))(ADMIN);
  assertEquals([a.status, a.body.jugadores.length, a.body.pendientes.length, a.body.cuentasError], [200, 3, 0, true]);
  assert(a.body.semana);
});
