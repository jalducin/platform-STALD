// Puntos de constancia y orden del ranking por grupo de Inglés (openspec: rpg-fase2-ingles). Funciones puras, sin DOM
// ni peticiones: las usan el servidor (server/gamificacion.ts, con import) y la página (ingles.html, con <script>).
// Premian el esfuerzo, no la calificación: 10 por actividad enviada a tiempo, 5 por enviada tarde y 20 por paso de
// misión entregado, contados por la fecha de envío dentro de la semana (lunes a domingo, hora de la Ciudad de México).
// Script clásico: expone `globalThis.Constancia`.
(function (g) {
  'use strict';

  const PUNTOS = { aTiempo: 10, tarde: 5, pasoMision: 20 };
  const ZONA = 'America/Mexico_City';

  // AAAA-MM-DD en la Ciudad de México de un instante ISO (vacío si no es una fecha).
  function diaMx(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: ZONA });
  }
  // Semana (lunes a domingo) que contiene el día AAAA-MM-DD.
  function semanaDe(hoy) {
    const d = new Date(hoy + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const desde = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 6);
    return { desde, hasta: d.toISOString().slice(0, 10) };
  }
  const enSemana = (iso, semana) => { const f = diaMx(iso); return !!f && f >= semana.desde && f <= semana.hasta; };

  // envios = { actividades: [{ enviadoEn, aTiempo }], pasosMision: [{ enviadoEn }] }. Una entrada por actividad (su
  // primer envío: reintentar no suma más). Los pasos de misión llegan con el motor de misiones (Fase 2a).
  function puntosConstancia(envios, semana) {
    const e = envios || {};
    let puntos = 0;
    for (const a of e.actividades || []) if (a && enSemana(a.enviadoEn, semana)) puntos += a.aTiempo ? PUNTOS.aTiempo : PUNTOS.tarde;
    for (const p of e.pasosMision || []) if (p && enSemana(p.enviadoEn, semana)) puntos += PUNTOS.pasoMision;
    return puntos;
  }

  // Posición con empates compartidos (1, 2, 2, 4): más puntos primero; a igual puntaje, por nick (es-MX).
  function ordenarRanking(filas) {
    const lista = (filas || []).slice().sort((a, b) => b.puntos - a.puntos || String(a.nick).localeCompare(String(b.nick), 'es'));
    return lista.map(f => ({ ...f, posicion: 1 + lista.findIndex(x => x.puntos === f.puntos) }));
  }
  // Posición que tendría `puntos` entre `filas` (la propia, aunque la persona no aparezca).
  const posicionDe = (puntos, filas) => 1 + (filas || []).filter(f => f.puntos > puntos).length;

  g.Constancia = { PUNTOS, ZONA, diaMx, semanaDe, puntosConstancia, ordenarRanking, posicionDe };
})(typeof globalThis !== 'undefined' ? globalThis : this);
