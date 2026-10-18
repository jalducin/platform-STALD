/* Salto de Karts (openspec: karts-salto). Script clásico sin DOM: lo cargan juegos/karts.html y las pruebas de Deno
   (server/karts_salto_test.ts). Un brinquito arcade:
   - dura 0.4 s en el aire, sube 14 px (la rampa sube 22) y al caer se aplasta un instante;
   - 0.6 s de enfriamiento después de caer (no se puede spamear);
   - en el aire el giro es suave (35 %), salvo que ya vengas derrapando;
   - esquiva la cáscara y la bola en lo alto del brinco; nada más (ni cohete, ni rayo, ni bloques, ni la roca rodante);
   - NO es el aire de una rampa (k.aire): no cruza huecos ni el cenote, no salva del lodo, no acelera y no toca idx,
     vuelta ni mitadOk. Vive en k.brinco, k.brincoEnf y k.aplasta.
   - derrape: `derrape` (botón, ESPACIO, R/L) como siempre; el salto mantenido derrapa solo con el kart en el piso,
     así «brinca + gira al caer» empieza el derrape. */
(function (raiz) {
  'use strict';
  const DURACION = 0.4; // s en el aire
  const ALTO = 14; // px en lo más alto
  const ENFRIA = 0.6; // s después de caer
  const APLASTA = 0.14; // s del aplastón al caer (solo dibujo)
  const GIRO_AIRE = 0.35; // fracción del giro en el aire
  const ALTO_ESQUIVA = 7; // px: desde esta altura pasa por encima de lo que está en el piso
  const ESQUIVABLES = new Set(['cascara', 'bola']); // la roca rodante (44 px) es más alta que el brinco

  const enAire = k => (k.brinco || 0) > 0;
  function puede(k) {
    return !enAire(k) && !((k.brincoEnf || 0) > 0) && !(k.aire > 0) && !(k.cae > 0) && !(k.remolque > 0) && !(k.giro > 0) && k.termino === null;
  }
  function iniciar(k) {
    if (!puede(k)) return false;
    k.brinco = DURACION; k.aplasta = 0;
    return true;
  }
  // Un paso: devuelve 'aterriza' en el paso en que cae.
  function paso(k, dt) {
    k.aplasta = Math.max(0, (k.aplasta || 0) - dt);
    if (!enAire(k)) { k.brincoEnf = Math.max(0, (k.brincoEnf || 0) - dt); return null; }
    k.brinco -= dt;
    if (k.brinco > 0) return null;
    k.brinco = 0; k.brincoEnf = ENFRIA; k.aplasta = APLASTA;
    return 'aterriza';
  }
  function cancelar(k) { k.brinco = 0; k.aplasta = 0; }
  const altura = k => (enAire(k) ? Math.sin(Math.PI * (1 - k.brinco / DURACION)) * ALTO : 0);
  const aplastado = k => Math.max(0, k.aplasta || 0) / APLASTA; // 1 al caer → 0
  const esquiva = (k, peligro) => ESQUIVABLES.has(peligro) && altura(k) >= ALTO_ESQUIVA;
  // La regla de los huecos, el cenote, el lodo, la orilla y las trampas: solo el aire de una rampa cuenta.
  const enAireDeRampa = k => k.aire > 0;
  const giroEnAire = (giro, k) => (enAire(k) && !k.derrape ? giro * GIRO_AIRE : giro);
  const derrapa = ({ derrape, salto }, k) => !!derrape || (!!salto && !enAire(k));

  raiz.KartsSalto = { DURACION, ALTO, ENFRIA, GIRO_AIRE, ALTO_ESQUIVA, enAire, puede, iniciar, paso, cancelar, altura, aplastado, esquiva, enAireDeRampa, giroEnAire, derrapa };
})(typeof window !== 'undefined' ? window : globalThis);
