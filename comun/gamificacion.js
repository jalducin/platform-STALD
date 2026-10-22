// Núcleo de gamificación (openspec: gamificacion-nucleo): funciones puras, sin DOM ni peticiones. XP, nivel y rango,
// insignias, mundos, retos diarios y actividad reciente, calculados en el cliente con lo que ya devuelve el servidor
// (`/secundaria/actividades`, y en el futuro `/ingles/actividades`). Nada de esto se guarda.
// Reglas (fuente única: docs/frontend-standards.md § «Gamificación»). Script clásico: expone `globalThis.Gamificacion`;
// lo cargan las páginas con <script> y server/gamificacion_test.ts con import.
(function (g) {
  'use strict';

  // ---------- Materias (Secundaria) ----------
  // `clave` = clase de color `mat-<clave>` (estilos), `emoji` = el de los títulos del repo de datos.
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
  const sinAcentos = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const EMOJI_INICIAL = /^[^\p{L}\p{N}]+/u;
  const POR_LARGO = [...MATERIAS].sort((a, b) => b.nombre.length - a.nombre.length);
  // Por palabra completa: «Repaso de Inglés 1» → Inglés; «Partes del cuerpo» o «Martes» no son Artes.
  function materiaConocida(texto) {
    const t = ' ' + sinAcentos(texto).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return POR_LARGO.find(m => t.includes(' ' + sinAcentos(m.nombre) + ' ') || t.trim() === m.clave) || null;
  }
  // `materia` del contenido; si falta, el prefijo del título antes de « · » (sin emoji). Sin prefijo: null.
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
  const claveDe = it => (materiaDe(it) || OTRA).clave;

  // ---------- Fechas (AAAA-MM-DD; mediodía UTC para no cambiar de día) ----------
  const fecha = f => new Date(f + 'T12:00:00Z');
  function sumarDias(f, n) { const d = fecha(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const diasEntre = (a, b) => Math.round((fecha(b) - fecha(a)) / 86400000);
  // Día de la clase: su `dia` si lo trae (clase abierta antes para adelantar; openspec: secundaria-adelantar). Si no:
  // si dura un día (vence ese día o el siguiente) es su `disponibleDesde`; con ventana más larga (tareas y exámenes),
  // su fecha límite.
  function diaDeClase(it) {
    if (it.dia) return it.dia;
    if (!it.disponibleDesde) return it.fechaLimite;
    return diasEntre(it.disponibleDesde, it.fechaLimite) <= 1 ? it.disponibleDesde : it.fechaLimite;
  }
  // Hecha = ya tiene un envío (la corrección es opcional).
  const estaHecha = it => (it.intentosUsados || 0) > 0 || it.estado === 'completo' || it.estado === 'en-espera';

  // ---------- XP ----------
  const XP_A_TIEMPO = 20;
  const XP_POR_NIVEL = 300;
  const esMiniExamen = s => /^\s*🎯/u.test((s && s.titulo) || '');
  // ¿El mejor intento llegó a tiempo? En orden: `opciones.aTiempo`, `calificacion.aTiempo`, `item.mejorATiempo`
  // (listado del servidor) y, si nada de eso viene, `opciones.hoy <= item.fechaLimite`. Sin datos: no.
  function aTiempoDe(item, calificacion, o) {
    if (typeof o.aTiempo === 'boolean') return o.aTiempo;
    if (calificacion && typeof calificacion.aTiempo === 'boolean') return calificacion.aTiempo;
    if (item && typeof item.mejorATiempo === 'boolean') return item.mejorATiempo;
    return !!(o.hoy && item && item.fechaLimite && o.hoy <= item.fechaLimite);
  }
  // XP de una clase terminada (solo su mejor intento): el porcentaje de aciertos de la clase, en el que cada acierto
  // del tema 🎯 (mini examen) cuenta otra vez (vale doble; por eso puede pasar de 100), + 20 si llegó a tiempo:
  // round(100 × (correctas + correctas🎯) / total) + 20. Usa de `calificacion`: `correctas`, `total`,
  // `secciones[].titulo|correctas` (o, sin `total`, `porcentaje`) y `aTiempo` opcional; de `item`: `mejorATiempo` y
  // `fechaLimite`. Sin calificación: 0.
  function xpDeClase(item, calificacion, opciones) {
    if (!calificacion) return 0;
    const o = opciones || {};
    const secs = Array.isArray(calificacion.secciones) ? calificacion.secciones : [];
    const total = Number(calificacion.total) || secs.reduce((a, s) => a + (Number(s && s.total) || 0), 0);
    const correctas = Number.isFinite(Number(calificacion.correctas)) && calificacion.total ? Number(calificacion.correctas) : secs.reduce((a, s) => a + (Number(s && s.correctas) || 0), 0);
    const extra = secs.filter(esMiniExamen).reduce((a, s) => a + (Number(s.correctas) || 0), 0);
    const base = total ? Math.round((correctas + extra) * 100 / total) : Math.round(Number(calificacion.porcentaje) || 0);
    return base + (aTiempoDe(item, calificacion, o) ? XP_A_TIEMPO : 0);
  }
  // XP posible de una clase sin hacer (100 % a tiempo, sin contar el doble del mini examen).
  const XP_POSIBLE = 100 + XP_A_TIEMPO;
  const xpDeItem = (it, o) => (estaHecha(it) && it.mejor ? xpDeClase(it, it.mejor, o) : 0);
  const xpTotal = (items, o) => (items || []).reduce((a, it) => a + xpDeItem(it, o), 0);

  // ---------- Nivel y rango ----------
  // Rangos con lenguaje inclusivo: sin dato de género (el registro no lo tiene) se muestran las dos formas
  // («Exploradora/Explorador»); con `genero` 'f' o 'm', solo la que corresponde. «Aprendiz» es neutro.
  const RANGOS = [
    { desde: 1, f: 'Aprendiz', m: 'Aprendiz' },
    { desde: 4, f: 'Exploradora', m: 'Explorador' },
    { desde: 7, f: 'Sabia', m: 'Sabio' },
    { desde: 10, f: 'Gran Sabia', m: 'Gran Sabio' },
  ];
  function rangoDe(nivel, genero) {
    const r = [...RANGOS].reverse().find(x => nivel >= x.desde);
    if (genero === 'f' || genero === 'm') return r[genero];
    return r.f === r.m ? r.f : r.f + '/' + r.m;
  }
  // nivel = floor(XP/300) + 1. `xpNivel` = XP dentro del nivel (0–299); `xpSiguiente` = XP total del siguiente nivel.
  function nivelDe(xp, genero) {
    const x = Math.max(0, Math.floor(Number(xp) || 0));
    const nivel = Math.floor(x / XP_POR_NIVEL) + 1;
    const xpNivel = x - (nivel - 1) * XP_POR_NIVEL;
    return { nivel, rango: rangoDe(nivel, genero), xp: x, xpNivel, xpSiguiente: nivel * XP_POR_NIVEL, porNivel: XP_POR_NIVEL, porcentaje: Math.round(xpNivel * 100 / XP_POR_NIVEL) };
  }

  // ---------- Mundos ----------
  // Un mundo por bloque de cada materia: copia de ai-specs/skills/clases-secundaria/SKILL.md § «Cómo avanza cada
  // materia» (fuente; si cambia ahí, se cambia aquí). Fechas inclusivas. Derivadas (la skill da duraciones, no fechas):
  // Química y Física, 3 meses cada una tras Biología (que termina en ene 2027). Tecnología: la skill pone
  // «Programación e IA» en el mismo tramo, así que Laberinto Sintaxis y Núcleo IA comparten fechas. Ciencias
  // Sociales rota (`rota`): tras Geografía (ene 2027) vuelve a Cívica, un mundo por mes calendario. Sin fechas: el
  // único mundo de su materia, siempre en curso.
  const MUNDOS = {
    matematicas: [
      { etapa: 'Aritmética', nombre: 'Valle de los Números', emoji: '🔢', desde: '2026-10-26', hasta: '2026-11-22' },
      { etapa: 'Geometría', nombre: 'Ciudad de las Formas', emoji: '🏙️', desde: '2026-11-23', hasta: '2026-12-20' },
      { etapa: 'Álgebra', nombre: 'Torre de las Incógnitas', emoji: '🗼', desde: '2027-01-01' },
    ],
    ciencias: [
      { etapa: 'Biología', nombre: 'Selva de la Vida', emoji: '🌿', desde: '2026-10-01', hasta: '2027-01-31' },
      { etapa: 'Química', nombre: 'Laboratorio Alquimia', emoji: '⚗️', desde: '2027-02-01', hasta: '2027-04-30' },
      { etapa: 'Física', nombre: 'Cumbre de la Fuerza', emoji: '🏔️', desde: '2027-05-01', hasta: '2027-07-31' },
    ],
    sociales: [
      { etapa: 'Cívica y Ética', nombre: 'Ágora', emoji: '🏛️', desde: '2026-10-26', hasta: '2026-11-22' },
      { etapa: 'Historia', nombre: 'Puerta del Tiempo', emoji: '⏳', desde: '2026-11-23', hasta: '2026-12-20' },
      { etapa: 'Geografía', nombre: 'Atlas del Mundo', emoji: '🗺️', desde: '2027-01-01', hasta: '2027-01-31' },
    ],
    tecnologia: [
      { etapa: 'Bases', nombre: 'Taller Digital', emoji: '🛠️', desde: '2026-10-26', hasta: '2026-12-06' },
      { etapa: 'Programación', nombre: 'Laberinto Sintaxis', emoji: '🌀', desde: '2026-12-07' },
      { etapa: 'IA', nombre: 'Núcleo IA', emoji: '🤖', desde: '2026-12-07' },
    ],
    ingles: [{ etapa: 'Bloque actual', nombre: 'Isla del Alfabeto', emoji: '🏝️' }],
    espanol: [{ etapa: 'Programa de 1.º', nombre: 'Gran Biblioteca', emoji: '📚' }],
    artes: [{ etapa: 'Artes y Educación Física', nombre: 'Estudio y Arena', emoji: '🎨' }],
    edfisica: [{ etapa: 'Artes y Educación Física', nombre: 'Estudio y Arena', emoji: '🎨' }],
  };
  const claveDeMateria = materia => {
    if (!materia) return null;
    if (MUNDOS[materia]) return materia;
    const c = materiaConocida(materia);
    return c ? c.clave : null;
  };
  const enCurso = (w, hoy) => !!w.desde && w.desde <= hoy && (!w.hasta || hoy <= w.hasta);
  const ROTA = { sociales: '2027-02-01' }; // desde aquí, un mundo por mes en el orden de la lista, y vuelve a empezar
  const finDeMes = f => { const d = fecha(f.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); };
  // Mundos con las fechas que valen para `hoy`: en una materia que rota, el ciclo mensual que contiene a hoy.
  function mundosVigentes(clave, hoy) {
    const lista = MUNDOS[clave];
    const inicio = ROTA[clave];
    if (!inicio || !hoy || hoy < inicio) return lista;
    const meses = (Number(hoy.slice(0, 4)) - Number(inicio.slice(0, 4))) * 12 + Number(hoy.slice(5, 7)) - Number(inicio.slice(5, 7));
    const primerMes = meses - (meses % lista.length); // mes (desde `inicio`) en que empezó este ciclo
    return lista.map((w, i) => {
      const d = fecha(inicio); d.setUTCMonth(d.getUTCMonth() + primerMes + i);
      const desde = d.toISOString().slice(0, 10);
      return { ...w, desde, hasta: finDeMes(desde) };
    });
  }
  // Mundo actual de una materia (nombre o clave): el que contiene a `hoy`; en vacaciones, el último que empezó;
  // antes del primero, el primero. Sin `hoy`, la fecha de hoy del aparato. Materia desconocida: null.
  function mundoDe(materia, hoy) {
    const clave = claveDeMateria(materia);
    if (!MUNDOS[clave]) return null;
    const h = hoy || new Date().toISOString().slice(0, 10);
    const lista = mundosVigentes(clave, h);
    const conFecha = lista.filter(w => w.desde);
    const w = lista.find(x => enCurso(x, h)) || [...conFecha].reverse().find(x => x.desde <= h) || lista[0];
    return { nombre: w.nombre, emoji: w.emoji, etapa: w.etapa };
  }
  // Mapa de mundos por materia con su estado: «completado» (terminó su fecha y todas sus clases están hechas, con al
  // menos una), «en-curso» (el actual, o uno que terminó con clases pendientes) o «bloqueado» (aún no empieza).
  function mapaMundos(items, hoy) {
    const lista = items || [];
    return MATERIAS.map(m => {
      const suyas = lista.filter(it => claveDe(it) === m.clave);
      const mundos = mundosVigentes(m.clave, hoy).map((w, i, todos) => {
        const deMundo = w.desde ? suyas.filter(it => { const d = diaDeClase(it); return d >= w.desde && (!w.hasta || d <= w.hasta); }) : (todos.length === 1 ? suyas : []);
        const hechas = deMundo.filter(estaHecha).length;
        let estado;
        if (!w.desde) estado = todos.length === 1 ? 'en-curso' : 'bloqueado';
        else if (w.desde > hoy) estado = 'bloqueado';
        else if (w.hasta && hoy > w.hasta) estado = deMundo.length && hechas === deMundo.length ? 'completado' : 'en-curso';
        else estado = 'en-curso';
        return { etapa: w.etapa, nombre: w.nombre, emoji: w.emoji, desde: w.desde || null, hasta: w.hasta || null, estado, hechas, total: deMundo.length };
      });
      return { clave: m.clave, nombre: m.nombre, emoji: m.emoji, mundos };
    });
  }

  // ---------- Insignias (derivadas; no se guardan) ----------
  const INSIGNIAS = [
    { id: 'primera-mision', emoji: '🚀', nombre: 'Primera misión', descripcion: 'Terminaste tu primera clase.' },
    { id: 'racha-3', emoji: '🔥', nombre: 'Racha de 3', descripcion: '3 días seguidos con al menos una clase hecha.' },
    { id: 'racha-7', emoji: '⚡', nombre: 'Racha de 7', descripcion: '7 días seguidos con al menos una clase hecha.' },
    { id: 'racha-14', emoji: '🌟', nombre: 'Racha de 14', descripcion: '14 días seguidos con al menos una clase hecha.' },
    { id: 'perfecto', emoji: '💯', nombre: '100 % en una clase', descripcion: 'Sacaste 100 % en una clase.' },
    { id: 'mini-examen', emoji: '🎯', nombre: 'Mini examen superado', descripcion: '80 % o más en un mini examen.' },
    { id: 'mundo-completado', emoji: '🏆', nombre: 'Mundo completado', descripcion: 'Terminaste todas las clases de un mundo.' },
  ];
  const diasRacha = r => (typeof r === 'number' ? r : (r && Number(r.dias)) || 0);
  // Estado = { items, hoy, racha } (racha: número o { dias } del servidor, días seguidos con al menos un envío).
  function insigniasDe(estado) {
    const e = estado || {};
    const items = (e.items || []).filter(estaHecha);
    const racha = diasRacha(e.racha);
    const tiene = {
      'primera-mision': items.length > 0,
      'racha-3': racha >= 3, 'racha-7': racha >= 7, 'racha-14': racha >= 14,
      perfecto: items.some(it => it.mejor && it.mejor.porcentaje === 100),
      'mini-examen': items.some(it => it.mejor && (it.mejor.secciones || []).some(s => esMiniExamen(s) && s.porcentaje >= 80)),
      'mundo-completado': !!e.hoy && mapaMundos(e.items || [], e.hoy).some(m => m.mundos.some(w => w.estado === 'completado')),
    };
    return INSIGNIAS.filter(i => tiene[i.id]);
  }
  // Insignias desbloqueadas entre dos estados (o dos listas de insignias o de ids), en el orden del catálogo.
  function insigniaNueva(antes, despues) {
    const ids = x => {
      if (!x) return [];
      if (Array.isArray(x)) return x.map(i => (typeof i === 'string' ? i : i.id));
      return insigniasDe(x).map(i => i.id);
    };
    const previas = new Set(ids(antes));
    const nuevas = new Set(ids(despues));
    return INSIGNIAS.filter(i => nuevas.has(i.id) && !previas.has(i.id));
  }

  // ---------- Retos diarios y actividad ----------
  // Retos del día = las clases cuyo día es hoy, con el XP ganado (hechas) o el posible (pendientes), cuántas faltan y
  // el XP del día.
  function retosDiarios(items, hoy) {
    const retos = (items || []).filter(it => diaDeClase(it) === hoy).map(it => ({ item: it, hecha: estaHecha(it), xp: xpDeItem(it, { hoy }), xpPosible: XP_POSIBLE }));
    const hechos = retos.filter(r => r.hecha).length;
    return { retos, hechos, total: retos.length, faltan: retos.length - hechos, xpHoy: retos.reduce((a, r) => a + r.xp, 0) };
  }
  // Lo último entregado (por `ultimoEnvio`), con su mejor porcentaje y su XP.
  function actividadReciente(items, n) {
    return (items || []).filter(it => estaHecha(it) && it.ultimoEnvio && it.mejor)
      .sort((a, b) => String(b.ultimoEnvio).localeCompare(String(a.ultimoEnvio))).slice(0, n || 5)
      .map(it => ({ item: it, fecha: it.ultimoEnvio, porcentaje: it.mejor.porcentaje, xp: xpDeClase(it, it.mejor) }));
  }

  g.Gamificacion = {
    MATERIAS, OTRA, MUNDOS, INSIGNIAS, RANGOS, XP_A_TIEMPO, XP_POR_NIVEL, XP_POSIBLE,
    sinAcentos, materiaConocida, materiaDe, sumarDias, diaDeClase, estaHecha, esMiniExamen,
    xpDeClase, xpTotal, nivelDe, rangoDe, mundoDe, mapaMundos, insigniasDe, insigniaNueva, retosDiarios, actividadReciente,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
