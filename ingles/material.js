// Inglés · material de estudio siempre disponible (openspec: ingles-material-estudio).
// Lee el catálogo público ingles/material/indice.json (GitHub Pages, sin datos personales) y pinta una tarjeta por
// guía con «⬇️ Descargar PDF» y «👁️ Ver». No depende de la sesión ni de las fechas de las actividades: lo usan la
// vista de alumnos y alumnas, la del admin, la ruta del profe y la entrada sin sesión.
const MATERIAL_INDICE = new URL('ingles/material/indice.json', location.href);
// null = cargando; [] o arreglo = listo; { error } = no cargó.
let materialCatalogo = null;

// Se pide una sola vez al cargar la página; al llegar rellena cada marcador [data-material] ya pintado.
fetch(MATERIAL_INDICE, { cache: 'no-cache' })
  .then(r => {
    if (!r.ok) { throw new Error('HTTP ' + r.status); }
    return r.json();
  })
  .then(lista => { materialCatalogo = Array.isArray(lista) ? lista : []; })
  .catch(e => { materialCatalogo = { error: e.message }; })
  .then(() => { document.querySelectorAll('[data-material]').forEach(el => { el.innerHTML = htmlMaterialLista(); }); });

// Dirección del PDF relativa al catálogo (sirve igual en Pages y en el servidor local de pruebas).
const urlMaterial = g => new URL(encodeURIComponent(g.id) + '.pdf', MATERIAL_INDICE).href;

function tarjetaMaterial(g) {
  const url = escapeHtml(urlMaterial(g));
  const temas = (g.temas || []).map(t => '<span class="chip neutra">' + escapeHtml(t) + '</span>').join('');
  return '<article class="material-guia" data-guia="' + escapeHtml(g.id) + '">' +
    '<div class="material-ico" aria-hidden="true">📄</div>' +
    '<div class="material-cuerpo"><h3 class="material-titulo">' + escapeHtml(g.titulo) + '</h3>' +
    '<p class="material-desc">' + escapeHtml(g.descripcion) + '</p>' +
    '<div class="chips">' + temas + '</div>' +
    '<div class="material-meta">' + (g.mes ? '🗓️ Mes ' + Number(g.mes) + ' · ' : '') + (g.nivel ? '🎓 Inglés ' + escapeHtml(g.nivel) + ' · ' : '') + '📑 ' + Number(g.paginas) + ' página' + (Number(g.paginas) === 1 ? '' : 's') + ' · PDF</div>' +
    '<div class="material-acciones"><a class="btn" href="' + url + '" download data-descargar>⬇️ Descargar PDF</a>' +
    '<a class="btn ghost" href="' + url + '" target="_blank" rel="noopener" data-ver>👁️ Ver</a></div></div></article>';
}

function htmlMaterialLista() {
  if (materialCatalogo === null) return '<div class="loading">Cargando material…</div>';
  if (!Array.isArray(materialCatalogo)) return vacio('⚠️', 'No se pudo cargar el material de estudio. Revisa tu internet e intenta más tarde.');
  if (!materialCatalogo.length) return vacio('📚', 'Todavía no hay guías de estudio.');
  // Guías mensuales: el mes más reciente primero (y, dentro del mes, la más nueva). Sin fechas límite ni candados:
  // todas las guías están siempre disponibles.
  return [...materialCatalogo].sort((a, b) => (Number(b.mes) || 0) - (Number(a.mes) || 0) || String(b.fecha).localeCompare(String(a.fecha))).map(tarjetaMaterial).join('');
}

// Bloque de la sección: introducción y la lista (se rellena sola si el catálogo aún no llega).
function renderMaterial() {
  return '<div class="material" id="material-estudio"><p class="material-intro">Guías para estudiar y pasar a tu libreta. Siempre están aquí, aunque la actividad ya haya pasado.</p>' +
    '<div class="material-lista" data-material>' + htmlMaterialLista() + '</div></div>';
}

// Entrada sin sesión: el material es público, se muestra bajo la caja de entrada (no en Secundaria).
function mostrarMaterialPublico(visible) {
  const el = document.getElementById('material-publico');
  if (!el) return;
  el.hidden = !visible || MODO_SECUNDARIA;
  if (!el.hidden && !el.innerHTML) el.innerHTML = '<h2 class="sec-titulo"><span aria-hidden="true">📚</span> Material de estudio</h2>' + renderMaterial();
}
