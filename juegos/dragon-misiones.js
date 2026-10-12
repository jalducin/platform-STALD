// Misiones de Dragon Run (openspec: dragon-run-misiones): misiones diarias deterministas, logros con niveles
// (bronce, plata y oro) y premios cosméticos sin valor real (colores del dragón y estelas).
// La usan juegos/dragon-run.html y server/dragon_misiones_test.ts. Las listas COLORES, ESTELAS y PREMIOS viven
// también en server/progreso.ts (validación del avance); la prueba exige que coincidan.
(function (g) {
  'use strict';
  const COLORES = ['verde', 'azul', 'morado', 'rojo', 'rosa', 'dorado', 'noche'];
  const ESTELAS = ['fuego', 'estrellas', 'burbujas', 'hojas', 'arcoiris'];
  const PREMIOS = [
    'color-azul', 'color-morado', 'color-rojo', 'color-rosa', 'color-dorado', 'color-noche',
    'estela-estrellas', 'estela-burbujas', 'estela-hojas', 'estela-arcoiris',
  ];
  // Nombre y muestra de cada premio (la página los pinta; el servidor solo valida ids).
  const NOMBRES = {
    verde: 'Verde', azul: 'Azul', morado: 'Morado', rojo: 'Rojo', rosa: 'Rosa', dorado: 'Dorado', noche: 'Noche',
    fuego: 'Fuego', estrellas: 'Estrellas', burbujas: 'Burbujas', hojas: 'Hojas', arcoiris: 'Arcoíris',
  };
  const PALETAS = { // cuerpo, sombra, panza, ala
    verde: ['#3fbf5f', '#2c9a49', '#ffe08a', '#ff6b9d'], azul: ['#3b8cf0', '#2463b8', '#cfe8ff', '#ffd23f'],
    morado: ['#8b5cf6', '#6537c9', '#f0e3ff', '#5eead4'], rojo: ['#e5484d', '#b4232a', '#ffd9a8', '#ffd23f'],
    rosa: ['#f472b6', '#c2457f', '#ffe4f1', '#a78bfa'], dorado: ['#e8b923', '#a87a06', '#fff3b0', '#ff8a1f'],
    noche: ['#3a3f8f', '#23275e', '#a7b4ff', '#7c5cff'],
  };
  const TOPES = { metros: 10000000, monedas: 1000000, esquivados: 10000000, carreras: 1000000, castillos: 1000000, dobles: 10000000 };
  const MAX_AVANCE = 100000;
  const fmt = n => Number(n).toLocaleString('es-MX');

  // ---------- Misiones diarias ----------
  // modo 'suma': se acumula en el día; 'max': el mejor de una sola carrera. valor(c) sale de la carrera.
  const TIPOS = {
    metros: { metas: [800, 1000, 1500], modo: 'suma', valor: c => c.metros, texto: n => 'Recorre ' + fmt(n) + ' m' },
    monedas: { metas: [30, 50, 80], modo: 'suma', valor: c => c.monedas, texto: n => 'Junta ' + fmt(n) + ' monedas' },
    racha: { metas: [10, 15, 20], modo: 'max', valor: c => c.mejorRacha, texto: n => 'Esquiva ' + n + ' obstáculos seguidos' },
    castillo: { metas: [1], modo: 'suma', valor: c => (c.castillo ? 1 : 0), texto: () => 'Llega al castillo 🏰' },
    dobles: { metas: [10, 20], modo: 'suma', valor: c => c.dobles, texto: n => 'Haz ' + n + ' dobles saltos' },
    carreras: { metas: [3], modo: 'suma', valor: () => 1, texto: n => 'Corre ' + n + ' carreras' },
    monedasCarrera: { metas: [15, 25], modo: 'max', valor: c => c.monedas, texto: n => 'Junta ' + n + ' monedas en una sola carrera' },
  };
  // FNV-1a de 32 bits y mulberry32: la misma fecha y el mismo jugador dan las mismas misiones en cualquier equipo.
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const rng = semilla => () => {
    semilla = (semilla + 0x6d2b79f5) | 0; // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  function misionesDelDia(fecha, semilla) {
    const r = rng(hash(String(fecha) + '|' + String(semilla || '')));
    const tipos = Object.keys(TIPOS);
    for (let i = tipos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tipos[i], tipos[j]] = [tipos[j], tipos[i]]; }
    return tipos.slice(0, 3).map(tipo => {
      const T = TIPOS[tipo], meta = T.metas[Math.floor(r() * T.metas.length)];
      return { tipo, meta, texto: T.texto(meta) };
    });
  }
  // Carrera mínima que cumple una misión (ganchos de prueba; «carreras» necesita varias).
  function carreraParaCumplir(m) {
    const c = { metros: 0, monedas: 0, esquivados: 0, mejorRacha: 0, dobles: 0, castillo: false };
    if (m.tipo === 'metros') c.metros = m.meta;
    else if (m.tipo === 'monedas' || m.tipo === 'monedasCarrera') c.monedas = m.meta;
    else if (m.tipo === 'racha') { c.mejorRacha = m.meta; c.esquivados = m.meta; }
    else if (m.tipo === 'castillo') { c.castillo = true; c.metros = 600; }
    else if (m.tipo === 'dobles') c.dobles = m.meta;
    return c;
  }

  // ---------- Logros con niveles ----------
  const LOGROS = [
    { id: 'explorador', nombre: 'Explorador', emoji: '🧭', que: 'metros en total', niveles: [1000, 5000, 20000], medida: p => p.totales.metros, premios: { 1: 'color-azul', 3: 'estela-arcoiris' } },
    { id: 'coleccionista', nombre: 'Coleccionista', emoji: '🪙', que: 'monedas en total', niveles: [50, 300, 1000], medida: p => p.totales.monedas, premios: { 1: 'estela-estrellas', 3: 'color-dorado' } },
    { id: 'esquivador', nombre: 'Esquivador', emoji: '💨', que: 'obstáculos seguidos', niveles: [15, 25, 35], medida: p => p.mejorRacha, premios: { 1: 'color-morado' } },
    { id: 'conquistador', nombre: 'Conquistador', emoji: '🏰', que: 'castillos', niveles: [1, 5, 20], medida: p => p.totales.castillos, premios: { 1: 'color-rojo', 3: 'color-noche' } },
    { id: 'constante', nombre: 'Constante', emoji: '📅', que: 'días seguidos', niveles: [3, 7, 14], medida: p => p.dias.mejor, premios: { 1: 'estela-hojas', 2: 'color-rosa' } },
  ];
  const MEDALLAS = ['⚪', '🥉', '🥈', '🥇'];
  const NIVELES = ['Sin medalla', 'Bronce', 'Plata', 'Oro'];
  const PREMIO_DIARIA = 'estela-burbujas'; // primera misión diaria cumplida
  const logro = id => LOGROS.find(l => l.id === id);
  const nivelLogro = (id, p) => { const l = logro(id); const v = l.medida(p); return l.niveles.filter(n => v >= n).length; };
  // Cómo se gana cada premio (texto para los candados).
  function comoSeGana(premio) {
    if (premio === PREMIO_DIARIA) return 'Cumple tu primera misión diaria';
    for (const l of LOGROS) for (const [n, id] of Object.entries(l.premios)) if (id === premio) return l.nombre + ' ' + MEDALLAS[n] + ': ' + fmt(l.niveles[n - 1]) + ' ' + l.que;
    return '';
  }
  function premiosDe(p) {
    const s = new Set(p.premios);
    for (const l of LOGROS) { const n = nivelLogro(l.id, p); for (const [k, id] of Object.entries(l.premios)) if (n >= Number(k)) s.add(id); }
    if (p.cumplidas > 0) s.add(PREMIO_DIARIA);
    return PREMIOS.filter(x => s.has(x)); // orden fijo
  }

  // ---------- Avance ----------
  const nuevo = () => ({
    totales: { metros: 0, monedas: 0, esquivados: 0, carreras: 0, castillos: 0, dobles: 0 },
    mejorRacha: 0, dias: { ultimo: null, racha: 0, mejor: 0 }, diaria: null, cumplidas: 0, premios: [],
    equipo: { color: 'verde', estela: 'fuego' },
  });
  const ent = (x, max) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);
  const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const fechaReal = x => {
    if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
    const d = new Date(x + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
  };
  // Lo que llega del servidor (o de localStorage) se repara campo por campo: nunca rompe el juego.
  function normalizar(d) {
    const p = nuevo();
    if (!esObj(d)) return p;
    if (esObj(d.totales)) for (const k of Object.keys(TOPES)) p.totales[k] = ent(d.totales[k], TOPES[k]);
    p.mejorRacha = ent(d.mejorRacha, 999);
    p.cumplidas = ent(d.cumplidas, 100000);
    if (esObj(d.dias)) {
      p.dias.mejor = ent(d.dias.mejor, 3660);
      if (fechaReal(d.dias.ultimo)) { p.dias.ultimo = d.dias.ultimo; p.dias.racha = Math.min(ent(d.dias.racha, 3660), p.dias.mejor); }
    }
    if (esObj(d.diaria) && fechaReal(d.diaria.fecha) && Array.isArray(d.diaria.avance) && d.diaria.avance.length === 3) {
      p.diaria = { fecha: d.diaria.fecha, avance: d.diaria.avance.map(n => ent(n, MAX_AVANCE)) };
    }
    if (Array.isArray(d.premios)) p.premios = PREMIOS.filter(x => d.premios.includes(x));
    if (esObj(d.equipo)) {
      if (COLORES.includes(d.equipo.color) && (d.equipo.color === 'verde' || p.premios.includes('color-' + d.equipo.color))) p.equipo.color = d.equipo.color;
      if (ESTELAS.includes(d.equipo.estela) && (d.equipo.estela === 'fuego' || p.premios.includes('estela-' + d.equipo.estela))) p.equipo.estela = d.equipo.estela;
    }
    return p;
  }
  const clonar = p => structuredClone(p);
  const ayer = f => { const d = new Date(f + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const avanceDelDia = (p, fecha) => (p.diaria && p.diaria.fecha === fecha ? p.diaria.avance.slice() : [0, 0, 0]);
  // Avance de las 3 misiones del día si la carrera `c` (completa o en curso) terminara ahora.
  function avanceCon(p, c, fecha, semilla) {
    const base = avanceDelDia(p, fecha);
    return misionesDelDia(fecha, semilla).map((m, i) => {
      const T = TIPOS[m.tipo], v = ent(T.valor(c), MAX_AVANCE);
      return Math.min(MAX_AVANCE, T.modo === 'suma' ? base[i] + v : Math.max(base[i], v));
    });
  }
  function vistaMisiones(prog, fecha, semilla, c) {
    const p = normalizar(prog);
    const av = c ? avanceCon(p, c, fecha, semilla) : avanceDelDia(p, fecha);
    return misionesDelDia(fecha, semilla).map((m, i) => ({ ...m, avance: av[i], cumplida: av[i] >= m.meta }));
  }
  // Suma una carrera terminada: { metros, monedas, esquivados, mejorRacha, dobles, castillo }. Devuelve el avance
  // nuevo y los mensajes de lo que se cumplió en esta carrera (misiones, logros y premios).
  function aplicarCarrera(prog, c, fecha, semilla) {
    const p = clonar(normalizar(prog)), mensajes = [];
    const antes = LOGROS.map(l => nivelLogro(l.id, p));
    const misiones = misionesDelDia(fecha, semilla), previo = avanceDelDia(p, fecha), nuevoAv = avanceCon(p, c, fecha, semilla);
    misiones.forEach((m, i) => {
      if (previo[i] < m.meta && nuevoAv[i] >= m.meta) { mensajes.push('🎯 ¡Misión cumplida! ' + m.texto); p.cumplidas = Math.min(100000, p.cumplidas + 1); }
    });
    p.diaria = { fecha, avance: nuevoAv };
    const suma = (k, v) => { p.totales[k] = Math.min(TOPES[k], p.totales[k] + ent(v, TOPES[k])); };
    suma('metros', c.metros); suma('monedas', c.monedas); suma('esquivados', c.esquivados); suma('dobles', c.dobles);
    suma('carreras', 1); suma('castillos', c.castillo ? 1 : 0);
    p.mejorRacha = Math.max(p.mejorRacha, ent(c.mejorRacha, 999));
    if (p.dias.ultimo !== fecha) {
      p.dias.racha = p.dias.ultimo === ayer(fecha) ? Math.min(3660, p.dias.racha + 1) : 1;
      p.dias.ultimo = fecha;
      p.dias.mejor = Math.max(p.dias.mejor, p.dias.racha);
    }
    LOGROS.forEach((l, i) => { const n = nivelLogro(l.id, p); if (n > antes[i]) mensajes.push('🏅 ¡Logro! ' + l.nombre + ' ' + MEDALLAS[n] + ' ' + NIVELES[n]); });
    const tenia = new Set(p.premios);
    p.premios = premiosDe(p);
    p.premios.filter(x => !tenia.has(x)).forEach(x => mensajes.push('🎨 Nuevo premio: ' + (x.startsWith('color-') ? 'dragón ' : 'estela ') + NOMBRES[x.replace(/^(color|estela)-/, '')]));
    return { prog: p, mensajes };
  }
  // Fecha de hoy en la Ciudad de México (AAAA-MM-DD).
  function fechaHoy() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  g.DragonMisiones = {
    COLORES, ESTELAS, PREMIOS, NOMBRES, PALETAS, TIPOS, LOGROS, MEDALLAS, NIVELES, PREMIO_DIARIA,
    misionesDelDia, carreraParaCumplir, nivelLogro, comoSeGana, premiosDe, nuevo, normalizar, avanceCon, vistaMisiones,
    aplicarCarrera, fechaHoy, fmt,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
