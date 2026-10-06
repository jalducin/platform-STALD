// Caché HTTP por ruta (openspec: cache-estabilidad). Por omisión toda respuesta es `no-store` (datos personales: no
// se guardan en el aparato). Solo las rutas de esta lista se pueden guardar o revalidar, y solo cuando responden 200:
// - /config: pública y casi fija → el navegador la guarda 10 min;
// - /juegos/ranking: sin correos y la misma para todos los jugadores → `private, no-cache` con ETag; el navegador la
//   revalida en cada uso (If-None-Match) y un 304 ahorra el cuerpo. `Vary: Authorization` separa por sesión.

export interface PoliticaCache {
  cacheControl: string;
  vary?: string;
}

const POLITICAS: { ruta: RegExp; politica: PoliticaCache }[] = [
  { ruta: /\/config$/, politica: { cacheControl: "public, max-age=600" } },
  { ruta: /\/juegos\/ranking$/, politica: { cacheControl: "private, no-cache", vary: "Authorization" } },
];

export function politicaCache(pathname: string): PoliticaCache | null {
  return POLITICAS.find((p) => p.ruta.test(pathname))?.politica ?? null;
}

// ETag débil: SHA-256 del cuerpo en base64url (22 caracteres, 132 bits).
async function etagDe(cuerpo: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", cuerpo));
  const b64 = btoa(String.fromCharCode(...h)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `W/"${b64.slice(0, 22)}"`;
}

function coincide(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const debil = (e: string) => e.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((e) => e.trim() === "*" || debil(e) === debil(etag));
}

// Aplica la política a una respuesta ya armada (con sus encabezados CORS). Sin política, o si no es GET 200, la
// devuelve tal cual. Con If-None-Match que coincide, responde 304 sin cuerpo con los mismos encabezados.
export async function aplicarCacheHttp(req: Request, res: Response, politica: PoliticaCache | null): Promise<Response> {
  if (!politica || req.method !== "GET" || res.status !== 200) return res;
  const cuerpo = new Uint8Array(await res.arrayBuffer());
  const etag = await etagDe(cuerpo);
  const h = new Headers(res.headers);
  h.set("Cache-Control", politica.cacheControl);
  h.set("ETag", etag);
  if (politica.vary) h.set("Vary", politica.vary);
  if (coincide(req.headers.get("If-None-Match"), etag)) {
    h.delete("Content-Type");
    return new Response(null, { status: 304, headers: h });
  }
  return new Response(cuerpo, { status: 200, headers: h });
}
