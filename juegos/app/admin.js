// Juegos · admin (openspec: organizar-codigo).
// 🛡️ Admin: jugadores, pendientes, invitados y fotos.
// Script clásico (sin build ni módulos ES): juegos.html lo carga en orden y todos comparten el ámbito global
// (const/let/function de nivel superior). Ver docs/frontend-standards.md, «Estructura de juegos/app/».
// ---------- 🛡️ Admin (openspec: jugadores-admin, avatar-foto y admin-juegos-unificado) ----------
// Una sola pestaña con 4 sub-secciones. Las tres rutas se piden en paralelo al abrirla (así salen los contadores);
// cambiar de sub-sección o buscar no vuelve a pedir nada. Los correos solo los ve el admin (lo decide el servidor).
// localStorage.juegos_admin_sub guarda solo el id de la sub-sección (preferencia de interfaz, sin datos personales).
const ADM_SUBS = [
  { id: 'jugadores', e: '🧑‍🤝‍🧑', t: 'Jugadores', fuente: 'jugadores' },
  { id: 'pendientes', e: '⏳', t: 'Pendientes', fuente: 'jugadores' },
  { id: 'invitados', e: '📋', t: 'Invitados', fuente: 'invitados' },
  { id: 'fotos', e: '📷', t: 'Fotos', fuente: 'fotos' },
];
const ADM_FUENTES = ['jugadores', 'invitados', 'fotos'];
const ADM_KEY = 'juegos_admin_sub';
const subAdmin = id => ADM_SUBS.find(s => s.id === id);
const leerSubAdmin = () => { try { const v = localStorage.getItem(ADM_KEY); return subAdmin(v) ? v : 'jugadores'; } catch { /* sin almacenamiento: sección por omisión */ return 'jugadores'; } };
const guardarSubAdmin = id => { try { localStorage.setItem(ADM_KEY, id); } catch (e) { /* sin almacenamiento */ } };
const normaliza = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fechaCorta = s => s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const buscaAttr = (...xs) => ' data-busca="' + escapeHtml(normaliza(xs.filter(Boolean).join(' '))) + '"';
let admCarga = 0;

function pintarAdmin() {
  state.admSub = subAdmin(state.admSub) ? state.admSub : leerSubAdmin();
  state.adm = {};
  document.getElementById('tab-body').innerHTML = '<div class="adm">' +
    '<div class="adm-cab"><p class="muted">🔒 Los correos solo los ves tú.</p>' +
    '<button class="btn ghost sm" type="button" data-a="adm-actualizar" aria-label="Actualizar las listas">↻ Actualizar</button></div>' +
    '<div id="adm-subs" class="adm-subs" role="tablist" aria-label="Secciones de administración"></div>' +
    '<div id="adm-tools" class="adm-tools"><div class="adm-buscar"><label for="adm-buscar" class="sr-only">Buscar por nombre, nick o correo</label>' +
    '<input id="adm-buscar" type="search" placeholder="Nombre, nick o correo" autocomplete="off" spellcheck="false"></div><span id="adm-csv"></span></div>' +
    '<p id="adm-resumen" class="muted adm-resumen" aria-live="polite"></p>' +
    '<div id="adm-panel" role="tabpanel"></div></div>';
  document.getElementById('adm-buscar').addEventListener('input', aplicarBusqueda);
  document.getElementById('adm-subs').addEventListener('keydown', teclaSubAdmin);
  cargarAdmin(ADM_FUENTES);
}

// Pide las fuentes indicadas en paralelo; cada una guarda su resultado o su error sin tapar a las demás.
function cargarAdmin(fuentes) {
  const adm = state.adm;
  fuentes.forEach(f => { adm[f] = { cargando: true, tok: ++admCarga }; });
  refrescarAdmin();
  return Promise.all(fuentes.map(async f => {
    const tok = adm[f].tok;
    let r; try { r = await api('/juegos/' + f); } catch (e) { r = { ok: false, body: { error: 'sin_conexion' } }; }
    if (state.adm !== adm || adm[f].tok !== tok) return; // respuesta vieja: ya se pidió otra vez
    state.adm[f] = r.ok ? { body: r.body } : { error: r.body.error || r.status };
    if (f === 'jugadores' && r.ok) state.jugadoresLista = { jugadores: r.body.jugadores, pendientes: r.body.pendientes };
    if (f === 'invitados' && r.ok) state.invitadosLista = r.body.invitados;
    if (document.getElementById('adm-panel')) refrescarAdmin();
  }));
}

// Lista de elementos de una sub-sección, o null si su fuente aún carga o falló.
function listaAdmin(id) {
  const f = state.adm[subAdmin(id).fuente];
  if (!f || !f.body) return null;
  return id === 'jugadores' ? f.body.jugadores : id === 'pendientes' ? f.body.pendientes : id === 'invitados' ? f.body.invitados : f.body.fotos;
}

function refrescarAdmin() {
  if (!document.getElementById('adm-panel')) return;
  const sub = state.admSub;
  const subs = document.getElementById('adm-subs'); const conFoco = subs.contains(document.activeElement);
  subs.innerHTML = ADM_SUBS.map(s => {
    const f = state.adm[s.fuente] || { cargando: true }; const l = listaAdmin(s.id);
    const n = f.cargando ? '…' : f.error ? '!' : String(l.length);
    const clase = 'adm-sub' + (f.error ? ' falla' : s.id === 'pendientes' && l && l.length ? ' atender' : '');
    return '<button type="button" class="' + clase + '" role="tab" id="adm-tab-' + s.id + '" data-adm="' + s.id + '" aria-controls="adm-panel" aria-selected="' + (s.id === sub) + '" tabindex="' + (s.id === sub ? 0 : -1) + '">' +
      '<span class="adm-t"><span aria-hidden="true">' + s.e + '</span> ' + s.t + '</span><span class="adm-n">' + n + '</span></button>';
  }).join('');
  if (conFoco) document.getElementById('adm-tab-' + sub).focus(); // redibujar no le quita el foco al teclado
  document.getElementById('adm-panel').setAttribute('aria-labelledby', 'adm-tab-' + sub);
  const csv = { jugadores: ['csv-jugadores', 'jugadores'], pendientes: ['csv-jugadores', 'jugadores'], invitados: ['csv', 'invitados'] }[sub];
  document.getElementById('adm-csv').innerHTML = csv ? '<button class="btn ghost" type="button" data-a="' + csv[0] + '" title="Descargar CSV de ' + csv[1] + '" aria-label="Descargar CSV de ' + csv[1] + '"' + (listaAdmin(sub) ? '' : ' disabled') + '>⬇️ CSV</button>' : '';
  pintarPanelAdmin();
}

function pintarPanelAdmin() {
  const panel = document.getElementById('adm-panel'); const sub = state.admSub;
  const s = subAdmin(sub); const f = state.adm[s.fuente] || { cargando: true };
  if (f.cargando) { panel.innerHTML = '<div class="adm-lista" aria-busy="true" aria-label="Cargando ' + s.t.toLowerCase() + '">' + '<div class="adm-esq"></div>'.repeat(4) + '</div>'; return aplicarBusqueda(); }
  if (f.error) { panel.innerHTML = '<div class="alert" role="alert">No se pudo cargar ' + s.t.toLowerCase() + ' (' + escapeHtml(f.error) + '). <button class="btn ghost sm" type="button" data-a="adm-reintentar" data-fuente="' + s.fuente + '">↻ Reintentar</button></div>'; return aplicarBusqueda(); }
  const l = listaAdmin(sub);
  const vacio = (e, t, x) => '<div class="adm-lista"><div class="adm-vacio"><span class="e" aria-hidden="true">' + e + '</span><b>' + t + '</b>' + (x || '') + '</div></div>';
  const lista = (cuerpo, etiqueta, clase) => '<div class="adm-lista' + (clase ? ' ' + clase : '') + '" tabindex="0" aria-label="' + etiqueta + '">' + cuerpo + '</div>';
  const ini = (nombre, foto) => '<span class="adm-ini" aria-hidden="true">' + (foto ? '<img src="' + escapeHtml(fotoSrc({ foto })) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + escapeHtml((nombre || '?').trim().charAt(0).toUpperCase()) + '</span>';
  if (sub === 'jugadores') {
    const fotos = Object.fromEntries(((state.adm.fotos && state.adm.fotos.body && state.adm.fotos.body.fotos) || []).map(x => [x.id, x.token]));
    const tipo = j => j.tipo === 'invitado' ? '🎮 Juegos' : j.espacio === 'Secundaria' ? '📚 Secundaria' : '📘 Inglés';
    panel.innerHTML = l.length ? lista('<table class="adm-tabla" id="jug-tabla" style="--cols:4"><thead><tr><th scope="col">Jugador</th><th scope="col">Tipo</th><th scope="col" class="num">Puntos</th><th scope="col" class="num">Partidas</th><th scope="col">Última visita</th></tr></thead><tbody>' +
      l.map(j => '<tr' + buscaAttr(j.nombre, j.nick, j.email) + '><td class="ancho"><div class="adm-quien">' + ini(j.nick || j.nombre, fotos[j.id]) + '<div><b>' + escapeHtml(j.nombre) + '</b>' +
        (j.nick ? '<span class="adm-nick" title="Nick">✏️ ' + escapeHtml(j.nick) + '</span>' : '') + '<div class="adm-correo">' + escapeHtml(j.email) + '</div></div></div></td>' +
        '<td data-label="Tipo"><span class="adm-tipo">' + tipo(j) + '</span></td><td data-label="Puntos" class="num">⭐ ' + fmt(j.puntosSemana) + '</td><td data-label="Partidas" class="num">' + j.partidasSemana + '</td>' +
        '<td data-label="Visita">' + escapeHtml(fechaCorta(j.ultimaVisita)) + '</td></tr>').join('') + '</tbody></table>', 'Lista de jugadores registrados')
      : vacio('🧑‍🤝‍🧑', 'Todavía no hay jugadores registrados.', 'Aparecen cuando alumnos, alumnas o invitados entran a Juegos.');
  } else if (sub === 'pendientes') {
    const aviso = f.body.cuentasError ? '<div class="alert">No pude leer las cuentas de acceso; los registros pendientes no aparecen por ahora.</div>' : '';
    panel.innerHTML = aviso + '<p class="muted">Pueden entrar a Juegos con su correo y su nick; no hace falta mandarles nada.</p>' + (l.length ? lista('<table class="adm-tabla" id="jug-pendientes"><thead><tr><th scope="col">Correo</th><th scope="col">Estado</th><th scope="col">Intentó</th></tr></thead><tbody>' +
      l.map(p => '<tr' + buscaAttr(p.email) + '><td class="ancho"><b class="adm-correo" style="color:var(--text)">' + escapeHtml(p.email) + '</b></td>' +
        '<td data-label="Estado" class="adm-estado">' + (p.estado === 'sin confirmar' ? '✉️ No confirmó su correo' : '🙈 Entró sin elegir apodo') + '</td>' +
        '<td data-label="Intentó">' + escapeHtml(fechaCorta(p.creada)) + '</td></tr>').join('') + '</tbody></table>', 'Lista de registros pendientes')
      : vacio('🎉', 'Sin registros pendientes.', 'Todos los que se registraron ya pueden jugar.'));
  } else if (sub === 'invitados') {
    panel.innerHTML = l.length ? lista('<table class="adm-tabla" id="inv-tabla" style="--cols:3"><thead><tr><th scope="col">Invitado</th><th scope="col" class="num">Visitas</th><th scope="col">Última visita</th><th scope="col" class="num">Puntos semana</th></tr></thead><tbody>' +
      l.map(x => '<tr' + buscaAttr(x.nombre, x.email) + '><td class="ancho"><div class="adm-quien">' + ini(x.nombre) + '<div><b>' + escapeHtml(x.nombre) + '</b><div class="adm-correo">' + escapeHtml(x.email) + '</div></div></div></td>' +
        '<td data-label="Visitas" class="num">' + x.visitas + '</td><td data-label="Última">' + escapeHtml(fechaCorta(x.ultimaVisita)) + '</td>' +
        '<td data-label="Puntos" class="num">⭐ ' + fmt(x.puntosSemana) + '</td></tr>').join('') + '</tbody></table>', 'Lista de invitados')
      : vacio('📋', 'Todavía no hay invitados.', 'Aparecen cuando alguien que no es de las clases crea su cuenta de Juegos.');
  } else {
    const porId = Object.fromEntries(((state.adm.jugadores && state.adm.jugadores.body && state.adm.jugadores.body.jugadores) || []).map(j => [j.id, j]));
    panel.innerHTML = l.length ? lista('<div class="fotos-grid">' + l.map(x => {
      const j = porId[x.id] || {};
      return '<div class="card"' + buscaAttr(x.nombre, j.nombre, j.nick, j.email) + '><img src="' + escapeHtml(fotoSrc({ foto: x.token })) + '" alt="Foto de ' + escapeHtml(x.nombre) + '" loading="lazy"><b>' + escapeHtml(x.nombre) + '</b>' +
        (j.email ? '<span class="adm-correo">' + escapeHtml(j.email) + '</span>' : '') + '<small class="muted">' + escapeHtml(fechaCorta(x.en)) + '</small>' +
        '<button class="btn ghost sm" type="button" data-quitar-foto="' + escapeHtml(x.id) + '" aria-label="Quitar la foto de ' + escapeHtml(x.nombre) + '">🗑️ Quitar</button></div>';
    }).join('') + '</div>', 'Fotos de avatar', 'fotos')
      : vacio('📷', 'No hay fotos de avatar.', 'Cuando alguien suba su foto, aquí podrás revisarla.');
  }
  aplicarBusqueda();
}

// Filtra la sub-sección activa por nombre, nick o correo (sin mayúsculas ni acentos) y dice cuántos coinciden.
function aplicarBusqueda() {
  const input = document.getElementById('adm-buscar'); const panel = document.getElementById('adm-panel');
  if (!input || !panel) return;
  const q = normaliza(input.value.trim()); const items = [...panel.querySelectorAll('[data-busca]')];
  let n = 0; items.forEach(x => { x.hidden = !!q && !x.dataset.busca.includes(q); if (!x.hidden) n++; });
  const lista = panel.querySelector('.adm-lista[tabindex]'); const sin = panel.querySelector('#adm-sin');
  if (lista) lista.hidden = !!q && !n;
  if (sin) sin.remove();
  if (q && items.length && !n) panel.insertAdjacentHTML('beforeend', '<div id="adm-sin" class="adm-lista"><div class="adm-vacio"><span class="e" aria-hidden="true">🔎</span><b>Nada coincide con «' + escapeHtml(input.value.trim()) + '».</b><button class="btn ghost sm" type="button" data-a="adm-limpiar" style="margin-top:8px">Limpiar búsqueda</button></div></div>');
  const sub = state.admSub; const l = listaAdmin(sub);
  const nombres = { jugadores: ['jugador registrado', 'jugadores registrados'], pendientes: ['registro pendiente', 'registros pendientes'], invitados: ['invitado', 'invitados'], fotos: ['foto de avatar', 'fotos de avatar'] }[sub];
  const extra = { pendientes: ' Se registraron pero no terminaron: genera su enlace y mándaselo por WhatsApp.', fotos: ' Si alguna no es adecuada, quítala: vuelve a su personaje.' }[sub] || '';
  document.getElementById('adm-resumen').textContent = !l ? '' : q ? n + ' de ' + l.length + ' coinciden con «' + input.value.trim() + '».'
    : l.length + ' ' + nombres[l.length === 1 ? 0 : 1] + '.' + (l.length ? extra : '');
}

function cambiarSubAdmin(id, foco) {
  if (!subAdmin(id)) return;
  state.admSub = id; guardarSubAdmin(id); refrescarAdmin();
  if (foco) document.getElementById('adm-tab-' + id).focus();
}
// ← → Inicio Fin entre sub-secciones (patrón de pestañas de WAI-ARIA).
function teclaSubAdmin(e) {
  const i = ADM_SUBS.findIndex(s => s.id === state.admSub); const k = ADM_SUBS.length;
  const j = { ArrowRight: (i + 1) % k, ArrowLeft: (i - 1 + k) % k, Home: 0, End: k - 1 }[e.key];
  if (j === undefined) return;
  e.preventDefault(); cambiarSubAdmin(ADM_SUBS[j].id, true);
}

// Moderación de fotos de avatar: al quitar una, se vuelve a pedir solo la lista de fotos.
async function quitarFoto(b) {
  if (!confirm('¿Quitar esta foto? El jugador volverá a su personaje.')) return;
  b.disabled = true;
  const r = await post('/juegos/fotos/quitar', { id: b.dataset.quitarFoto });
  if (!r.ok) { b.disabled = false; alert('No se pudo quitar (' + (r.body.error || r.status) + ').'); return; }
  if (b.dataset.quitarFoto === state.jugador.id) { delete state.jugador.avatar.foto; pintarChip(); }
  return cargarAdmin(['fotos']);
}

function descargarCsv(filas, nombre) {
  const csv = filas.map(f => f.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
  a.download = nombre; a.click();
}
