// CORS: la verificación previa se recuerda un día (openspec: ahorro-peticiones).
import { assertEquals } from "jsr:@std/assert@1";
import { handler } from "./main.ts";

Deno.test("cors: OPTIONS responde con Access-Control-Max-Age de un día", async () => {
  const res = await handler(new Request("http://x/juegos/sala/ABCD/respuesta", { method: "OPTIONS" }));
  await res.body?.cancel();
  assertEquals([res.headers.get("Access-Control-Max-Age"), res.headers.get("Access-Control-Allow-Origin")], ["86400", "*"]);
});
