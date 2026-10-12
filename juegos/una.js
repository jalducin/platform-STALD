// ¡Una!: robo hasta poder tirar (openspec: basta-divertida-una-robo). Sin DOM; lo cargan juegos.html (modo
// individual y en sala) y server/basta_una_test.ts.
(function (g) {
  // Roba del final del mazo (pop) hasta sacar una carta que `valida` acepte, o hasta que el mazo se acabe.
  // No rebaraja el descarte: si el mazo se acaba sin una jugable, `jugable` es null y el turno pasa.
  // Muta `mazo` y `mano` (las robadas pasan a la mano). Funciona con cartas-objeto o con ids.
  function robarHastaPoder(mazo, mano, valida) {
    const robadas = [];
    while (mazo.length) {
      const c = mazo.pop();
      mano.push(c); robadas.push(c);
      if (valida(c)) return { robadas, jugable: c };
    }
    return { robadas, jugable: null };
  }

  // Aviso para quien robó (español de México).
  // `jugable`: la carta que sí sirve o null (en sala es un id y puede ser 0, por eso se compara con null).
  function avisoRobo(n, jugable, lang) {
    const sirve = jugable !== null && jugable !== undefined;
    if (lang === 'en') {
      if (!n) return 'No cards left to draw. Next player';
      if (!sirve) return 'You drew ' + n + (n === 1 ? ' card' : ' cards') + ' and the deck ran out. Next player';
      return n === 1 ? 'You drew 1 card and you can play it' : 'You drew ' + n + ' cards until you found one you can play';
    }
    if (!n) return 'No quedan cartas para robar. Sigue el siguiente';
    if (!sirve) return 'Robaste ' + n + (n === 1 ? ' carta' : ' cartas') + ' y se acabó el mazo sin una que sirva. Sigue el siguiente';
    return n === 1 ? 'Robaste 1 carta y sí la puedes tirar' : 'Robaste ' + n + ' cartas hasta encontrar una que sí puedes tirar';
  }

  g.Una = { robarHastaPoder, avisoRobo };
})(globalThis);
