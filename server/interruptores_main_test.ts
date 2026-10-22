// GET /interruptores en server/main.ts (openspec: rpg-privacidad): pública, sin sesión, solo booleanos conocidos y
// guardable 60 s. Sin red: almacén en memoria con el interruptor encendido y una llave desconocida.
import { assertEquals } from "jsr:@std/assert@1";

const dir = await Deno.makeTempDir();
await Deno.writeTextFile(dir + "/rows.json", JSON.stringify({ secundaria: [] }));
await Deno.mkdir(dir + "/datos/config", { recursive: true });
await Deno.writeTextFile(dir + "/datos/alumnos.json", "{}");
await Deno.writeTextFile(dir + "/datos/config/interruptores.json", JSON.stringify({ privacidad: true, secreto: "no sale" }));
Deno.env.set("ROWS_FIXTURE", dir + "/rows.json");
Deno.env.set("DATA_DIR", dir + "/datos");
Deno.env.set("SUPER_ADMIN_EMAIL", "admin@example.com");
const { handler } = await import("./main.ts");

Deno.test("main: GET /interruptores sin sesión responde solo las llaves conocidas y se guarda 60 s", async () => {
  const r = await handler(new Request("http://x/interruptores"));
  assertEquals([r.status, r.headers.get("Cache-Control"), await r.json()], [200, "public, max-age=60", { privacidad: true, ranking: false }]);
});

// Los interruptores viajan también en /config, que cada página ya pide (openspec: fix-e2e-rpg): así el enlace al aviso
// no cuesta una petición extra por página.
Deno.test("main: /config trae los interruptores (solo llaves conocidas) y se guarda 10 min", async () => {
  const r = await handler(new Request("http://x/config"));
  assertEquals([r.status, r.headers.get("Cache-Control"), await r.json()], [200, "public, max-age=600", { prueba: true, interruptores: { privacidad: true, ranking: false } }]);
});

Deno.test("main: /interruptores no acepta escritura", async () => {
  const r = await handler(new Request("http://x/interruptores", { method: "POST", body: "{}" }));
  await r.body?.cancel();
  assertEquals(r.status, 405);
});
