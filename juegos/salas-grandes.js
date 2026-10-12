// Juegos para salas grandes (openspec: juegos-salas-grandes): registro común de 🎱 Bingo, ♣️ Blackjack, 🎨 Dibuja y
// adivina, y 🃏 Memorama y 🔎 Sopa de letras en partida. Script clásico cargado antes de los scripts de
// juegos/app/ (el código de juegos.html); sus funciones usan los helpers globales de juegos/app/ (sala, post, pintarFinalSala…) al llamarse.
//
// Cada juego se registra en SALAS_GRANDES[id] = {
//   preparar()                       → contenido de la sala (sala.contenido), puede ser una promesa
//   pintar(body)                     → dibuja la partida (se llama cada 250 ms y con cada aviso de Realtime)
//   clic(e)                          → true si el clic era suyo
//   participantes?(humanos, comoBot) → orden de la mesa (si no, el de siempre: personas y, con bots, los 2 bots)
//   opcionesHtml?, opciones?()       → campos propios del formulario «Crear partida» y su valor
//   nota?                            → aviso en lugar de la casilla de bots (p. ej. «sin bots»)
// }
(function (g) {
  'use strict';
  const R = g.SALAS_GRANDES = g.SALAS_GRANDES || {};
  g.AYUDA_GRANDES = g.AYUDA_GRANDES || {}; // textos de «📖 Cómo se juega» (ayuda() de juegos.html los consulta)
  const enNavegador = typeof document !== 'undefined';

  // Puntos por lugar en las carreras de Memorama y Sopa.
  const PUNTOS_LUGAR = [600, 480, 400, 340, 290, 250, 220, 200, 180, 160];

  g.SalasGrandes = {
    PUNTOS_LUGAR,
    puntosLugar: i => i < PUNTOS_LUGAR.length ? PUNTOS_LUGAR[i] : 150,
    // CSS propio de cada juego, una sola vez.
    css(id, texto) {
      if (!enNavegador || document.getElementById(id)) return;
      const st = document.createElement('style'); st.id = id; st.textContent = texto; document.head.appendChild(st);
    },
    // Cuenta regresiva antes del inicio de la sala; true si la pintó.
    cuenta(body, sub) {
      const s = sala.estado.sala, ahora = ahoraServidor();
      if (ahora >= s.inicio) return false;
      document.getElementById('m-bar').hidden = true;
      const seg = Math.ceil((s.inicio - ahora) / 1000), k = 'cuenta:' + seg;
      if (sala.vista !== k) { body.innerHTML = '<div class="q-card"><div class="sub">' + sub + '</div><div class="letra">' + seg + '</div></div>'; sala.vista = k; }
      return true;
    },
    // Barra de tiempo de la sala (fracción que queda, 0 a 1; null la oculta).
    barra(frac) {
      const bar = document.getElementById('m-bar'); if (!bar) return;
      bar.hidden = frac === null;
      if (frac !== null) bar.firstChild.style.width = Math.max(0, Math.min(100, frac * 100)) + '%';
    },
    // Formulario «Crear partida»: campos propios del juego elegido y aviso de bots.
    formulario(juego) {
      const wrap = document.getElementById('p-grandes-wrap'); if (!wrap) return;
      const j = R[juego];
      wrap.innerHTML = j && j.opcionesHtml ? j.opcionesHtml : '';
      wrap.hidden = !(j && j.opcionesHtml);
      if (j && j.nota) {
        document.getElementById('p-bots-wrap').hidden = true;
        const n = document.getElementById('p-bots-nota'); n.hidden = false; n.textContent = j.nota;
      }
    },
    opciones: juego => R[juego] && R[juego].opciones ? R[juego].opciones() : {},
    clic(e) { const j = sala.estado && R[sala.estado.sala.juego]; return !!(j && document.getElementById('p-body') && j.clic(e)); },
    // Botones de una opción (aria-pressed) dentro de un contenedor: marca el elegido y devuelve su valor.
    elegir(cont, attr, b) { cont.querySelectorAll('[' + attr + ']').forEach(x => x.setAttribute('aria-pressed', String(x === b))); return b.getAttribute(attr); },
  };
})(globalThis);
