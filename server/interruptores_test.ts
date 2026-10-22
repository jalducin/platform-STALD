// Interruptores públicos (openspec: rpg-privacidad): solo llaves conocidas y booleanas, falla cerrada (apagado) y
// caché de 60 s. Sin red: Postgres simulado y almacén en memoria.
import { assertEquals } from "jsr:@std/assert@1";
import { crearLectorInterruptores, normalizarInterruptores, RUTA_INTERRUPTORES } from "./interruptores.ts";
import type { Db } from "./db.ts";
import { MemoryStore } from "./store.ts";

// Postgres falso: responde la fila de stald_docs que se le pase y anota las consultas.
function dbFalsa(fila: unknown | Error) {
  const consultas: string[] = [];
  const db = {
    select: (tabla: string, query: string) => {
      consultas.push(`${tabla}?${query}`);
      if (fila instanceof Error) return Promise.reject(fila);
      return Promise.resolve(fila === undefined ? [] : [{ data: fila }]);
    },
  } as unknown as Db;
  return { db, consultas };
}
const sinAlmacen = () => Promise.reject(new Error("no debe leer el almacén con Postgres"));

Deno.test("interruptores: normalizar deja solo llaves conocidas y solo true estricto", () => {
  assertEquals(normalizarInterruptores({ privacidad: true, otra: true }), { privacidad: true });
  for (const malo of [null, undefined, "x", 1, [], { privacidad: "true" }, { privacidad: 1 }, {}]) {
    assertEquals(normalizarInterruptores(malo), { privacidad: false }, JSON.stringify(malo));
  }
});

Deno.test("interruptores: sin documento → apagado (Postgres y almacén)", async () => {
  const { db, consultas } = dbFalsa(undefined);
  assertEquals(await crearLectorInterruptores({ db, store: sinAlmacen })(), { privacidad: false });
  assertEquals(consultas, ["docs?path=eq.config%2Finterruptores.json&select=data"]);
  const store = new MemoryStore();
  assertEquals(await crearLectorInterruptores({ db: null, store: () => Promise.resolve(store) })(), { privacidad: false });
});

Deno.test("interruptores: encendido desde stald_docs y desde el almacén", async () => {
  const { db } = dbFalsa({ privacidad: true });
  assertEquals(await crearLectorInterruptores({ db, store: sinAlmacen })(), { privacidad: true });
  const store = new MemoryStore();
  await store.put(RUTA_INTERRUPTORES, { privacidad: true }, null);
  assertEquals(await crearLectorInterruptores({ db: null, store: () => Promise.resolve(store) })(), { privacidad: true });
});

Deno.test("interruptores: Postgres caído → apagado, sin lanzar", async () => {
  const { db } = dbFalsa(new Error("pg caído"));
  const errorOriginal = console.error;
  console.error = () => {};
  try {
    assertEquals(await crearLectorInterruptores({ db, store: sinAlmacen })(), { privacidad: false });
  } finally {
    console.error = errorOriginal;
  }
});

Deno.test("interruptores: caché de 60 s; al vencer se nota el cambio de dato", async () => {
  const store = new MemoryStore();
  let t = 0;
  const leer = crearLectorInterruptores({ db: null, store: () => Promise.resolve(store), ahora: () => t });
  assertEquals(await leer(), { privacidad: false });
  await store.put(RUTA_INTERRUPTORES, { privacidad: true }, null);
  t = 59_999;
  assertEquals(await leer(), { privacidad: false }, "aún en caché");
  t = 60_000;
  assertEquals(await leer(), { privacidad: true }, "caché vencida: ya encendido");
});
