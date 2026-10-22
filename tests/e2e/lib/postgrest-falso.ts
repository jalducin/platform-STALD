// PostgREST falso en memoria servido por HTTP (openspec: ingles-ocultar-grupos), para correr las fases `--pg` de
// tests/e2e/correr.sh sin llaves de Supabase y sin tocar tablas reales. Reusa server/test_postgrest.ts, que entiende
// solo lo que usan server/db.ts, herramientas/migrar-ingles.ts y correr.sh. Los datos viven solo en el proceso.
//
// Uso:  deno run -A tests/e2e/lib/postgrest-falso.ts [puerto]   (por omisión 8943)
//       SUPABASE_URL=http://127.0.0.1:8943 SUPABASE_SERVICE_KEY=falsa bash tests/e2e/correr.sh --pg --datos <copia> …
import { postgrestFalso } from "../../../server/test_postgrest.ts";

const puerto = Number(Deno.args[0]) || 8943;
const fake = postgrestFalso("stald_test_");

Deno.serve({ port: puerto, hostname: "127.0.0.1" }, async (req) => {
  // Solo tablas de prueba: cualquier otra ruta (p. ej. stald_docs) es un error, como recordatorio.
  if (!new URL(req.url).pathname.startsWith("/rest/v1/stald_test_")) return new Response(JSON.stringify({ message: "solo stald_test_*" }), { status: 404 });
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  return await fake.fetch(req.url, { method: req.method, headers: req.headers, body: body || undefined });
});
console.log(`PostgREST falso (stald_test_*) en http://127.0.0.1:${puerto}`);
