// PostgREST falso en memoria para pruebas (openspec: ingles-grupos). Entiende solo lo que usa server/db.ts:
// deno-lint-ignore-file require-await
// filtros eq / like (* comodín) / is.null / lte / gt, select=, Prefer resolution=ignore|merge-duplicates y on_conflict.
type Fila = Record<string, unknown>;
const LLAVES: Record<string, string[]> = { docs: ["path"], grupos: ["id"], inscripciones: ["alumno", "desde"] };

export function postgrestFalso(prefijo = "stald_") {
  const tablas = new Map<string, Fila[]>();
  const tabla = (n: string) => { if (!tablas.has(n)) tablas.set(n, []); return tablas.get(n)!; };
  const llaveDe = (n: string) => LLAVES[n.slice(prefijo.length)] ?? ["id"];
  let falla = false;
  const coincide = (f: Fila, filtros: [string, string][]) => filtros.every(([col, cond]) => {
    const [op, ...resto] = cond.split("."); const v = resto.join(".");
    const x = f[col];
    if (op === "eq") return String(x) === v;
    if (op === "is") return v === "null" ? x === null || x === undefined : false;
    if (op === "like") return new RegExp("^" + v.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(String(x));
    if (op === "lte") return String(x) <= v;
    if (op === "gt") return String(x) > v;
    throw new Error("filtro no soportado " + op);
  });
  const fetchFalso = (async (input: string | URL | Request, init?: RequestInit) => {
    if (falla) throw new Error("red caída");
    const url = new URL(String(input));
    const nombre = url.pathname.replace(/^\/rest\/v1\//, "");
    const filas = tabla(nombre);
    const params = [...url.searchParams.entries()];
    const filtros = params.filter(([k]) => !["select", "on_conflict", "order"].includes(k));
    const select = url.searchParams.get("select");
    const recorta = (f: Fila) => select && select !== "*" ? Object.fromEntries(select.split(",").map((c) => [c, f[c]])) : { ...f };
    const prefer = new Headers(init?.headers).get("Prefer") || "";
    const metodo = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const resp = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    if (metodo === "GET") return resp(filas.filter((f) => coincide(f, filtros)).map(recorta));
    if (metodo === "POST") {
      const llave = (url.searchParams.get("on_conflict") || llaveDe(nombre).join(",")).split(",");
      const out: Fila[] = [];
      for (const n of (Array.isArray(body) ? body : [body]) as Fila[]) {
        const i = filas.findIndex((f) => llave.every((k) => f[k] === n[k]));
        if (i >= 0) {
          if (prefer.includes("ignore-duplicates")) continue;
          if (prefer.includes("merge-duplicates")) { filas[i] = { ...filas[i], ...n }; out.push(filas[i]); continue; }
          return resp({ code: "23505", message: "duplicate key" }, 409);
        }
        const nueva = { version: nombre.endsWith("docs") ? 1 : undefined, ...n };
        if (nueva.version === undefined) delete nueva.version;
        filas.push(nueva); out.push(nueva);
      }
      return resp(out, 201);
    }
    if (metodo === "PATCH") {
      const out: Fila[] = [];
      filas.forEach((f, i) => { if (coincide(f, filtros)) { filas[i] = { ...f, ...body }; out.push(filas[i]); } });
      return resp(out);
    }
    if (metodo === "DELETE") {
      const out = filas.filter((f) => coincide(f, filtros));
      tablas.set(nombre, filas.filter((f) => !coincide(f, filtros)));
      return resp(out);
    }
    return resp({ message: "método" }, 405);
  }) as typeof fetch;
  return { fetch: fetchFalso, tablas, tabla, caer: (v: boolean) => { falla = v; } };
}
