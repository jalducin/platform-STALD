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
      // `mapa` (opcional, aditivo: ruta del profe, openspec: ingles-diseno-profe): mundos propios con su estado.
      'mundo-completado': Array.isArray(e.mapa) ? e.mapa.some(w => w.estado === 'completado')
        : !!e.hoy && mapaMundos(e.items || [], e.hoy).some(m => m.mundos.some(w => w.estado === 'completado')),
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

  // ======================================================================================================
  // Fase 2a — misiones principales (openspec: rpg-fase2-misiones). TODO lo de abajo es aditivo: no cambia ninguna
  // función de arriba (la fórmula de la Fase 1 la fijan los 10 casos de server/gamificacion_regresion_test.ts).
  // ======================================================================================================

  // ---------- XP de la misión principal ----------
  // porcentaje de la rúbrica (0–100) × 3 + 60 si el último paso llegó a tiempo. Acepta la misión (con `evaluacion`) o la
  // evaluación sola ({ porcentaje, aTiempo }). Sin evaluar (o con corrección pedida: `evaluacion` null): 0.
  const XP_MISION_POR_PUNTO = 3;
  const XP_MISION_A_TIEMPO = 60;
  function xpDeMision(m) {
    const ev = m && Object.prototype.hasOwnProperty.call(m, 'evaluacion') ? m.evaluacion : m;
    if (!ev || !Number.isFinite(Number(ev.porcentaje))) return 0;
    const pct = Math.min(100, Math.max(0, Math.round(Number(ev.porcentaje))));
    return pct * XP_MISION_POR_PUNTO + (ev.aTiempo ? XP_MISION_A_TIEMPO : 0);
  }
  const xpMisiones = misiones => (misiones || []).reduce((a, m) => a + xpDeMision(m), 0);
  // XP total de la persona: clases (regla de Fase 1) + misiones principales evaluadas, en el mismo total.
  const xpTotalConMisiones = (items, misiones, o) => xpTotal(items, o) + xpMisiones(misiones);

  // ---------- Catálogo de mundos (contenido/<ámbito>/mundos.json) ----------
  // Id de un mundo: su nombre en minúsculas, sin acentos y con guiones («Valle de los Números» → valle-de-los-numeros).
  const slugMundo = nombre => sinAcentos(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  // Catálogo derivado de MUNDOS (la fuente de nombres y fechas): lo que debe decir mundos.json de Secundaria. Un mundo
  // que comparten dos materias (Estudio y Arena) lleva una entrada por materia con id `<nombre>-<clave>`.
  function catalogoDeMundos() {
    const lista = [];
    const repetidos = new Set();
    const vistos = new Set();
    for (const ws of Object.values(MUNDOS)) for (const w of ws) { const id = slugMundo(w.nombre); if (vistos.has(id)) repetidos.add(id); vistos.add(id); }
    for (const m of MATERIAS) for (const w of MUNDOS[m.clave] || []) {
      const base = slugMundo(w.nombre);
      lista.push({ id: repetidos.has(base) ? base + '-' + m.clave : base, materia: m.nombre, nombre: w.nombre, emoji: w.emoji, etapa: w.etapa, desde: w.desde || null, hasta: w.hasta || null });
    }
    return lista;
  }
  // Mundos de una materia (clave) para `hoy`: los del catálogo si trae alguno (salvo una materia que ya rota, que usa
  // la rotación mensual de la Fase 1); si no, la derivación de la Fase 1.
  function mundosDeMateria(clave, hoy, catalogo) {
    const delCatalogo = (catalogo || []).filter(w => w && claveDeMateria(w.materia) === clave)
      .map(w => ({ id: w.id, etapa: w.etapa || '', nombre: w.nombre, emoji: w.emoji || '🗺️', desde: w.desde || undefined, hasta: w.hasta || undefined, misionPrincipal: w.misionPrincipal || null }));
    const rota = ROTA[clave] && hoy && hoy >= ROTA[clave];
    if (delCatalogo.length && !rota) return delCatalogo;
    return (mundosVigentes(clave, hoy) || []).map(w => ({ ...w, id: slugMundo(w.nombre), misionPrincipal: (delCatalogo.find(c => c.nombre === w.nombre) || {}).misionPrincipal || null }));
  }
  // ¿La clase va en el mundo `w`? Por su campo `mundo` (id) o, si no lo trae, por la fecha de la clase.
  function claseEnMundo(it, w, todos) {
    if (it.mundo) return it.mundo === w.id;
    if (w.desde) { const d = diaDeClase(it); return d >= w.desde && (!w.hasta || d <= w.hasta); }
    return todos.length === 1;
  }
  const promedioDe = clases => {
    const con = clases.filter(it => estaHecha(it) && it.mejor && Number.isFinite(Number(it.mejor.porcentaje)));
    return con.length ? Math.round(con.reduce((a, it) => a + Number(it.mejor.porcentaje), 0) / con.length) : null;
  };
  // Zonas: bloques de 2 semanas desde el inicio del mundo; cada clase es un capítulo.
  function zonasDe(w, clases) {
    if (!w.desde) return clases.length ? [{ n: 1, desde: null, hasta: null, capitulos: clases }] : [];
    const zonas = new Map();
    for (const it of clases) {
      const n = Math.max(0, Math.floor(diasEntre(w.desde, diaDeClase(it)) / 14)) + 1;
      if (!zonas.has(n)) zonas.set(n, { n, desde: sumarDias(w.desde, (n - 1) * 14), hasta: sumarDias(w.desde, n * 14 - 1), capitulos: [] });
      zonas.get(n).capitulos.push(it);
    }
    return [...zonas.values()].sort((a, b) => a.n - b.n);
  }
  // Mapa RPG por materia: mundos (catálogo o Fase 1) con estado, zonas, capítulos, promedio y misión principal.
  // Estados: «bloqueado» (aún no empieza), «en-curso», «completado» (terminó su fecha y su misión principal está
  // evaluada; sin misión, todas sus clases hechas) y «dominado» (completado con promedio ≥ 80 % y misión ≥ 80 %).
  // Un mundo que ya pasó nunca se bloquea. `opciones` = { catalogo, misiones }.
  function mapaRpg(items, hoy, opciones) {
    const o = opciones || {};
    const lista = items || [];
    const misiones = o.misiones || [];
    return MATERIAS.map(m => {
      const suyas = lista.filter(it => claveDe(it) === m.clave);
      const mundos = mundosDeMateria(m.clave, hoy, o.catalogo).map((w, i, todos) => {
        const clases = suyas.filter(it => claseEnMundo(it, w, todos));
        const hechas = clases.filter(estaHecha).length;
        const mision = misiones.find(x => x && (x.id === w.misionPrincipal || x.mundo === w.id)) || null;
        const evaluada = !!(mision && mision.evaluacion);
        const promedio = promedioDe(clases);
        let estado;
        if (!w.desde) estado = todos.length === 1 ? 'en-curso' : 'bloqueado';
        else if (w.desde > hoy) estado = 'bloqueado';
        else if (w.hasta && hoy > w.hasta) {
          const listo = mision ? evaluada : (clases.length > 0 && hechas === clases.length);
          estado = listo ? 'completado' : 'en-curso';
          const misionOk = mision ? evaluada && Number(mision.evaluacion.porcentaje) >= 80 : true;
          if (listo && promedio !== null && promedio >= 80 && misionOk) estado = 'dominado';
        } else estado = 'en-curso';
        return {
          id: w.id, etapa: w.etapa, nombre: w.nombre, emoji: w.emoji, desde: w.desde || null, hasta: w.hasta || null, estado,
          hechas, total: clases.length, promedio, zonas: zonasDe(w, clases),
          mision: mision ? { id: mision.id, titulo: mision.titulo, evaluada, porcentaje: evaluada ? mision.evaluacion.porcentaje : null } : null,
        };
      });
      return { clave: m.clave, nombre: m.nombre, emoji: m.emoji, mundos };
    });
  }

  // ---------- Misiones diarias y semanales (sin XP: solo progreso e insignias) ----------
  // Lunes (AAAA-MM-DD) de la semana de `f` (lunes a domingo).
  function lunesDe(f) { const dow = fecha(f).getUTCDay(); return sumarDias(f, dow === 0 ? -6 : 1 - dow); }
  const fechaMx = iso => { try { return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); } catch (e) { return String(iso).slice(0, 10); } };
  // Temas del último intento de una clase: `ultimoTemas` del servidor o, si no viene, las secciones del mejor.
  const temasDeIntento = it => (Array.isArray(it.ultimoTemas) ? it.ultimoTemas : (it.mejor && it.mejor.secciones) || []);
  // Diaria: «Completa tus clases de hoy» (las que abren hoy, hora de la Ciudad de México).
  function misionDiaria(items, hoy) {
    const deHoy = (items || []).filter(it => it.disponibleDesde === hoy);
    const hechas = deHoy.filter(estaHecha).length;
    return { id: 'diaria-clases', emoji: '☀️', titulo: 'Completa tus clases de hoy', hechas, total: deHoy.length, completa: deHoy.length > 0 && hechas === deHoy.length, xp: 0 };
  }
  // Semanales: clases de la semana, un paso de la misión principal y mejorar un tema en debilidad. Sin XP.
  function misionesSemanales(items, misiones, hoy) {
    const lista = items || [];
    const lunes = lunesDe(hoy), domingo = sumarDias(lunes, 6);
    const enSemana = d => d >= lunes && d <= domingo;
    const deSemana = lista.filter(it => enSemana(diaDeClase(it)));
    const hechas = deSemana.filter(estaHecha).length;
    const pasos = (misiones || []).flatMap(m => (m && m.entrega && m.entrega.pasos) ? Object.values(m.entrega.pasos) : []);
    const pasoSemana = pasos.some(p => p && p.enviadoEn && enSemana(fechaMx(p.enviadoEn)));
    const hayMision = (misiones || []).length > 0;
    // Mejorar un tema: un tema que estaba en `debilidad` en una clase anterior y esta semana salió mejor en otra.
    const conIntento = lista.filter(it => estaHecha(it) && it.ultimoEnvio).sort((a, b) => String(a.ultimoEnvio).localeCompare(String(b.ultimoEnvio)));
    const debiles = new Set();
    let mejoro = false;
    for (const it of conIntento) {
      const estaSemana = enSemana(fechaMx(it.ultimoEnvio));
      for (const s of temasDeIntento(it)) {
        const t = sinAcentos(s.titulo || '');
        if (s.estado === 'debilidad') debiles.add(t);
        else if (estaSemana && debiles.has(t)) mejoro = true;
      }
    }
    return [
      { id: 'semana-clases', emoji: '🗓️', titulo: 'Termina las clases de la semana', hechas, total: deSemana.length, completa: deSemana.length > 0 && hechas === deSemana.length, xp: 0 },
      { id: 'semana-paso', emoji: '⚔️', titulo: 'Avanza un paso de tu misión principal', hechas: pasoSemana ? 1 : 0, total: hayMision ? 1 : 0, completa: pasoSemana, xp: 0 },
      { id: 'semana-debilidad', emoji: '🔧', titulo: 'Mejora un tema en debilidad', hechas: mejoro ? 1 : 0, total: debiles.size ? 1 : 0, completa: mejoro, xp: 0 },
    ];
  }
  // Insignias de la Fase 2 (derivadas; no dan XP ni se guardan). Van aparte de INSIGNIAS para no cambiar las de la Fase 1.
  const INSIGNIAS_RPG = [
    { id: 'semana-completa', emoji: '🗓️', nombre: 'Semana completa', descripcion: 'Terminaste todas las clases de una semana.' },
    { id: 'mision-principal', emoji: '⚔️', nombre: 'Misión principal', descripcion: 'El profe evaluó tu primera misión principal.' },
    { id: 'constructora-mundos', emoji: '🏗️', nombre: 'Constructora de mundos', descripcion: 'Cerraste un mundo con su misión principal.' },
  ];
  // Estado = { items, misiones, hoy, catalogo }.
  function insigniasRpgDe(estado) {
    const e = estado || {};
    const items = e.items || [];
    const semanas = new Map();
    for (const it of items) {
      const lunes = lunesDe(diaDeClase(it));
      if (e.hoy && lunes > lunesDe(e.hoy)) continue;
      if (!semanas.has(lunes)) semanas.set(lunes, []);
      semanas.get(lunes).push(it);
    }
    const tiene = {
      'semana-completa': [...semanas.values()].some(cl => cl.length > 0 && cl.every(estaHecha)),
      'mision-principal': (e.misiones || []).some(m => m && m.evaluacion),
      'constructora-mundos': !!e.hoy && mapaRpg(items, e.hoy, { catalogo: e.catalogo, misiones: e.misiones }).some(m => m.mundos.some(w => w.mision && w.mision.evaluada && (w.estado === 'completado' || w.estado === 'dominado'))),
    };
    return INSIGNIAS_RPG.filter(i => tiene[i.id]);
  }

  // ---------- Árbol de habilidades por materia ----------
  // Nodos = temas de las clases (campo `temas` del listado; si falta, el tema del título), agrupados por mundo. Estado
  // del nodo según el último intento de la clase más reciente con ese tema: «dominado» (fortaleza o ≥ 80 %),
  // «reforzar» (debilidad), «progreso» (en progreso) o «no-visto» (sin intento; `bloqueado` si ninguna de sus clases
  // ha abierto). Un nodo a reforzar trae `repasoId` (un repaso abierto con ese tema o, si no hay, la misma clase).
  const temaDelTitulo = it => { const t = (it && it.titulo) || ''; const i = t.indexOf(' · '); return (i < 0 ? t : t.slice(i + 3)).replace(EMOJI_INICIAL, '').trim(); };
  const temasDeClase = it => (Array.isArray(it.temas) && it.temas.length ? it.temas.map(t => (typeof t === 'string' ? t : t && t.titulo) || '').filter(Boolean) : [temaDelTitulo(it)].filter(Boolean));
  const esRepaso = it => it.tipo === 'refuerzo' || /repaso/i.test(it.titulo || '');
  function arbolHabilidades(items, hoy, opciones) {
    const lista = items || [];
    return mapaRpg(lista, hoy, opciones).map(m => {
      const mundos = m.mundos.map(w => {
        const clases = w.zonas.flatMap(z => z.capitulos);
        const nodos = new Map();
        for (const it of clases) for (const tema of temasDeClase(it)) {
          const k = sinAcentos(tema);
          if (!nodos.has(k)) nodos.set(k, { tema, clases: [] });
          nodos.get(k).clases.push(it);
        }
        return {
          id: w.id, nombre: w.nombre, emoji: w.emoji, estadoMundo: w.estado,
          nodos: [...nodos.values()].map(n => {
            const hechas = n.clases.filter(it => estaHecha(it)).sort((a, b) => String(b.ultimoEnvio || '').localeCompare(String(a.ultimoEnvio || '')));
            const abiertas = n.clases.filter(it => !it.disponibleDesde || it.disponibleDesde <= hoy);
            if (!hechas.length) return { tema: n.tema, estado: 'no-visto', bloqueado: !abiertas.length, porcentaje: null, itemId: (abiertas[0] || n.clases[0]).id, repasoId: null };
            const ult = hechas[0];
            const sec = temasDeIntento(ult).find(s => sinAcentos(s.titulo || '') === sinAcentos(n.tema));
            const pct = sec && Number.isFinite(Number(sec.porcentaje)) ? Number(sec.porcentaje) : (ult.mejor ? Number(ult.mejor.porcentaje) : null);
            let estado = 'progreso';
            if (sec && sec.estado === 'debilidad') estado = 'reforzar';
            else if ((sec && sec.estado === 'fortaleza') || (pct !== null && pct >= 80)) estado = 'dominado';
            let repasoId = null;
            if (estado === 'reforzar') {
              const repaso = lista.find(it => it.id !== ult.id && esRepaso(it) && (!it.disponibleDesde || it.disponibleDesde <= hoy) && temasDeClase(it).some(t => sinAcentos(t) === sinAcentos(n.tema)));
              repasoId = (repaso || ult).id;
            }
            return { tema: n.tema, estado, bloqueado: false, porcentaje: pct, itemId: ult.id, repasoId };
          }),
        };
      }).filter(w => w.nodos.length);
      return { clave: m.clave, nombre: m.nombre, emoji: m.emoji, mundos };
    });
  }

  // ======================================================================================================
  // Ruta del profe (openspec: ingles-diseno-profe). ADITIVO: no cambia nada de Secundaria ni de Inglés.
  // La ruta (contenido/profe/plan.json) está toda abierta y sus fechas son ritmo sugerido: no hay «bloqueado» ni
  // «atrasada», y toda clase hecha cuenta como a tiempo.
  // ======================================================================================================

  // ---------- Mundos de la ruta ----------
  // `semanas`: número de semana del plan (1 = la primera). `patron`: si el título lo cumple, la clase va a ese mundo
  // aunque sea de otra semana (clases extra de Minto y de Skills). Fuente: este catálogo (documentado en
  // docs/frontend-standards.md § «Ruta del profe con la experiencia RPG»).
  const MUNDOS_RUTA_PROFE = [
    { id: 'taller-del-agente', nombre: 'Taller del Agente', emoji: '🛠️', etapa: 'Claude Code base y hooks', semanas: [1, 2] },
    { id: 'fabrica-de-specs', nombre: 'Fábrica de Specs', emoji: '🏭', etapa: 'OpenSpec y SDD', semanas: [3] },
    { id: 'red-de-conectores', nombre: 'Red de Conectores', emoji: '🔌', etapa: 'MCP y ecosistema', semanas: [4] },
    { id: 'colmena-de-subagentes', nombre: 'Colmena de Subagentes', emoji: '🐝', etapa: 'Subagentes', semanas: [5] },
    { id: 'biblioteca-sdd', nombre: 'Biblioteca SDD', emoji: '📚', etapa: 'SDD según el ebook', semanas: [6] },
    { id: 'arena-en-accion', nombre: 'Arena en Acción', emoji: '⚔️', etapa: 'Claude Code en acción', semanas: [7] },
    { id: 'proyecto-integrador', nombre: 'Proyecto Integrador', emoji: '🏰', etapa: 'Proyecto y examen final', semanas: [8] },
    { id: 'torre-de-minto', nombre: 'Torre de Minto', emoji: '🗼', etapa: 'Pirámide de Minto', patron: 'pir[aá]mide de minto|\\bminto\\b' },
    { id: 'forja-de-skills', nombre: 'Forja de Skills', emoji: '⚒️', etapa: 'Skills', patron: '^\\s*clase:\\s*skills\\b' },
  ];
  // Mundo de una clase del plan (`{ titulo }`) en la semana `n` (1-based). Sin mundo: null.
  function mundoDeClaseRuta(el, n, catalogo) {
    const c = catalogo || MUNDOS_RUTA_PROFE;
    const titulo = (el && el.titulo) || '';
    return c.find(w => w.patron && new RegExp(w.patron, 'i').test(titulo)) || c.find(w => (w.semanas || []).includes(n)) || null;
  }
  // Mapa de la ruta: un mundo por entrada del catálogo con sus clases ({ elemento, item, semana }), hechas, total y
  // estado: «completado» (todas hechas, con al menos una), «en-curso» (alguna hecha, o trae la semana sugerida de hoy)
  // o «abierto» (todo abierto, sin empezar). `items` = lo que devuelve el servidor (id → estado y mejor intento).
  function mapaRuta(plan, items, hoy, catalogo) {
    const c = catalogo || MUNDOS_RUTA_PROFE;
    const porId = new Map((items || []).map(it => [it.id, it]));
    const semanas = (plan && plan.semanas) || [];
    const actual = [...semanas].reverse().find(s => /^\d{4}-\d{2}-\d{2}$/.test(s.id) && hoy && s.id <= hoy);
    const clases = semanas.flatMap((s, i) => (s.elementos || []).map(e => ({ elemento: e, item: porId.get(e.id) || null, semana: i + 1, semanaId: s.id })));
    return c.map(w => {
      const suyas = clases.filter(x => (mundoDeClaseRuta(x.elemento, x.semana, c) || {}).id === w.id);
      const hechas = suyas.filter(x => x.item && estaHecha(x.item)).length;
      let estado = 'abierto';
      if (suyas.length && hechas === suyas.length) estado = 'completado';
      else if (hechas || (actual && suyas.some(x => x.semanaId === actual.id))) estado = 'en-curso';
      return { id: w.id, nombre: w.nombre, emoji: w.emoji, etapa: w.etapa, estado, hechas, total: suyas.length, promedio: promedioDe(suyas.map(x => x.item).filter(Boolean)), clases: suyas };
    });
  }
  // Mundo actual: el primero en curso con clases pendientes; si no, el primero sin terminar; si todo está hecho, el último.
  function mundoActualRuta(mapa) {
    const conClases = (mapa || []).filter(w => w.total);
    return conClases.find(w => w.estado === 'en-curso' && w.hechas < w.total) || conClases.find(w => w.estado !== 'completado') || conClases[conClases.length - 1] || null;
  }
  // XP de la ruta: la regla de siempre (xpDeClase) con toda clase hecha a tiempo (las fechas son ritmo sugerido).
  const xpRuta = items => xpTotal(items, { aTiempo: true });

  g.Gamificacion = {
    MATERIAS, OTRA, MUNDOS, INSIGNIAS, RANGOS, XP_A_TIEMPO, XP_POR_NIVEL, XP_POSIBLE,
    sinAcentos, materiaConocida, materiaDe, sumarDias, diaDeClase, estaHecha, esMiniExamen,
    xpDeClase, xpTotal, nivelDe, rangoDe, mundoDe, mapaMundos, insigniasDe, insigniaNueva, retosDiarios, actividadReciente,
    // Fase 2a (openspec: rpg-fase2-misiones)
    XP_MISION_POR_PUNTO, XP_MISION_A_TIEMPO, INSIGNIAS_RPG,
    xpDeMision, xpMisiones, xpTotalConMisiones, slugMundo, catalogoDeMundos, mapaRpg, lunesDe,
    misionDiaria, misionesSemanales, insigniasRpgDe, arbolHabilidades,
    // Ruta del profe (openspec: ingles-diseno-profe)
    MUNDOS_RUTA_PROFE, mundoDeClaseRuta, mapaRuta, mundoActualRuta, xpRuta,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
