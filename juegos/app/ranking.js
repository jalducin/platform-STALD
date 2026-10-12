// Juegos · ranking (openspec: organizar-codigo).
// 🏆 Ranking: semana, ⭐ individuales, 👥 partidas y 🔥 juegos.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
function rangoSemana(lunes) {
  const d = new Date(lunes + 'T12:00:00'); const f = new Date(d); f.setDate(d.getDate() + 6);
  const o = { day: 'numeric', month: 'short' };
  return d.toLocaleDateString('es-MX', o) + ' al ' + f.toLocaleDateString('es-MX', o);
}

const medalla = p => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : p;
const plural = (n, uno, varios) => fmt(n) + ' ' + (n === 1 ? uno : varios);

// 🔥 Juegos más jugados de la semana (openspec: ranking-juegos-populares).
async function pintarRankingJuegos(body, pestanas) {
  const r = await api('/juegos/ranking/juegos', null, { ttl: 30000 });
  if (!r.ok) { body.innerHTML = pestanas + '<div class="alert">No se pudo cargar el ranking (' + escapeHtml(r.body.error || r.status) + ').</div>'; return; }
  const lista = r.body.juegos || [];
  const lider = lista.length ? lista[0].jugadores : 1;
  body.innerHTML = pestanas + '<p class="muted" style="margin:10px 0">Semana del ' + escapeHtml(rangoSemana(r.body.semana)) + ' · los juegos que más personas jugaron.</p>' +
    (lista.length
      ? '<ol class="rank" id="rank-juegos" aria-label="Juegos más jugados de la semana">' + lista.map(x => {
        const j = juegoPorId(x.id);
        return '<li data-rj="' + escapeHtml(x.id) + '"' + (x.pos > 10 ? ' class="rj-extra"' : '') + '><span class="pos">' + medalla(x.pos) + '</span><span class="rj-ico" aria-hidden="true">' + (j ? j.emoji : '🎮') + '</span>' +
          '<span class="n">' + escapeHtml(x.titulo) + '<br><small>' + plural(x.jugadores, 'jugador', 'jugadores') + ' · ' + plural(x.partidas, 'partida', 'partidas') + '</small>' +
          '<span class="rj-barra" aria-hidden="true"><span style="width:' + Math.max(4, Math.round(x.jugadores / lider * 100)) + '%"></span></span>' +
          (x.mejor ? '<small>👑 Mejor puntaje: ' + escapeHtml(x.mejor.nombre) + ' · ' + plural(x.mejor.puntos, 'punto', 'puntos') + '</small>' : '') + '</span></li>';
      }).join('') + '</ol>' +
      (lista.length > 10 ? '<button type="button" class="btn ghost rj-todos" id="rj-todos" aria-controls="rank-juegos" aria-expanded="false" data-total="' + lista.length + '">Ver los ' + lista.length + ' juegos ▾</button>' : '')
      : '<div class="card muted" style="text-align:center">Todavía nadie juega esta semana. ¡Estrena un juego! 🚀</div>');
}

async function pintarRanking() {
  const body = document.getElementById('tab-body');
  body.innerHTML = '<div class="loading">Cargando ranking…</div>';
  const tipo = state.rtipo;
  const pestanas = '<div class="opts tres" style="margin-top:10px">' + [['individual', '⭐ Individuales'], ['partidas', '👥 Partidas'], ['juegos', '🔥 Juegos']].map(([id, t]) =>
    '<button class="opt" data-rtipo="' + id + '" aria-pressed="' + (tipo === id) + '">' + t + '</button>').join('') + '</div>';
  if (tipo === 'juegos') return pintarRankingJuegos(body, pestanas);
  const r = await api('/juegos/ranking?tipo=' + tipo, null, { ttl: 30000 }); // 30 s; un envío lo vacía
  if (!r.ok) { body.innerHTML = '<div class="alert">No se pudo cargar el ranking (' + escapeHtml(r.body.error || r.status) + ').</div>'; return; }
  const ico = tipo === 'partidas' ? '👥' : '⭐';
  body.innerHTML = pestanas + '<p class="muted" style="margin:10px 0">Semana del ' + escapeHtml(rangoSemana(r.body.semana)) + ' · ' +
    (tipo === 'partidas' ? 'suman todas tus partidas con otros jugadores.' : 'suman todos tus juegos individuales.') + '</p>' +
    (r.body.top.length
      ? '<ol class="rank">' + r.body.top.map(x => '<li class="' + (x.yo ? 'yo' : '') + '"><span class="pos">' + medalla(x.pos) + '</span>' + avatarHtml(x.avatar, 30) + '<span class="n">' + escapeHtml(x.nombre) +
        (x.tipo === 'invitado' ? ' <small>(invitado)</small>' : '') + '<br><small>' + x.partidas + ' partida(s)</small></span><span class="pts">' + ico + ' ' + fmt(x.total) + '</span></li>').join('') + '</ol>'
      : '<div class="card muted" style="text-align:center">' + (tipo === 'partidas' ? 'Nadie ha jugado partidas esta semana. ¡Crea una en 👥 Partidas! 🚀' : 'Nadie ha jugado esta semana. ¡Estrena el ranking! 🚀') + '</div>') +
    (r.body.yo.pos && r.body.yo.pos > 20 ? '<p class="muted">Tu lugar: #' + r.body.yo.pos + ' con ' + ico + ' ' + fmt(r.body.yo.total) + '</p>' : '');
}
