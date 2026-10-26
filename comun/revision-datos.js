// Revisión de la semana por el profe (openspec: revision-profe): reglas puras, sin DOM ni peticiones. Las usan la
// pestaña «📋 Revisión» (ingles/secundaria-revision.js), el servidor (server/revision.ts valida con estas mismas
// reglas) y server/revision_test.ts. Script clásico: expone `globalThis.RevisionDatos`. El resumen por materia usa
// comun/gamificacion.js si está cargado (en la página siempre lo está).
(function (g) {
  'use strict';

  // Calificación final de una clase: ÚNICO lugar donde se define. Promedio ponderado de la calificación en línea
  // (mejor porcentaje / 10; 0 si nunca la envió) y la del profe (0–10). Por omisión, promedio simple (1 y 1).
  const FORMULA_FINAL = { pesoEnLinea: 1, pesoProfe: 1 };
  const MAX_COMENTARIO = 300;

  const redondeo1 = n => Math.round(n * 10 + 1e-9) / 10;
  // 0 a 10, de medio en medio punto.
  const calificacionValida = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10 && Number.isInteger(n * 2);
  const enviada = c => (c && c.intentosUsados || 0) > 0;
  const calificacionProfe = c => (c && c.revision && typeof c.revision.calificacion === 'number' ? c.revision.calificacion : null);
  const enLineaDe = c => (enviada(c) && c.mejor && typeof c.mejor.porcentaje === 'number' ? c.mejor.porcentaje / 10 : 0);

  // Final de la clase o null si el profe aún no la califica.
  function finalDe(c) {
    const profe = calificacionProfe(c);
    if (profe === null) return null;
    const { pesoEnLinea, pesoProfe } = FORMULA_FINAL;
    return redondeo1((pesoEnLinea * enLineaDe(c) + pesoProfe * profe) / (pesoEnLinea + pesoProfe));
  }

  const promedioDe = ns => (ns.length ? redondeo1(ns.reduce((a, b) => a + b, 0) / ns.length) : null);

  // Resumen de las clases de la semana (las de cada día; las «abiertas» de otros días no cuentan).
  function resumenSemana(clases) {
    const lista = clases || [];
    const finales = lista.map(finalDe);
    const G = g.Gamificacion;
    const porMateria = new Map();
    lista.forEach((c, i) => {
      const m = G ? G.materiaDe(c) : null;
      const clave = m ? m.clave : 'otra';
      if (!porMateria.has(clave)) porMateria.set(clave, { clave, nombre: m ? m.nombre : 'Otras clases', clases: 0, revisadas: 0, finales: [] });
      const x = porMateria.get(clave);
      x.clases++;
      if (finales[i] !== null) { x.revisadas++; x.finales.push(finales[i]); }
    });
    return {
      clases: lista.length,
      enviadas: lista.filter(enviada).length,
      revisadas: lista.filter(c => calificacionProfe(c) !== null).length,
      pendientes: lista.filter(c => enviada(c) && calificacionProfe(c) === null).length,
      promedio: promedioDe(finales.filter(f => f !== null)),
      porMateria: [...porMateria.values()].map(x => ({ clave: x.clave, nombre: x.nombre, clases: x.clases, revisadas: x.revisadas, promedio: promedioDe(x.finales) })),
    };
  }

  // Misiones con algún paso que vence en la semana del lunes dado (lunes a domingo, AAAA-MM-DD).
  function misionesDeSemana(misiones, lunes) {
    const d = new Date(lunes + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 6);
    const domingo = d.toISOString().slice(0, 10);
    return (misiones || []).filter(m => (m.pasos || []).some(p => p.fechaLimite >= lunes && p.fechaLimite <= domingo));
  }

  g.RevisionDatos = { FORMULA_FINAL, MAX_COMENTARIO, calificacionValida, enviada, calificacionProfe, enLineaDe, finalDe, resumenSemana, misionesDeSemana };
})(typeof globalThis !== 'undefined' ? globalThis : this);
