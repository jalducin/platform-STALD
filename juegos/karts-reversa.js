/* Reversa de Karts (openspec: karts-reversa). Script clásico sin DOM: lo cargan juegos/karts.html y las pruebas de Deno
   (server/karts_reversa_test.ts). Aquí viven las partes puras:
   - pasoVel: velocidad del kart en reversa (frena primero; luego retrocede a ≈ 38 % de la punta con aceleración suave);
   - quiereReversa: el botón ⏪ o la tecla R, o «frenar estando parado» (↓/S del teclado o B del mando);
   - factorGiro: el giro se escala con la velocidad; con velocidad negativa queda invertido, como un carro real;
   - cruzarMeta: cruzar la meta hacia atrás resta la vuelta y la deja pendiente (deuda); volver a cruzarla hacia
     adelante solo la repone, sin aviso: ir y venir sobre la meta no suma vueltas. */
(function (raiz) {
  'use strict';
  const FRACCION = 0.38; // tope de la reversa: 38 % de la punta
  const ACEL = 90; // px/s²: aceleración suave hacia atrás (la de adelante es 150 y el turbo 600)
  const FRENO = 380; // px/s²: igual que el freno de karts.html
  const PARADO = 8; // px/s: por debajo de esto, frenar se vuelve reversa
  const SALTO_MAX = 30; // muestras: un cruce de meta real es un paso corto (los rescates y portales fijan idx directo)

  function pasoVel(vel, top, dt) {
    if (vel > 0) return Math.max(0, vel - FRENO * dt);
    const objetivo = -Math.abs(top) * FRACCION;
    return vel + Math.max(-ACEL * dt, Math.min(ACEL * dt, objetivo - vel));
  }

  function quiereReversa({ reversa, frenoParado, vel }) {
    return !!reversa || (!!frenoParado && vel <= PARADO);
  }

  function factorGiro(vel) { return Math.min(1, vel / 90); }

  // Devuelve 'vuelta' (cuenta como siempre: llama a alCruzar), 'recupera' (repone una vuelta debida, sin aviso),
  // 'atras' (la restó) o null. Lee k.idx ya actualizado y el idx de antes. También marca mitadOk al pasar la mitad.
  function cruzarMeta(k, antes, N) {
    if ((antes > N * 0.4 && antes < N * 0.6) || (k.idx > N * 0.4 && k.idx < N * 0.6)) k.mitadOk = true; // pasó la mitad
    if (antes > N * 0.85 && k.idx < N * 0.15 && k.mitadOk) {
      k.vuelta++; k.mitadOk = false;
      if (k.deuda > 0) { k.deuda--; return 'recupera'; }
      return 'vuelta';
    }
    if (antes < N * 0.15 && k.idx > N * 0.85 && antes + N - k.idx <= SALTO_MAX && k.vuelta >= 0 && k.termino === null) {
      k.vuelta--; k.deuda = (k.deuda || 0) + 1; k.mitadOk = true;
      return 'atras';
    }
    return null;
  }

  raiz.KartsReversa = { FRACCION, ACEL, PARADO, pasoVel, quiereReversa, factorGiro, cruzarMeta };
})(typeof window !== 'undefined' ? window : globalThis);
