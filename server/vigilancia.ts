// Vigilante del servidor (openspec: vigilancia-servidor). Lo corre GitHub Actions cada 15 min:
//   deno run --allow-net --allow-env server/vigilancia.ts
// Revisa /salud y abre, actualiza o cierra un issue con la etiqueta "vigilancia" que menciona al profe:
// GitHub le manda el correo. Variables: GITHUB_TOKEN, GITHUB_REPOSITORY, SALUD_URL (opcional),
// FORZAR=ok|advertencia|bloqueado|caido (prueba manual), SIMULAR=1 (no escribe en GitHub).

export type Estado = "ok" | "advertencia" | "bloqueado" | "caido";
export const TITULOS = { bloqueado: "🔴 Servidor bloqueado", advertencia: "⚠️ Cerca del límite de GitHub" } as const;
const ETIQUETA = "vigilancia";
const MENCION = "@jalducin";

type Abierto = { numero: number; titulo: string } | null;
export type Decision =
  | { accion: "crear"; titulo: string }
  | { accion: "cambiar"; titulo: string; numero: number }
  | { accion: "cerrar"; numero: number }
  | { accion: "nada" };

// Qué hacer: un aviso por problema; sin comentarios repetidos mientras el estado no cambie.
export function decidir(estado: Estado, abierto: Abierto): Decision {
  let titulo: string | null = null;
  if (estado === "bloqueado" || estado === "caido") titulo = TITULOS.bloqueado;
  else if (estado === "advertencia") titulo = TITULOS.advertencia;
  if (!titulo) return abierto ? { accion: "cerrar", numero: abierto.numero } : { accion: "nada" };
  if (!abierto) return { accion: "crear", titulo };
  return abierto.titulo === titulo ? { accion: "nada" } : { accion: "cambiar", titulo, numero: abierto.numero };
}

export function horaCDMX(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

// deno-lint-ignore no-explicit-any
function lineasDe(estado: Estado, salud: any): string[] {
  const g = salud?.github;
  const restantes = g ? `Lecturas restantes de la API de GitHub: **${g.restantes} de ${g.limite}**.` : "";
  const aviso = "Mientras tanto Juegos, Inglés y el portal muestran «Hay mucha actividad».";
  switch (estado) {
    case "ok": return [restantes || "El servidor responde en `/salud`."];
    case "caido": return ["El servidor **no responde** en `/salud`."];
    case "advertencia": return [restantes + " Es menos del 10 %.", "Si se agotan, " + aviso.charAt(0).toLowerCase() + aviso.slice(1)];
    default: {
      const motivo = salud?.motivo ? " (`" + salud.motivo + "`)" : "";
      return ["El servidor no puede leer el repo de datos" + motivo + ".", restantes, aviso];
    }
  }
}

// deno-lint-ignore no-explicit-any
function detalle(estado: Estado, salud: any, url: string): string {
  const lineas = lineasDe(estado, salud);
  const reinicio = salud?.github?.reinicio;
  if (reinicio && (estado === "bloqueado" || estado === "advertencia")) lineas.push("El límite se libera a las **" + horaCDMX(reinicio) + "** (hora CDMX).");
  const ahora = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return [...lineas.filter(Boolean), "", "Revisión: " + ahora + " (CDMX) · " + url].join("\n");
}

async function main() {
  const env = (k: string) => Deno.env.get(k) ?? "";
  const repo = env("GITHUB_REPOSITORY") || "jalducin/platform-STALD";
  const url = env("SALUD_URL") || "https://stald.jalducin.deno.net/salud";
  const simular = env("SIMULAR") === "1";
  const forzar = env("FORZAR") as Estado | "";

  // deno-lint-ignore no-explicit-any
  let salud: any = null, estado: Estado;
  if (forzar) estado = forzar;
  else {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      salud = await r.json();
      estado = ["ok", "advertencia", "bloqueado"].includes(salud?.estado) ? salud.estado : "caido";
    } catch { estado = "caido"; }
  }
  console.log(`estado: ${estado}`);

  const gh = async (method: string, ruta: string, body?: unknown) => {
    if (simular && method !== "GET") { console.log(`[simulado] ${method} ${ruta} ${body ? JSON.stringify(body) : ""}`); return null; }
    const r = await fetch(`https://api.github.com/repos/${repo}${ruta}`, {
      method, body: body ? JSON.stringify(body) : undefined,
      headers: { "Authorization": `Bearer ${env("GITHUB_TOKEN")}`, "Accept": "application/vnd.github+json", "User-Agent": "platform-STALD-vigilancia" },
    });
    if (!r.ok && r.status !== 422) throw new Error(`github ${method} ${ruta} → ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : await r.json();
  };

  const lista = simular && !env("GITHUB_TOKEN") ? JSON.parse(env("ABIERTO_SIM") || "[]") : await gh("GET", `/issues?labels=${ETIQUETA}&state=open&per_page=1`);
  const abierto: Abierto = lista?.[0] ? { numero: lista[0].number, titulo: lista[0].title } : null;
  const d = decidir(estado, abierto);
  console.log(`decisión: ${JSON.stringify(d)}`);
  if (d.accion === "crear") {
    await gh("POST", "/labels", { name: ETIQUETA, color: "B60205", description: "Avisos del vigilante del servidor" }); // 422 si ya existe
    await gh("POST", "/issues", { title: d.titulo, labels: [ETIQUETA], body: `${MENCION} ${detalle(estado, salud, url)}` });
  } else if (d.accion === "cambiar") {
    await gh("POST", `/issues/${d.numero}/comments`, { body: `${MENCION} ahora: **${d.titulo}**\n\n${detalle(estado, salud, url)}` });
    await gh("PATCH", `/issues/${d.numero}`, { title: d.titulo });
  } else if (d.accion === "cerrar") {
    await gh("POST", `/issues/${d.numero}/comments`, { body: `${MENCION} ✅ **Recuperado.** El servidor responde normal.\n\n${detalle("ok", salud, url)}` });
    await gh("PATCH", `/issues/${d.numero}`, { state: "closed", state_reason: "completed" });
  }
}

if (import.meta.main) await main();
