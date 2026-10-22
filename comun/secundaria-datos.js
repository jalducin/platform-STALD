// Datos del tablero de Secundaria (openspec: secundaria-dashboard): reglas puras, sin DOM ni peticiones. Las usan
// ingles.html?modo=secundaria (Inicio, «📅 Esta semana», «🗓️ Mi horario» y «📚 Mis materias»), el bloque
// «🗓️ Mi horario» del portal (index.html) y server/secundaria_tablero_test.ts. Script clásico: expone
// `globalThis.SecundariaDatos`.
(function (g) {
  'use strict';

  // ---------- Materias ----------
  // Las 8 materias de Secundaria, en el orden del tablero (de más a menos clases por semana; ver
  // ai-specs/skills/clases-secundaria/SKILL.md § Horario). `clave` = clase de color `mat-<clave>`
  // (estilos/materias.css); `emoji` = el de los títulos del repo de datos.
  const MATERIAS = [
    { clave: 'ingles', nombre: 'Inglés', emoji: '🗣️' },
    { clave: 'espanol', nombre: 'Español', emoji: '📖' },
    { clave: 'matematicas', nombre: 'Matemáticas', emoji: '📐' },
    { clave: 'tecnologia', nombre: 'Tecnología', emoji: '💻' },
    { clave: 'ciencias', nombre: 'Ciencias', emoji: '🔬' },
    { clave: 'sociales', nombre: 'Ciencias Sociales', emoji: '🏛️' },
    { clave: 'artes', nombre: 'Artes', emoji: '🎨' },
    { clave: 'edfisica', nombre: 'Educación Física', emoji: '🏃' },
  ];
  const OTRA = { clave: 'otra', nombre: 'Otras clases', emoji: '📘' };
  const porClave = Object.fromEntries(MATERIAS.map(m => [m.clave, m]));

  // Secuencia de cada materia: copia de ai-specs/skills/clases-secundaria/SKILL.md § «Cómo avanza cada materia» (fuente
  // canónica; si cambia ahí, se cambia aquí). Fechas AAAA-MM-DD inclusivas; sin `desde` no se marca etapa actual
  // (p. ej. Inglés avanza a su ritmo). Fechas derivadas de la skill:
  //   Ciencias: «Biología, 3 meses (oct 2026–ene 2027) → Química, 3 meses → Física, 3 meses».
  //   Tecnología: «Bases … unas 6 semanas» desde el 26 de octubre (hasta el domingo 6 de diciembre).
  //   Ciencias Sociales: «Geografía (ene)» = enero de 2027; luego la rotación vuelve a empezar.
  const SECUENCIAS = {
    ingles: {
      etapas: [{ nombre: 'Alfabeto' }, { nombre: 'Números y colores' }, { nombre: 'To be' }, { nombre: 'Posesivos' }, { nombre: 'Adjetivos' },
        { nombre: 'Presente simple' }, { nombre: 'There is / there are' }, { nombre: 'Pasado' }, { nombre: 'Futuro' }],
      nota: 'Desde cero y a su ritmo, con mucha práctica y speaking.',
    },
    espanol: { etapas: [], nota: 'Programa de 1.º de secundaria, con ortografía en cada bloque.' },
    matematicas: {
      etapas: [{ nombre: 'Aritmética', desde: '2026-10-26', hasta: '2026-11-22' }, { nombre: 'Geometría', desde: '2026-11-23', hasta: '2026-12-20' },
        { nombre: 'Álgebra', desde: '2027-01-01' }],
      nota: '',
    },
    tecnologia: {
      etapas: [{ nombre: 'Bases', desde: '2026-10-26', hasta: '2026-12-06' }, { nombre: 'Programación e IA', desde: '2026-12-07' }],
      nota: 'Bases desde cero, rápidas y prácticas (unas 6 semanas).',
    },
    ciencias: {
      etapas: [{ nombre: 'Biología', desde: '2026-10-01', hasta: '2027-01-31' }, { nombre: 'Química', desde: '2027-02-01', hasta: '2027-04-30' },
        { nombre: 'Física', desde: '2027-05-01', hasta: '2027-07-31' }],
      nota: '',
    },
    sociales: {
      etapas: [{ nombre: 'Cívica y Ética', desde: '2026-10-26', hasta: '2026-11-22' }, { nombre: 'Historia', desde: '2026-11-23', hasta: '2026-12-20' },
        { nombre: 'Geografía', desde: '2027-01-01', hasta: '2027-01-31' }],
      nota: 'Cambia cada mes; después de Geografía vuelve a Cívica y Ética.',
    },
    artes: { etapas: [], nota: 'Domingos alternados con Educación Física: elementos visuales y artistas mexicanos.' },
    edfisica: { etapas: [], nota: 'Domingos alternados con Artes: rutina segura y registro en tu libreta.' },
  };

  const sinAcentos = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const EMOJI_INICIAL = /^[^\p{L}\p{N}]+/u;
  // Búsqueda por nombre completo, el más largo primero («Ciencias Sociales» antes que «Ciencias»).
  const POR_LARGO = [...MATERIAS].sort((a, b) => b.nombre.length - a.nombre.length);
  // Por palabra completa: «Repaso de Inglés 1» → Inglés, pero «Partes del cuerpo» o «Martes» no son Artes.
  function materiaConocida(texto) {
    const t = ' ' + sinAcentos(texto).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return POR_LARGO.find(m => t.includes(' ' + sinAcentos(m.nombre) + ' ')) || null;
  }
  // `materia` del contenido; si falta, el prefijo del título antes de « · » (sin el emoji). Sin prefijo: null.
  function materiaDe(it) {
    const titulo = (it && it.titulo) || '';
    const i = titulo.indexOf(' · ');
    const prefijo = i < 0 ? '' : titulo.slice(0, i).replace(EMOJI_INICIAL, '').trim();
    const nombre = it && it.materia ? String(it.materia).trim() : prefijo;
    if (!nombre) return null;
    const c = materiaConocida(nombre);
    const canon = !(it && it.materia) && c ? c.nombre : nombre;
    return { nombre: canon, clave: c ? c.clave : 'otra', emoji: c ? c.emoji : OTRA.emoji, enTitulo: !!prefijo && sinAcentos(prefijo) === sinAcentos(canon) };
  }
  // Tema de la clase: sin la materia del título (ya va en el chip) y sin el emoji inicial.
  function temaDe(it) {
    const titulo = (it && it.titulo) || '';
    const m = materiaDe(it);
    return m && m.enTitulo ? titulo.slice(titulo.indexOf(' · ') + 3) : titulo.replace(EMOJI_INICIAL, '');
  }

  // ---------- Fechas (AAAA-MM-DD, sin zona: mediodía UTC para no cambiar de día) ----------
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fecha = f => new Date(f + 'T12:00:00Z');
  function sumarDias(f, n) { const d = fecha(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function lunesDe(f) { return sumarDias(f, -((fecha(f).getUTCDay() + 6) % 7)); }
  function nombreDia(f) { const d = fecha(f); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate(); }
  function diaCorto(f) { const d = fecha(f); return DIAS[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate(); }
  const diasEntre = (a, b) => Math.round((fecha(b) - fecha(a)) / 86400000);
  const semanaDe = hoy => Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(hoy), i));

  // Día de la clase: una clase de un día (vence ese día o el siguiente, como las del repo de datos) es de su
  // `disponibleDesde`; una tarea o examen con ventana más larga se ubica en su fecha límite (el día de entrega).
  function diaDeClase(it) {
    if (!it.disponibleDesde) return it.fechaLimite;
    return diasEntre(it.disponibleDesde, it.fechaLimite) <= 1 ? it.disponibleDesde : it.fechaLimite;
  }

  // ---------- Estado de cada clase ----------
  // Hecha = ya tiene un envío (la corrección es opcional; igual que en Inglés y en la racha del servidor).
  const estaHecha = it => (it.intentosUsados || 0) > 0 || it.estado === 'completo' || it.estado === 'en-espera';
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

  // Etapas de la secuencia con la actual marcada (la que contiene a hoy; ninguna fuera de los rangos).
  function etapasDe(clave, hoy) {
    const s = SECUENCIAS[clave];
    if (!s) return [];
    return s.etapas.map(e => ({ nombre: e.nombre, actual: !!e.desde && e.desde <= hoy && (!e.hasta || hoy <= e.hasta) }));
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
      return {
        clave: m.clave, nombre: m.nombre, emoji: m.emoji, total: suyas.length, hechas: suyas.filter(estaHecha).length,
        promedio: promedio(suyas), ultimoTema: ultima ? temaDe(ultima) : null,
        etapas: etapasDe(m.clave, hoy), nota: (SECUENCIAS[m.clave] || {}).nota || '',
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
    estaHecha, estadoClase, clasesDeHoy, progresoSemana, rachaDe, promedio, etapasDe, resumenMaterias, horarioSemana,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
