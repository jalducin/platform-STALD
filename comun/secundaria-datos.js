// Datos del tablero de Secundaria (openspec: secundaria-dashboard): reglas puras, sin DOM ni peticiones. Las usan
// ingles.html?modo=secundaria (Inicio, «📅 Esta semana», «🗓️ Mi horario» y «📚 Mis materias»), el bloque
// «🗓️ Mi horario» del portal (index.html) y server/secundaria_tablero_test.ts. Script clásico: expone
// `globalThis.SecundariaDatos`. Requiere comun/gamificacion.js cargado antes.
(function (g) {
  'use strict';

  // Materias, materia de cada clase, día de la clase, «hecha» y mundos: comun/gamificacion.js (fuente única; se carga
  // antes que este archivo).
  const G = g.Gamificacion;
  const { MATERIAS, OTRA, materiaConocida, materiaDe, sinAcentos, diaDeClase, estaHecha } = G;
  const porClave = Object.fromEntries(MATERIAS.map(m => [m.clave, m]));
  // Nota de cada materia y, en Inglés (un solo mundo, a su ritmo), su lista de temas. Fuente:
  // ai-specs/skills/clases-secundaria/SKILL.md § «Cómo avanza cada materia». Las etapas con fecha son los mundos de
  // comun/gamificacion.js (MUNDOS).
  const SECUENCIAS = {
    ingles: {
      temas: ['Alfabeto', 'Números y colores', 'To be', 'Posesivos', 'Adjetivos', 'Presente simple', 'There is / there are', 'Pasado', 'Futuro'],
      nota: 'Desde cero y a su ritmo, con mucha práctica y speaking.',
    },
    espanol: { nota: 'Programa de 1.º de secundaria, con ortografía en cada bloque.' },
    matematicas: { nota: 'Aritmética (temas puntuales) → Geometría → Álgebra.' },
    tecnologia: { nota: 'Bases desde cero, rápidas y prácticas (unas 6 semanas); después Programación e IA.' },
    ciencias: { nota: 'Biología desde cero; después Química y Física.' },
    sociales: { nota: 'Cambia cada mes: Cívica y Ética, Historia y Geografía, y vuelve a empezar.' },
    artes: { nota: 'Domingos alternados con Educación Física: elementos visuales y artistas mexicanos.' },
    edfisica: { nota: 'Domingos alternados con Artes: rutina segura y registro en tu libreta.' },
  };
  const EMOJI_INICIAL = /^[^\p{L}\p{N}]+/u;
  // Tema de la clase: sin la materia del título (ya va en el chip) y sin el emoji inicial.
  function temaDe(it) {
    const titulo = (it && it.titulo) || '';
    const m = materiaDe(it);
    return m && m.enTitulo ? titulo.slice(titulo.indexOf(' · ') + 3) : titulo.replace(EMOJI_INICIAL, '');
  }

  // ---------- Fechas (AAAA-MM-DD, sin zona: mediodía UTC para no cambiar de día) ----------
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fecha = f => new Date(f + 'T12:00:00Z');
  const sumarDias = G.sumarDias;
  function lunesDe(f) { return sumarDias(f, -((fecha(f).getUTCDay() + 6) % 7)); }
  function nombreDia(f) { const d = fecha(f); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate(); }
  function diaCorto(f) { const d = fecha(f); return DIAS[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate(); }
  const semanaDe = hoy => Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(hoy), i));

  // ---------- Estado de cada clase ----------
  const pctDe = it => (it.mejor && typeof it.mejor.porcentaje === 'number' ? it.mejor.porcentaje : null);

  // Estado de la tarjeta y su botón principal. `accion` = data-action del reproductor (abrir-item / ver-resultado).
  function estadoClase(it, hoy) {
    const porcentaje = pctDe(it);
    if (it.estado === 'completo' || it.estado === 'en-espera') return { clave: 'hecha', texto: 'Hecha', boton: 'Ver resultado', accion: 'ver-resultado', porcentaje };
    if (it.estado === 'en-curso') return { clave: 'en-curso', texto: 'En curso', boton: 'Continuar', accion: 'abrir-item', porcentaje };
    if (it.estado === 'proximamente') return { clave: 'proxima', texto: 'Todavía no abre', boton: null, accion: null, porcentaje };
    const base = { boton: 'Empezar', accion: 'abrir-item', porcentaje };
    if (it.fechaLimite < hoy) return { ...base, clave: 'atrasada', texto: 'Atrasada' };
    if (it.fechaLimite === hoy) return { ...base, clave: 'vence-hoy', texto: 'Vence hoy' };
    if (it.fechaLimite === sumarDias(hoy, 1)) return { ...base, clave: 'vence-manana', texto: 'Vence mañana' };
    return { ...base, clave: 'pendiente', texto: 'Pendiente' };
  }

  // «Hoy te toca»: primero lo que vence hoy de días anteriores y sigue sin hacer; luego las clases de hoy.
  function clasesDeHoy(items, hoy) {
    const atrasadas = items.filter(it => diaDeClase(it) < hoy && it.fechaLimite === hoy && !estaHecha(it));
    return [...atrasadas, ...items.filter(it => diaDeClase(it) === hoy)];
  }

  // «⚔️ Misión principal activa» (openspec: navegacion-mejoras): la clase sin hacer que conviene hacer ya.
  // Prioridad: (1) atrasada y abierta (su día ya pasó), del más viejo al más nuevo; (2) la de hoy abierta; (3) la
  // próxima ya abierta (se puede adelantar); (4) solo si no hay nada abierto, la bloqueada más próxima. A igual día, el
  // orden de la lista. «Abierta» = el servidor no la marca `proximamente` (el botón sí tiene acción).
  // Devuelve { item, motivo: 'atrasada' | 'hoy' | 'adelantar' | 'proxima' } o null.
  function misionPrincipal(items, hoy) {
    const pendientes = (items || []).map((it, i) => ({ it, i, dia: diaDeClase(it) })).filter(x => !estaHecha(x.it))
      .sort((a, b) => a.dia.localeCompare(b.dia) || a.i - b.i);
    const abierta = it => it.estado !== 'proximamente';
    const grupos = [
      ['atrasada', x => x.dia < hoy && abierta(x.it)],
      ['hoy', x => x.dia === hoy && abierta(x.it)],
      ['adelantar', x => x.dia > hoy && abierta(x.it)],
      ['proxima', () => true], // bloqueada: la más próxima (también una de hoy o anterior que aún no abre)
    ];
    for (const [motivo, cumple] of grupos) {
      const x = pendientes.find(cumple);
      if (x) return { item: x.it, motivo };
    }
    return null;
  }

  // Progreso de la semana de hoy (lunes a domingo): clases hechas entre las de la semana.
  function progresoSemana(items, hoy) {
    const dias = new Set(semanaDe(hoy));
    const deSemana = items.filter(it => dias.has(diaDeClase(it)));
    const hechas = deSemana.filter(estaHecha).length;
    return { hechas, total: deSemana.length, porcentaje: deSemana.length ? Math.round(hechas * 100 / deSemana.length) : 0 };
  }

  // Racha: la calcula el servidor (días seguidos, hasta hoy o ayer, con al menos un envío; server/motor.ts
  // calcularRacha). Aquí solo se normaliza.
  function rachaDe(act) {
    const r = act && act.racha;
    return r && Number.isFinite(r.dias) ? { dias: r.dias, hoy: !!r.hoy } : { dias: 0, hoy: false };
  }

  // Promedio de la mejor calificación de las clases con resultado (entero) o null.
  function promedio(items) {
    const pcts = items.map(pctDe).filter(p => p !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }

  // ---------- Revisión del profe (openspec: revision-profe) ----------
  // La alumna solo recibe `revision: { calificacion, comentario, revisadoEn }` en sus clases calificadas por el profe
  // (nunca el checklist). La fórmula de la calificación final vive SOLO en comun/revision-datos.js (`RevisionDatos`);
  // sin ese script cargado no hay final.
  function revisionDe(it) {
    const r = it && it.revision;
    return r && typeof r.calificacion === 'number' && Number.isFinite(r.calificacion)
      ? { calificacion: r.calificacion, comentario: String(r.comentario || ''), revisadoEn: String(r.revisadoEn || '') } : null;
  }
  const finalDe = it => (revisionDe(it) && g.RevisionDatos ? g.RevisionDatos.finalDe(it) : null);
  // Clases revisadas por el profe, de la revisión más reciente a la más vieja.
  const clasesRevisadas = items => (items || []).filter(revisionDe)
    .sort((a, b) => revisionDe(b).revisadoEn.localeCompare(revisionDe(a).revisadoEn));
  const redondeo1 = n => Math.round(n * 10 + 1e-9) / 10;

  // Etapas de la materia = sus mundos (comun/gamificacion.js) con su estado; «actual» = el mundo actual (`mundoDe`).
  function etapasDe(clave, hoy, items) {
    const fila = G.mapaMundos(items || [], hoy).find(m => m.clave === clave);
    if (!fila) return [];
    const actual = G.mundoDe(clave, hoy);
    return fila.mundos.map(w => ({ nombre: w.etapa, mundo: w.nombre, emoji: w.emoji, estado: w.estado, actual: fila.mundos.length > 1 && !!actual && actual.nombre === w.nombre && w.estado !== 'bloqueado' }));
  }

  // Una entrada por materia (las 8, en orden) y «Otras clases» si hay alguna sin materia conocida: clases hechas y
  // total (visibles), promedio, último tema visto (hasta hoy), etapas y nota de su secuencia.
  function resumenMaterias(items, hoy) {
    const grupos = new Map([...MATERIAS, OTRA].map(m => [m.clave, []]));
    for (const it of items) {
      const m = materiaDe(it);
      grupos.get(m ? m.clave : 'otra').push(it);
    }
    return [...MATERIAS, OTRA].filter(m => m.clave !== 'otra' || grupos.get('otra').length).map(m => {
      const suyas = grupos.get(m.clave);
      const vistas = suyas.filter(it => diaDeClase(it) <= hoy).sort((a, b) => diaDeClase(a).localeCompare(diaDeClase(b)));
      const ultima = vistas[vistas.length - 1];
      // Clases revisadas por el profe (por día) con su final; promedio final de la materia (0–10, a 0.1) o null.
      const revisadas = suyas.filter(revisionDe).sort((a, b) => diaDeClase(a).localeCompare(diaDeClase(b))).map(it => {
        const r = revisionDe(it);
        return { id: it.id, tema: temaDe(it), calificacion: r.calificacion, comentario: r.comentario, final: finalDe(it) };
      });
      const finales = revisadas.map(x => x.final).filter(f => f !== null);
      return {
        clave: m.clave, nombre: m.nombre, emoji: m.emoji, total: suyas.length, hechas: suyas.filter(estaHecha).length,
        promedio: promedio(suyas), ultimoTema: ultima ? temaDe(ultima) : null,
        revisadas, promedioFinal: finales.length ? redondeo1(finales.reduce((a, b) => a + b, 0) / finales.length) : null,
        etapas: etapasDe(m.clave, hoy, items), temas: (SECUENCIAS[m.clave] || {}).temas || [], nota: (SECUENCIAS[m.clave] || {}).nota || '',
      };
    });
  }

  // Los 7 días de la semana de hoy con sus clases (en el orden de la lista).
  function horarioSemana(items, hoy) {
    return semanaDe(hoy).map(f => ({ fecha: f, esHoy: f === hoy, clases: items.filter(it => diaDeClase(it) === f) }));
  }

  g.SecundariaDatos = {
    MATERIAS, SECUENCIAS, OTRA, porClave, materiaConocida, materiaDe, temaDe, sinAcentos,
    sumarDias, lunesDe, nombreDia, diaCorto, semanaDe, diaDeClase,
    estaHecha, estadoClase, clasesDeHoy, misionPrincipal, progresoSemana, rachaDe, promedio, etapasDe, resumenMaterias, horarioSemana,
    revisionDe, finalDe, clasesRevisadas,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
