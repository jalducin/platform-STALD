// Horario y materias de la ruta del profe (openspec: profe-horario-materias): funciones puras, sin DOM ni peticiones.
// Las usan ingles/profe-horario.js (pestañas «🗓️ Mi horario» y «🧭 Por materia» de ingles.html?modo=profe) y
// server/profe_horario_test.ts. Solo leen lo que ya devuelve /ingles/profe/actividades (`plan` e `items`).
// Script clásico: expone `globalThis.ProfeHorario`.
// Reglas de su calendario (se muestran, no se calculan ni se validan aquí): los días de oficina salen de
// `plan.diasOficina` (fechas AAAA-MM-DD que publica el repo de datos; sin el campo no hay días de oficina) y llevan
// máximo 2 tareas y solo «en página»; los demás días máximo 4, inglés diario y todo abierto para adelantar.
(function (g) {
  'use strict';

  // Catálogo en el orden en que se muestran. `clave` = clase de color `ph-m-<clave>` (ingles/profe-horario.css).
  const MATERIAS_PROFE = [
    { clave: 'ingles', nombre: 'Inglés', icono: '🗣️' },
    { clave: 'ia', nombre: 'IA · Agentic Engineer', icono: '🤖' },
    { clave: 'staff', nombre: 'Staff Software Engineer', icono: '🏗️' },
    { clave: 'lead', nombre: 'Tech Lead', icono: '🧭' },
    { clave: 'cultura', nombre: 'Cultura General', icono: '🌎' },
    { clave: 'evaluacion', nombre: 'Evaluación', icono: '📝' },
  ];
  const IA = 'IA · Agentic Engineer', STAFF = 'Staff Software Engineer', LEAD = 'Tech Lead', INGLES = 'Inglés';
  const sinAcentos = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const palabras = s => ' ' + sinAcentos(s).replace(/[^a-z0-9]+/g, ' ') + ' ';

  // Materia por el `nivel` del elemento (p. ej. «Refuerzo · Python», «Inglés B1»); null si no es claro.
  function materiaPorNivel(nivel) {
    const n = palabras(nivel);
    if (!n.trim()) return null;
    if (n.includes(' ingles ')) return INGLES;
    if (n.includes(' cultura ')) return 'Cultura General';
    if (/ (staff|python|system design|arquitectura) /.test(n)) return STAFF;
    if (/ (liderazgo|minto|tech lead) /.test(n)) return LEAD;
    if (/ (examen semanal|diagnostico) /.test(n)) return 'Evaluación';
    if (/ (ia|claude|mcp|rag|evals|sdd|agentes?|prompts?) /.test(n)) return IA;
    return null;
  }
  // Respaldo cuando el elemento no trae `materia`: prefijo del id, su `nivel` y, para el AI Assessment, su título.
  function materiaPorRespaldo(id, nivel, titulo) {
    const i = String(id || '');
    if (/ (ai )?assessment /.test(palabras(titulo))) return 'Evaluación'; // AI Assessment de inicio y de cierre
    if (/^(profe-ing-|act-|tec-|refuerzo-|examen-|guia-|meet-)/.test(i)) return INGLES; // inglés del profe y lo del grupo (meets incluidos)
    if (i.startsWith('profe-lid-')) return LEAD;
    if (i.startsWith('profe-cg-')) return 'Cultura General';
    if (/^profe-examen-(semanal|diagnostico)-/.test(i)) return 'Evaluación';
    const porNivel = materiaPorNivel(nivel);
    if (i.startsWith('profe-staff-')) return porNivel === LEAD ? LEAD : STAFF;
    return porNivel || IA; // profe-ref-, profe-act-, profe-rag-, profe-loop- y el resto
  }
  const texto = v => (typeof v === 'string' && v.trim() ? v.trim() : null);
  // `materia` del contenido (actividad o elemento del plan); si falta, el respaldo.
  function materiaDe(elemento, item) {
    const e = elemento || {}, it = item || {};
    return texto(it.materia) || texto(e.materia) || materiaPorRespaldo(e.id || it.id, it.nivel || e.nivel, e.titulo || it.titulo);
  }
  // Datos de una materia por su nombre (sin acentos ni mayúsculas; «IA» o «Agentic» → IA). Desconocida: «otra».
  function infoMateria(nombre) {
    const n = sinAcentos(nombre).trim();
    const m = MATERIAS_PROFE.find(x => sinAcentos(x.nombre) === n || x.clave === n) ||
      (/(^| )(ia|agentic)( |$)/.test(palabras(nombre).trim()) ? MATERIAS_PROFE[1] : null);
    return m || { clave: 'otra', nombre: String(nombre || 'Otra'), icono: '📘' };
  }
  const ordenMateria = nombre => { const i = MATERIAS_PROFE.findIndex(x => x.nombre === infoMateria(nombre).nombre); return i < 0 ? MATERIAS_PROFE.length : i; };
  const porMateria = (a, b) => ordenMateria(a) - ordenMateria(b) || String(a).localeCompare(String(b));

  // ---------- Fechas (AAAA-MM-DD, a mediodía UTC para no cruzar de día) ----------
  const aFecha = f => new Date(f + 'T12:00:00Z');
  const sumarDias = (f, n) => { const d = aFecha(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diaSemana = f => aFecha(f).getUTCDay(); // 0 = domingo
  const lunesDe = f => sumarDias(f, -((diaSemana(f) + 6) % 7));
  // Días de oficina: solo los que lista `plan.diasOficina` (nunca por día de la semana: la regla cambia con el tiempo).
  const diasOficinaDe = plan => new Set(Array.isArray(plan && plan.diasOficina) ? plan.diasOficina.filter(f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f)) : []);
  const comoConjunto = dias => (dias instanceof Set ? dias : new Set(Array.isArray(dias) ? dias : []));
  const esOficina = (f, dias) => comoConjunto(dias).has(f);
  const maxDelDia = (f, dias) => (esOficina(f, dias) ? 2 : 4);
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const nombreDia = f => { const d = aFecha(f); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MESES[d.getUTCMonth()]; }; // «Martes 3 nov»
  const fechaCorta = f => { const d = aFecha(f); return d.getUTCDate() + ' ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }; // «19 ene 2027»
  // «2 – 8 nov 2026» o «30 nov – 6 dic 2026».
  function rangoSemana(lunes) {
    const a = aFecha(lunes), b = aFecha(sumarDias(lunes, 6));
    const ini = a.getUTCDate() + (a.getUTCMonth() === b.getUTCMonth() ? '' : ' ' + MESES[a.getUTCMonth()]) + (a.getUTCFullYear() === b.getUTCFullYear() ? '' : ' ' + a.getUTCFullYear());
    return ini + ' – ' + b.getUTCDate() + ' ' + MESES[b.getUTCMonth()] + ' ' + b.getUTCFullYear();
  }

  // ---------- Estado ----------
  // Misma regla que la ruta RPG (Gamificacion.estaHecha): un intento enviado, completo o en espera.
  const estaHecha = it => !!it && ((it.intentosUsados || 0) > 0 || it.estado === 'completo' || it.estado === 'en-espera');
  // Clase en vivo (meet) que imparte el profe: `tipo: "meet"` o id con prefijo `meet-`. No es una tarea suya.
  const esMeet = x => !!x && (x.tipo === 'meet' || String(x.id || '').startsWith('meet-'));
  // pendiente | hecha | vencida | adelantada. Adelantada = hecha antes de su fecha; vencida = sin hacer y su fecha ya pasó.
  // Un meet es neutral: proxima (hoy o después) | impartida (ya pasó); nunca vencida.
  function estadoTarea(t, hoy) {
    if (t && t.meet) return t.fecha < hoy ? 'impartida' : 'proxima';
    const it = t && t.item;
    if (estaHecha(it)) return it.ultimoEnvio && String(it.ultimoEnvio).slice(0, 10) < t.fecha ? 'adelantada' : 'hecha';
    return t.fecha < hoy ? 'vencida' : 'pendiente';
  }
  const ESTADOS = {
    pendiente: { icono: '⏳', texto: 'Pendiente' },
    hecha: { icono: '✅', texto: 'Hecha' },
    vencida: { icono: '⏰', texto: 'Vencida' },
    adelantada: { icono: '⏩', texto: 'Adelantada' },
    proxima: { icono: '🎥', texto: 'Próxima' }, // meet que aún no pasa
    impartida: { icono: '✓', texto: 'Impartida' }, // meet que ya pasó
  };
  const contables = tareas => tareas.filter(t => !t.meet); // sin meets: lo que cuenta como tarea (progreso y conteos)
  const esHechaEstado = e => e === 'hecha' || e === 'adelantada';

  // ---------- Tareas: su ruta (plan.json) y lo del grupo que resuelve antes (`grupo: true`) ----------
  // Lo del grupo no trae `materia` en su JSON: la de `plan.materiaDelGrupo` (Inglés) o el respaldo; su fecha es la
  // del profe (`fechaLimite`, un día antes de que abra al grupo) y su línea, «Inglés con el grupo».
  const LINEA_GRUPO = 'Inglés con el grupo';
  const LINEA_MEET = 'Clases en vivo'; // línea de los meets sin `linea` ni `tema` propios
  function tareasRuta(act) {
    const plan = act && act.plan;
    if (!plan || !Array.isArray(plan.semanas)) return [];
    const hoy = (act && act.hoy) || '';
    const todos = (act && act.items) || [];
    const items = new Map(todos.filter(it => !it.grupo).map(it => [it.id, it]));
    const vistos = new Set();
    const lista = [];
    const agregar = t => { t.estado = estadoTarea(t, hoy); lista.push(t); };
    plan.semanas.forEach((s, i) => (s.elementos || []).forEach(e => {
      if (!e || !e.id || vistos.has(e.id)) return;
      vistos.add(e.id);
      const item = items.get(e.id) || null;
      const materia = materiaDe(e, item);
      const tipo = e.tipo || (item && item.tipo) || 'actividad';
      const meet = esMeet({ id: e.id, tipo }) || esMeet(item);
      agregar({
        id: e.id, titulo: e.titulo || (item && item.titulo) || e.id, tipo, meet,
        ...(meet ? { hora: texto(e.hora) || texto(item && item.hora), meetUrl: texto(e.meetUrl) || texto(item && item.meetUrl) } : {}),
        fecha: String(e.fecha || (item && item.fechaLimite) || s.id || ''), semana: s.n || i + 1, semanaId: s.id, materia,
        linea: texto(e.linea) || texto(e.tema) || texto(item && item.linea) || (meet ? LINEA_MEET : texto(item && item.nivel) || materia), item, grupo: false,
      });
    }));
    for (const item of todos.filter(it => it.grupo && !vistos.has(it.id))) {
      vistos.add(item.id);
      agregar({
        id: item.id, titulo: item.titulo || item.id, tipo: item.tipo || 'actividad', fecha: String(item.fechaLimite || ''), meet: esMeet(item),
        ...(esMeet(item) ? { hora: texto(item.hora), meetUrl: texto(item.meetUrl) } : {}),
        semana: null, semanaId: null, materia: texto(item.materia) || texto(plan.materiaDelGrupo) || materiaPorRespaldo(item.id, item.nivel, item.titulo),
        linea: esMeet(item) ? LINEA_MEET : LINEA_GRUPO, item, grupo: true,
      });
    }
    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(a.grupo) - Number(b.grupo));
  }
  const filtrar = (tareas, materia) => (materia ? tareas.filter(t => t.materia === materia) : tareas);
  const materiasDe = tareas => [...new Set(tareas.map(t => t.materia))].sort(porMateria);

  // Siete días (lunes a domingo) con sus tareas, hoy, oficina (de `diasOficina`) y máximo del día.
  function semanaHorario(tareas, lunes, hoy, materia, diasOficina) {
    const lista = filtrar(tareas, materia);
    const dias = comoConjunto(diasOficina);
    return Array.from({ length: 7 }, (_x, i) => {
      const fecha = sumarDias(lunes, i);
      return { fecha, esHoy: fecha === hoy, oficina: dias.has(fecha), max: maxDelDia(fecha, dias), tareas: lista.filter(t => t.fecha === fecha) };
    });
  }
  // Primera y última semana (lunes) con tareas; null sin tareas.
  function rangoSemanas(tareas) {
    if (!tareas.length) return null;
    const fechas = tareas.map(t => t.fecha).filter(Boolean).sort();
    return { min: lunesDe(fechas[0]), max: lunesDe(fechas[fechas.length - 1]) };
  }

  // Resumen por materia de plan.json (`materias`): arreglo [{ materia|nombre, elementos|total?, inicio?, fin|cierre? }]
  // (el que escribe el repo de datos) u objeto { "<materia>": { … } }. Devuelve un Map nombre → { cierre, total }.
  function resumenDe(materias) {
    const m = new Map();
    const lista = Array.isArray(materias) ? materias : materias && typeof materias === 'object' ? Object.entries(materias).map(([nombre, v]) => ({ nombre, ...(v || {}) })) : [];
    for (const x of lista) {
      const nombre = x && texto(x.nombre || x.materia);
      if (!nombre) continue;
      const cierre = texto(x.fin || x.cierre || x.fechaCierre || x.hasta);
      const total = Number.isFinite(x.total) ? x.total : Number.isFinite(x.elementos) ? x.elementos : null;
      m.set(infoMateria(nombre).clave === 'otra' ? nombre : infoMateria(nombre).nombre, { cierre, total });
    }
    return m;
  }
  // Hechas / totales y fecha de cierre por materia (sin meets: no son tareas). Las hechas siempre se cuentan; el cierre y el total salen del
  // resumen si viene (el total nunca queda debajo de las tareas que ya existen); si no, del plan (última fecha).
  function progresoPorMateria(todas, materias) {
    const tareas = contables(todas);
    const resumen = resumenDe(materias);
    const nombres = [...new Set([...tareas.map(t => t.materia), ...resumen.keys()])].sort(porMateria);
    return nombres.map(nombre => {
      const suyas = tareas.filter(t => t.materia === nombre);
      const r = resumen.get(nombre) || {};
      const hechas = suyas.filter(t => esHechaEstado(t.estado)).length;
      const total = Math.max(suyas.length, r.total ?? 0);
      const cierre = r.cierre || (suyas.length ? suyas.map(t => t.fecha).sort().pop() : null);
      return { ...infoMateria(nombre), materia: nombre, hechas, total, cierre, pct: total ? Math.round(hechas / total * 100) : 0 };
    });
  }
  // Por materia y, dentro, por línea (orden de la primera fecha); cada línea en orden de fecha.
  function agruparPorMateria(tareas, materia) {
    const lista = filtrar(tareas, materia);
    return materiasDe(lista).map(nombre => {
      const suyas = lista.filter(t => t.materia === nombre);
      const lineas = [...new Set(suyas.map(t => t.linea))].map(linea => ({ linea, tareas: suyas.filter(t => t.linea === linea) }));
      return { ...infoMateria(nombre), materia: nombre, lineas };
    });
  }

  g.ProfeHorario = {
    MATERIAS_PROFE, ESTADOS, LINEA_GRUPO, LINEA_MEET, sinAcentos, materiaPorNivel, materiaPorRespaldo, materiaDe, infoMateria,
    sumarDias, lunesDe, diasOficinaDe, esOficina, maxDelDia, nombreDia, fechaCorta, rangoSemana, estaHecha, esMeet, estadoTarea, esHechaEstado, contables,
    tareasRuta, filtrar, materiasDe, semanaHorario, rangoSemanas, progresoPorMateria, agruparPorMateria,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
