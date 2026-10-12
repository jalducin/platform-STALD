// Motor de Basta sin DOM: normalizar, diccionario, puntos en sala y categorías divertidas
// (openspec: basta-divertida-una-robo). Lo cargan juegos.html y server/basta_una_test.ts.
(function (g) {
  // Máximo de categorías divertidas por partida: 7 de siempre + 2 = 9 casillas, que caben en el celular sin
  // hacer eterna la ronda (y quedan bajo el tope de 10 palabras por ronda del servidor). Igual que
  // MAX_EXTRAS_BASTA en server/salas.ts.
  const MAX_EXTRAS = 2;

  // Compara sin mayúsculas ni acentos, pero conserva la ñ como letra propia (\u0001 la aparta mientras se quitan acentos).
  // deno-lint-ignore no-control-regex
  const norm = s => String(s || '').trim().toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ').replace(/\s+/g, ' ');

  // Diccionario para validar: palabras de México (también ejemplos y bots) + `soloAceptar`, palabras de España que
  // valen pero no se muestran (openspec: basta-mexicano).
  const dic = d => Object.fromEntries(d.categorias.map(c => [c.id, new Set([...(d.palabras[c.id] || []), ...((d.soloAceptar || {})[c.id] || [])].map(norm))]));

  // Puntuación de Basta en sala: única/verificada 100, repetida 50; no verificada 25/10; inválida 0.
  function puntuar(d, letra, participantes) {
    const L = norm(letra);
    const dc = dic(d);
    const res = participantes.map(p => ({ nombre: p.nombre, id: p.id, total: 0, detalle: {} }));
    for (const c of d.categorias) {
      const ns = participantes.map(p => norm((p.palabras || {})[c.id] || ''));
      ns.forEach((n, i) => {
        let pts = 0, estado = '—';
        const valida = n && n.startsWith(L) && n.length >= 2;
        if (valida) {
          const repetida = ns.filter(x => x === n).length > 1;
          if (dc[c.id].has(n)) { pts = repetida ? 50 : 100; estado = repetida ? 'repetida' : 'única'; }
          else if (n.length >= 3) { pts = repetida ? 10 : 25; estado = 'no verificada'; }
          else estado = 'inválida';
        } else if (n) estado = 'inválida';
        res[i].total += pts;
        res[i].detalle[c.id] = { palabra: (participantes[i].palabras || {})[c.id] || '', pts, estado };
      });
    }
    return res.sort((a, b) => b.total - a.total);
  }

  // Ids de categorías divertidas en las opciones de la sala ("pokemon,flor"), solo las conocidas y hasta el máximo.
  // Sin `conocidas` acepta cualquier id (el servidor ya validó contra la lista).
  const CONOCIDAS = ['pokemon', 'actor', 'flor', 'anime', 'pelicula', 'heroe', 'antojito', 'refri', 'excusa', 'kitchen'];
  function extrasDe(opciones) {
    const crudo = String((opciones || {}).extra || '');
    if (!crudo) return [];
    return [...new Set(crudo.split(','))].filter(id => CONOCIDAS.includes(id)).slice(0, MAX_EXTRAS);
  }

  // Datos de Basta con las categorías divertidas al final: columna normal con su banco de respuestas, que sirve
  // de diccionario (verificada) y de palabras para los bots. Sin extras devuelve los mismos datos.
  function conExtras(d, extras, ids) {
    const elegidas = (ids || []).map(id => (extras || []).find(x => x.id === id)).filter(Boolean);
    if (!elegidas.length) return d;
    return Object.assign({}, d, {
      categorias: d.categorias.concat(elegidas.map(x => ({ id: x.id, emoji: x.emoji, titulo: x.titulo, extra: true }))),
      palabras: Object.assign({}, d.palabras, Object.fromEntries(elegidas.map(x => [x.id, x.palabras]))),
    });
  }

  g.Basta = { MAX_EXTRAS, CONOCIDAS, norm, dic, puntuar, extrasDe, conExtras };
})(globalThis);
