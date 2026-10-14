/* Reloj común de las salas (openspec: karts-salida-y-puntos). Script clásico sin DOM: lo carga juegos.html (antes de
   juegos/app/salas.js) y lo importan las pruebas de Deno.
   Estima el desfase «hora del servidor − hora del aparato» como NTP, con la intersección de las cotas de cada muestra:
   - GET /juegos/sala: el servidor selló `ahora` al empezar a atender y `reloj` al responder, entre la salida (t0) y la
     llegada (t1) de la petición en el aparato: reloj − t1 ≤ desfase ≤ ahora − t0 (sin `reloj`, se usa `ahora`);
   - aviso de Realtime: lo sella el servidor al publicar, antes de que llegue (t): desfase ≥ ahora − t.
   El desfase es el punto medio de la intersección de las muestras de los últimos 2 minutos (si solo hay cotas
   inferiores, la mayor). Así el tiempo de procesamiento y una respuesta lenta no mueven la salida de cada aparato.
   Si la intersección queda vacía (el reloj del aparato saltó), cuenta solo la muestra más reciente. */
(function (raiz) {
  'use strict';
  const VIGENCIA_MS = 120000; // muestras más viejas que esto (respecto de la más reciente) ya no cuentan
  const MAX_MUESTRAS = 24;
  const num = x => typeof x === 'number' && Number.isFinite(x);

  function crear() {
    let muestras = []; // { t, lo, hi } (hi = Infinity en los avisos)
    function agregar(m) {
      muestras.push(m);
      const corte = m.t - VIGENCIA_MS;
      muestras = muestras.filter(x => x.t >= corte).slice(-MAX_MUESTRAS);
    }
    function offset() {
      if (!muestras.length) return 0;
      let lo = -Infinity, hi = Infinity;
      for (const m of muestras) { lo = Math.max(lo, m.lo); hi = Math.min(hi, m.hi); }
      if (lo > hi) { // el reloj del aparato saltó: manda la muestra más reciente
        const u = muestras[muestras.length - 1];
        muestras = [u];
        lo = u.lo; hi = u.hi;
      }
      return hi === Infinity ? lo : (lo + hi) / 2;
    }
    return {
      // Respuesta de GET /juegos/sala: t0 y t1 del aparato (Date.now()), `ahora` y `reloj` del servidor.
      http(t0, t1, ahora, reloj) {
        if (!num(t0) || !num(t1) || !num(ahora) || t1 < t0) return;
        const fin = num(reloj) && reloj >= ahora ? reloj : ahora;
        agregar({ t: t1, lo: fin - t1, hi: ahora - t0 });
      },
      // Aviso de Realtime: hora del aparato al recibirlo y `ahora` del servidor al publicarlo.
      aviso(t, ahora) {
        if (!num(t) || !num(ahora)) return;
        agregar({ t, lo: ahora - t, hi: Infinity });
      },
      offset,
      muestras: () => muestras.length,
    };
  }

  raiz.RelojSala = { crear, VIGENCIA_MS };
})(typeof window !== 'undefined' ? window : globalThis);
