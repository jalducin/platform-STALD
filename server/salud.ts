// /salud: estado del límite de la API de GitHub y del repo de datos (openspec: vigilancia-servidor).
// La consulta a /rate_limit no cuenta contra el límite. Nunca se expone el token.
import type { Store } from "./store.ts";

export interface Salud {
  ok: boolean;
  estado: "ok" | "advertencia" | "bloqueado";
  motivo?: string;
  github: { limite: number; usadas: number; restantes: number; reinicio: string } | null;
  revisado: string;
}

export async function revisarSalud(deps: { token: string; store: Store; fetch?: typeof fetch }): Promise<Salud> {
  const f = deps.fetch ?? fetch;
  let github: Salud["github"] = null;
  try {
    const res = await f("https://api.github.com/rate_limit", {
      headers: { "Authorization": `Bearer ${deps.token}`, "Accept": "application/vnd.github+json", "User-Agent": "platform-STALD" },
    });
    if (res.ok) {
      const c = (await res.json())?.resources?.core;
      if (c) github = { limite: c.limit, usadas: c.used, restantes: c.remaining, reinicio: new Date(c.reset * 1000).toISOString() };
    } else await res.body?.cancel();
  } catch { /* sin datos del límite: se decide por el repo */ }

  let motivo: string | undefined;
  try {
    await deps.store.list("contenido/semanas");
  } catch (e) {
    motivo = e instanceof Error ? e.message : "repo_no_responde";
  }
  const estado: Salud["estado"] = motivo || github?.restantes === 0 ? "bloqueado"
    : github && github.restantes < github.limite * 0.1 ? "advertencia" : "ok";
  return { ok: estado !== "bloqueado", estado, ...(motivo ? { motivo } : github?.restantes === 0 ? { motivo: "limite_github" } : {}), github, revisado: new Date().toISOString() };
}
