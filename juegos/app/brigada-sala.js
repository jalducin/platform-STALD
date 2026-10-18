// ---- Brigada Xalli cooperativa en sala (openspec: brigada-xalli, design.md §11 y §12) ----
// Script clásico de la página de Juegos (después de juegos/app/arcade.js; usa sus ayudantes). La misión se juega en el
// iframe: con una sola persona (y compañeros IA) simula su aparato; con más, el anfitrión simula y los demás mandan su
// entrada por el canal en vivo (juegos/brigada-red.js). Al final cada quien manda al servidor el resultado que vio y
// el podio sale con los puntos de ranking que devuelve el servidor.
'use strict';
const NOTA_BRIGADA = {
  confirmado: '✔ Resultado confirmado por los aparatos de la sala.',
  disputa: '⚠️ Los aparatos no coincidieron: cuentan los puntos del anfitrión.',
  anfitrion: '⏳ Resultado del anfitrión (falta que lo confirmen).',
  invitado: '📡 El anfitrión perdió la conexión: cuentan los puntos que vieron los demás.',
  pendiente: '⏳ Esperando el resultado.',
};
function tituloBrigada(res) {
  const puntos = (res && res.puntos) || {}, equipo = Object.values(puntos).reduce((s, x) => s + (Number(x) || 0), 0);
  const estado = res && res.completada ? ' cumplida' : '';
  return '🦎 Misión ' + ((res && res.mision) || '') + estado + ' · equipo ' + equipo.toLocaleString('es-MX') + ' pts';
}
function podioBrigada(res, mesa) {
  const ranking = (res && res.ranking) || {};
  const filas = mesa.filter(p => !p.bot).map(p => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, avatar: p.avatar, total: Math.max(0, Math.min(1000, Math.round(Number(ranking[p.id]) || 0))), ultimo: 0 }))
    .sort((a, b) => b.total - a.total);
  sala.finAciertos = 0; sala.finTotal = 0;
  pintarFinalSala(document.getElementById('p-body'), filas, null, tituloBrigada(res));
  const card = document.querySelector('#p-body .result');
  if (card) card.insertAdjacentHTML('beforeend', '<div class="muted" id="p-brigada-nota" style="margin-top:6px">' + escapeHtml(NOTA_BRIGADA[(res && res.estado) || 'pendiente'] || '') + '</div>');
}
function notaBrigada() {
  const n = document.getElementById('p-brigada-nota'), res = sala.estado.brigada;
  if (n && res && NOTA_BRIGADA[res.estado] && !/No se pudo/.test(n.textContent)) n.textContent = NOTA_BRIGADA[res.estado];
}
function brigadaTerminada(e) {
  const mio = (e.jugadores.find(x => x.id === e.yo) || {}).brigada;
  return !!mio || (!!e.brigada && e.brigada.estado !== 'pendiente' && ahoraServidor() - e.sala.inicio > 30000);
}
function inicioBrigada(mesa, vivo) {
  const e = sala.estado, s = e.sala;
  return {
    tipo: 'inicio', modo: 'sala', rol: e.yo === s.host ? 'anfitrion' : 'invitado', anfitrion: s.host, yo: { id: e.yo, nombre: (mesa.find(p => p.id === e.yo) || {}).nombre || '' },
    asientos: mesa.map(p => ({ id: p.id, nombre: p.nombre, bot: !!p.bot, personaje: p.id === e.yo ? personajeElegido() : personajeDeAsiento(p.id) })),
    seed: s.seed, vivo, mision: s.opciones.mision || '1',
  };
}
async function finBrigada(d, personas, mesa) {
  const puntos = {};
  for (const id of personas) if (d.puntos && Number.isFinite(Number(d.puntos[id]))) puntos[id] = Math.max(0, Math.round(Number(d.puntos[id])));
  const ms = Math.max(0, Math.round(Number(d.ms) || 0));
  const r = await post('/juegos/sala/' + sala.codigo + '/respuesta', { brigada: { mision: Number(sala.estado.sala.opciones.mision || 1), ms, completada: !!d.completada, puntos, ...(d.corte ? { corte: true } : {}) } });
  await traerSala();
  podioBrigada((r.ok && r.body.brigada) || sala.estado.brigada, mesa);
  if (r.ok) return;
  const n = document.getElementById('p-brigada-nota');
  if (n) n.textContent = 'No se pudo registrar tu resultado (' + (r.body.error || r.status) + ').';
}
function pintarBrigadaSala(body) {
  const e = sala.estado;
  document.getElementById('m-bar').hidden = true;
  if (sala.vista === 'brigada') return;
  const mesa = participantes();
  if (brigadaTerminada(e)) { podioBrigada(e.brigada, mesa); return; }
  sala.vista = 'brigada';
  body.innerHTML = marcoArcade(srcArcade('brigada'), juegoPorId('brigada').t);
  const frame = document.getElementById('arcade-frame');
  if (matchMedia('(orientation: landscape) and (max-height: 520px)').matches) frame.parentElement.scrollIntoView({ block: 'start' });
  const aJuego = mensajeA(frame), personas = mesa.filter(p => !p.bot).map(p => p.id);
  const vivo = !!sala.vivoTr && !!window.EnVivo && personas.length > 1;
  if (vivo) { const pt = EnVivo.puente({ marco: frame, juego: 'brigada', transporte: sala.vivoTr, permitido: id => personas.includes(id) }); limpiezas.push(() => pt.cerrar()); }
  const alMensaje = ev => {
    const d = ev.data || {};
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || d.juego !== 'brigada') return;
    if (d.tipo === 'listo') aJuego(inicioBrigada(mesa, vivo));
    else if (d.tipo === 'fin-sala') { window.removeEventListener('message', alMensaje); finBrigada(d, personas, mesa).catch(() => {}); }
    else if (d.tipo === 'ir-solo') { window.removeEventListener('message', alMensaje); limpiar(); pantallaHub(); jugarArcade('brigada'); }
  };
  window.addEventListener('message', alMensaje);
  limpiezas.push(() => window.removeEventListener('message', alMensaje));
}
