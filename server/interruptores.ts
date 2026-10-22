// Interruptores del profe (openspec: plataforma-rpg, «Cómo revertir»; rpg-fase2-ingles): documentos de configuración en
// stald_docs que prenden o apagan una pieza sensible al instante y sin redeploy. Se leen en cada petición (una consulta
// a Postgres) para que apagar tenga efecto inmediato. Si el documento no existe, vale lo que diga `porDefecto`
// (apagado, en las piezas sensibles).
import type { Store } from "./store.ts";

export async function leerInterruptores<T extends object>(store: Store, ruta: string, porDefecto: T): Promise<T> {
  const doc = await store.get<Partial<T>>(ruta);
  return { ...porDefecto, ...(doc?.data && typeof doc.data === "object" ? doc.data : {}) };
}

// Cambia la configuración con concurrencia optimista (3 reintentos). Devuelve la nueva o null si hubo conflicto.
export async function cambiarInterruptores<T extends object>(store: Store, ruta: string, porDefecto: T, cambio: (actual: T) => T, mensaje: string): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    const doc = await store.get<Partial<T>>(ruta);
    const nueva = cambio({ ...porDefecto, ...(doc?.data ?? {}) });
    if (await store.put(ruta, nueva, doc?.sha ?? null, mensaje)) return nueva;
  }
  return null;
}
