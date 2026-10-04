// Publicación del estado de una sala en Supabase Realtime (openspec: salas-realtime).
// Deno empuja el estado tras cada cambio; las páginas escuchan el canal en lugar de consultar cada pocos segundos.
// La llave de servicio vive solo en las variables de Deno; nunca se envía al navegador.

export interface ConfigRealtime {
  url: string; // https://<ref>.supabase.co
  publica: string; // llave publishable (va al navegador)
  servicio: string; // llave secret (solo servidor)
  fetch?: typeof fetch; // inyectable en pruebas
}

export function canalNuevo(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const topicDe = (canal: string) => `sala-${canal}`;

// Broadcast por REST con tope de 3 s. Una falla se registra y se ignora: la partida sigue con sondeo.
export async function publicarSala(cfg: ConfigRealtime, canal: string, payload: unknown): Promise<boolean> {
  const f = cfg.fetch ?? fetch;
  try {
    const res = await f(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "apikey": cfg.servicio, "Authorization": `Bearer ${cfg.servicio}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: topicDe(canal), event: "estado", payload, private: false }] }),
      signal: AbortSignal.timeout(3000),
    });
    await res.body?.cancel();
    if (!res.ok) console.error("realtime:", res.status);
    return res.ok;
  } catch (e) {
    console.error("realtime:", e instanceof Error ? e.message : e);
    return false;
  }
}
