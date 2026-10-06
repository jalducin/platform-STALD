// Cachés en memoria del servidor (openspec: cache-estabilidad). Una por instancia de Deno Deploy.
// - crearMemo: valor por clave con vigencia, single-flight (cargas concurrentes de la misma clave comparten una sola
//   promesa) y, opcional, la última copia si la fuente falla por un tiempo acotado.
// - unaALaVez: solo single-flight, sin guardar (para quien ya tiene su propia caché, como GitHubStore con ETag).

export interface OpcionesMemo {
  ttlMs: number; // vigencia del valor
  staleMs?: number; // si la carga falla, servir la copia mientras tenga menos de esto (desde que se guardó)
  max?: number; // tope de entradas (desaloja la más vieja); 500 por omisión
  ahora?: () => number; // reloj inyectable en pruebas
  registrar?: (msg: string) => void; // aviso al servir una copia vieja (console.error por omisión)
}

export interface Memo<T> {
  get(clave: string, cargar: () => Promise<T>): Promise<T>;
  // Quita el valor y la carga en vuelo (de una clave o de todas): quien pida después carga de nuevo.
  borrar(clave?: string): void;
  tamano(): number;
}

export function crearMemo<T>(o: OpcionesMemo): Memo<T> {
  const ahora = o.ahora ?? Date.now;
  const max = o.max ?? 500;
  const registrar = o.registrar ?? ((m: string) => console.error(m));
  const valores = new Map<string, { t: number; v: T }>();
  const enVuelo = new Map<string, { p: Promise<T> }>();

  const guardar = (clave: string, v: T) => {
    valores.delete(clave);
    valores.set(clave, { t: ahora(), v });
    while (valores.size > max) valores.delete(valores.keys().next().value!);
  };

  return {
    get(clave, cargar) {
      const c = valores.get(clave);
      if (c && ahora() - c.t < o.ttlMs) return Promise.resolve(c.v);
      const vuelo = enVuelo.get(clave);
      if (vuelo !== undefined) return vuelo.p;
      // `entrada` identifica esta carga: si se borra mientras carga, otra puede ocupar su lugar.
      const entrada = {} as { p: Promise<T> };
      entrada.p = (async () => {
        try {
          const v = await Promise.resolve().then(cargar); // en un microtask, también si cargar lanza en seco
          if (enVuelo.get(clave) === entrada) guardar(clave, v); // si se borró mientras cargaba, no se guarda
          return v;
        } catch (e) {
          const copia = valores.get(clave);
          if (copia && o.staleMs !== undefined && ahora() - copia.t < o.staleMs) {
            registrar(`caché: se sirve la copia de "${clave}" (${e instanceof Error ? e.message : e})`);
            return copia.v;
          }
          throw e;
        } finally {
          if (enVuelo.get(clave) === entrada) enVuelo.delete(clave);
        }
      })();
      enVuelo.set(clave, entrada);
      return entrada.p;
    },
    borrar(clave) {
      if (clave === undefined) { valores.clear(); enVuelo.clear(); return; }
      valores.delete(clave);
      enVuelo.delete(clave);
    },
    tamano: () => valores.size,
  };
}

export interface UnaALaVez<T> {
  (clave: string, fn: () => Promise<T>): Promise<T>;
  olvidar(clave: string): void; // la próxima llamada no se une a la que está en vuelo
}

export function unaALaVez<T>(): UnaALaVez<T> {
  const enVuelo = new Map<string, Promise<T>>();
  const f = ((clave: string, fn: () => Promise<T>) => {
    const vuelo = enVuelo.get(clave);
    if (vuelo !== undefined) return vuelo;
    const p: Promise<T> = Promise.resolve().then(fn).finally(() => { if (enVuelo.get(clave) === p) enVuelo.delete(clave); });
    enVuelo.set(clave, p);
    return p;
  }) as UnaALaVez<T>;
  f.olvidar = (clave) => { enVuelo.delete(clave); };
  return f;
}
