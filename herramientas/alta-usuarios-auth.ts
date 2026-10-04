// Da de alta en Supabase Auth a las personas que ya usan la plataforma (openspec: plataforma-login, ajuste del profe).
// Así no tienen que registrarse: el profe les manda su «🔗 Enlace de acceso» por WhatsApp desde el portal.
// Uso:   deno run -A herramientas/alta-usuarios-auth.ts --correos <archivo> [--prueba]
//        <archivo>: un correo por línea (líneas vacías y las que empiezan con # se ignoran). NO lo subas al repo.
// Env:   SUPABASE_URL y SUPABASE_SERVICE_KEY, solo en el proceso (nunca en archivos).
//  --prueba  valida la lista y muestra lo que haría, sin llamar a la red.
// Admin API: POST /auth/v1/admin/users { email, email_confirm: true }. Un correo que ya existe cuenta como «ya existía».

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResultadoAlta {
  creados: string[];
  yaExistian: string[];
  invalidos: string[];
  fallidos: { email: string; status: number }[];
}

export function leerCorreos(texto: string): { validos: string[]; invalidos: string[] } {
  const validos = new Set<string>();
  const invalidos: string[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const c = linea.trim().toLowerCase();
    if (!c || c.startsWith("#")) continue;
    if (CORREO.test(c)) validos.add(c);
    else invalidos.push(c);
  }
  return { validos: [...validos], invalidos };
}

export async function altaUsuarios(correos: string[], cfg: { url: string; key: string; fetch?: typeof fetch }): Promise<ResultadoAlta> {
  const f = cfg.fetch ?? fetch;
  const r: ResultadoAlta = { creados: [], yaExistian: [], invalidos: [], fallidos: [] };
  for (const email of correos) {
    const res = await f(`${cfg.url.replace(/\/$/, "")}/auth/v1/admin/users`, {
      method: "POST",
      headers: { "apikey": cfg.key, "Authorization": `Bearer ${cfg.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, email_confirm: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) r.creados.push(email);
    else if (res.status === 422 || j?.error_code === "email_exists" || /already/i.test(String(j?.msg ?? j?.message ?? ""))) r.yaExistian.push(email);
    else r.fallidos.push({ email, status: res.status });
  }
  return r;
}

if (import.meta.main) {
  const args = Deno.args;
  const i = args.indexOf("--correos");
  const archivo = i >= 0 ? args[i + 1] : undefined;
  if (!archivo) { console.error("Falta --correos <archivo>"); Deno.exit(2); }
  const { validos, invalidos } = leerCorreos(await Deno.readTextFile(archivo));
  console.log(`Correos válidos: ${validos.length} · inválidos: ${invalidos.length}${invalidos.length ? " (" + invalidos.join(", ") + ")" : ""}`);
  if (args.includes("--prueba")) {
    for (const c of validos) console.log("  daría de alta:", c);
    console.log("Modo --prueba: no se llamó a Supabase.");
    Deno.exit(invalidos.length ? 1 : 0);
  }
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
  if (!url || !key) { console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el entorno"); Deno.exit(2); }
  const r = await altaUsuarios(validos, { url, key });
  console.log(`Creados: ${r.creados.length} · ya existían: ${r.yaExistian.length} · fallidos: ${r.fallidos.length}`);
  for (const x of r.fallidos) console.log("  falló:", x.email, x.status);
  Deno.exit(r.fallidos.length || invalidos.length ? 1 : 0);
}
