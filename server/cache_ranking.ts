// Caché del ranking por grupo y semana (openspec: rpg-fase2-ingles): 60 s, con single-flight. Se invalida al cambiar
// un nick en Juegos, su aprobación, la preferencia de aparecer u ocultarse y el interruptor. Módulo aparte para que
// server/juegos.ts lo invalide sin importar server/gamificacion.ts.
import { crearMemo } from "./cache.ts";

const memo = crearMemo<unknown>({ ttlMs: 60_000, max: 200 });

export function memoRanking<T>(clave: string, calcular: () => Promise<T>): Promise<T> {
  return memo.get(clave, calcular) as Promise<T>;
}
export function invalidarRanking() {
  memo.borrar();
}
