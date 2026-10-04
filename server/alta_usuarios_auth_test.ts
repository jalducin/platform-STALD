// Alta de las personas actuales en Supabase Auth (openspec: plataforma-login). Sin red: `fetch` falso.
// deno-lint-ignore-file require-await
import { assertEquals } from "jsr:@std/assert@1";
import { altaUsuarios, leerCorreos } from "../herramientas/alta-usuarios-auth.ts";

Deno.test("alta auth: lee la lista sin duplicados, ignora comentarios y separa inválidos", () => {
  assertEquals(leerCorreos("# alumnos\nLuz@Example.com\n\nluz@example.com\r\nana@example.com\nno-es-correo\n"), { validos: ["luz@example.com", "ana@example.com"], invalidos: ["no-es-correo"] });
});

Deno.test("alta auth: crea con email_confirm y la llave de servicio; ya existentes y fallas aparte", async () => {
  const llamadas: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    llamadas.push({ url: String(input), headers: new Headers(init?.headers), body });
    if (body.email === "ana@example.com") return new Response(JSON.stringify({ code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" }), { status: 422 });
    if (body.email === "mal@example.com") return new Response("{}", { status: 500 });
    return new Response(JSON.stringify({ id: "u1", email: body.email }), { status: 200 });
  }) as typeof fetch;
  const r = await altaUsuarios(["luz@example.com", "ana@example.com", "mal@example.com"], { url: "https://ref.supabase.co/", key: "srv", fetch: f });
  assertEquals(r, { creados: ["luz@example.com"], yaExistian: ["ana@example.com"], invalidos: [], fallidos: [{ email: "mal@example.com", status: 500 }] });
  assertEquals(llamadas[0].url, "https://ref.supabase.co/auth/v1/admin/users");
  assertEquals(llamadas[0].body, { email: "luz@example.com", email_confirm: true });
  assertEquals([llamadas[0].headers.get("apikey"), llamadas[0].headers.get("authorization")], ["srv", "Bearer srv"]);
});
