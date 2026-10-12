// Gramática de inglés en Juegos (openspec: juegos-ingles-gramatica): temas del selector, regla corta al fallar y
// ⏳ Máquina del tiempo (`en-tiempos`). Script clásico cargado antes de los scripts de juegos/app/ (el código de juegos.html).
// - `globalThis.InglesGramatica`: funciones puras (sin DOM), también usadas por las pruebas de Deno.
// - Pantallas (`elegirTemaIngles`, `jugarFrasesTema`, `jugarTiempos`, `resumenFallosSala`): usan los helpers globales
//   de juegos.html (quiz, marco, datos, barajar, escapeHtml…), que se resuelven al llamarlas.
(function (g) {
  'use strict';

  // ---------- Temas del selector ----------
  // Igual que TEMAS_INGLES en server/salas.ts.
  const TEMAS = [
    { id: 'todo', t: 'Todo', emoji: '🌈', d: 'Todos los temas mezclados' },
    { id: 'tobe', t: 'To be', emoji: '🟰', d: 'am / is / are · was / were' },
    { id: 'presente', t: 'Presente', emoji: '▶️', d: "plays · don't / doesn't · Do / Does…?" },
    { id: 'pasado', t: 'Pasado', emoji: '⏪', d: "played, went · didn't · Did…?" },
    { id: 'futuro', t: 'Futuro (will)', emoji: '⏩', d: "will + verbo · won't · Will…?" },
  ];
  // Temas de ingles.json que entran en cada grupo (un elemento puede estar en dos).
  const GRUPOS = {
    tobe: ['to be', 'to be pasado'],
    presente: ['to be', 'presente simple'],
    pasado: ['to be pasado', 'pasado simple'],
    futuro: ['futuro will'],
  };
  const temaValido = t => TEMAS.some(x => x.id === t) ? t : 'todo';
  const nombreTema = t => (TEMAS.find(x => x.id === temaValido(t)) || TEMAS[0]).t;
  const filtrar = (lista, tema) => { const gr = GRUPOS[temaValido(tema)]; return gr ? lista.filter(x => gr.includes(x.tema)) : lista.slice(); };

  // Etiqueta del tipo de error (para «Lo que más se te complicó»).
  const NOMBRE_TEMA = {
    'to be': 'To be (am / is / are)', 'to be pasado': 'To be en pasado (was / were)', 'presente simple': 'Presente simple',
    'pasado simple': 'Pasado simple', 'futuro will': 'Futuro con will', wh: 'Preguntas WH', posesivos: 'Posesivos',
    articulos: 'Artículos a / an / the', plurales: 'Plurales', demostrativos: 'This / that / these / those', adjetivos: 'Adjetivos',
  };
  // Regla de orden para 🔀 Ordena la oración.
  const REGLA_ORDEN = {
    'to be': 'To be: sujeto + am / is / are + complemento.',
    'to be pasado': 'Pasado de to be: sujeto + was / were + complemento.',
    'presente simple': 'Presente: sujeto + verbo (con -s si es he / she / it) + complemento.',
    'pasado simple': "Pasado: sujeto + verbo en pasado; en negativo, didn't + verbo base.",
    'futuro will': "Futuro: sujeto + will / won't + verbo base.",
  };
  const reglaOrden = tema => REGLA_ORDEN[tema] || 'Orden en inglés: sujeto + verbo + complemento.';

  // Aleatorio: `rnd` de la sala (semilla) o Math.random.
  function mezclar(a, rnd) {
    const b = a.slice(); const r = rnd || Math.random;
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }
  function conOpciones(base, ok, malas, rnd) {
    const opciones = mezclar([ok].concat(malas), rnd);
    return Object.assign(base, { opciones, correcta: opciones.indexOf(ok) });
  }

  // ---------- 🧩 Completa y responde ----------
  // f: elemento de `verbos`. Con `rnd` (partida) las opciones se barajan; en solitario quedan como en los datos.
  function preguntaFrase(f, rnd) {
    const ok = f.opciones[f.correcta];
    const base = { big: '🧩', q: f.frase, sub: f.es, explicacion: 'Era: ' + f.frase.replace('___', ok) + (f.regla ? ' · 📌 ' + f.regla : ''), dato: f.regla || '', fallo: NOMBRE_TEMA[f.tema] || 'Gramática' };
    return rnd ? conOpciones(base, ok, f.opciones.filter((_, k) => k !== f.correcta), rnd) : Object.assign(base, { opciones: f.opciones.slice(), correcta: f.correcta });
  }
  // f: elemento de `preguntas` (opciones siempre barajadas).
  function preguntaEn(f, rnd) {
    const ok = f.opciones[f.correcta];
    return conOpciones({ big: '💬', q: f.pregunta, sub: f.es, explicacion: 'Respuesta: ' + ok + (f.regla ? ' · 📌 ' + f.regla : ''), dato: f.regla || '', fallo: NOMBRE_TEMA[f.tema] || 'Responder en inglés' },
      ok, f.opciones.filter((_, k) => k !== f.correcta), rnd);
  }
  // Las n preguntas de una partida de en-frases: mitad frases y mitad preguntas del tema (si faltan preguntas, frases).
  function preguntasFrasesPartida(d, tema, rnd, n) {
    n = n || 10;
    const fr = mezclar(filtrar(d.verbos, tema), rnd), pr = mezclar(filtrar(d.preguntas, tema), rnd).slice(0, Math.floor(n / 2));
    const lista = []; let i = 0, k = 0;
    while (lista.length < n && (i < fr.length || k < pr.length)) {
      if (lista.length % 2 === 0 || k >= pr.length) { if (i < fr.length) lista.push(preguntaFrase(fr[i++], rnd)); else lista.push(preguntaEn(pr[k++], rnd)); }
      else lista.push(preguntaEn(pr[k++], rnd));
    }
    return lista;
  }

  // ---------- ⏳ Máquina del tiempo ----------
  const TIEMPOS = ['pasado', 'presente', 'futuro'];
  const OPC_TIEMPO = ['⏪ Pasado', '▶️ Presente', '⏩ Futuro'];
  const EMOJI_T = { pasado: '⏪', presente: '▶️', futuro: '⏩' };
  const esP3 = it => it.tema === 'to be' ? it.presente === 'is' : it.presente !== it.verbo;
  function tercera(v) {
    if (v === 'have') return 'has';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    if (/(s|sh|ch|x|o)$/.test(v)) return v + 'es';
    return v + 's';
  }
  const regularizar = v => v.endsWith('e') ? v + 'd' : v + 'ed';
  function formas(it) {
    return {
      presente: it.sujeto + ' ' + it.presente + ' ' + it.resto,
      pasado: it.sujeto + ' ' + it.pasado + ' ' + it.resto,
      futuro: it.sujeto + ' will ' + it.verbo + ' ' + it.resto,
    };
  }
  // Error típico al pasar al tiempo `destino`. Si coincide con una forma correcta (He read = pasado de read), usa
  // otro error típico.
  function trampa(it, destino) {
    const s = it.sujeto + ' ', r = ' ' + it.resto;
    let t;
    if (destino === 'pasado') {
      if (it.tema === 'to be') t = s + (it.pasado === 'was' ? 'were' : 'was') + r;
      else t = s + (it.tema === 'irregular' ? regularizar(it.verbo) : 'did ' + it.pasado) + r;
    } else if (destino === 'futuro') t = s + 'will ' + (it.tema === 'to be' || esP3(it) ? it.presente : it.pasado) + r;
    else if (it.tema === 'to be') t = s + ({ am: 'is', is: 'are', are: 'is' })[it.presente] + r;
    else t = s + (esP3(it) ? it.verbo : tercera(it.verbo)) + r;
    const f = formas(it);
    if (t !== f.pasado && t !== f.presente && t !== f.futuro) return t;
    return s + ({ pasado: 'did ' + it.pasado, futuro: 'will ' + it.pasado, presente: 'is ' + it.verbo })[destino] + r;
  }
  function reglaPasado(it) {
    if (it.tema === 'to be') return 'Pasado de to be: ' + it.presente + ' → ' + it.pasado + ' (was con I / he / she / it; were con you / we / they).';
    const b = it.verbo, p = it.pasado;
    if (it.tema === 'irregular') return b === p ? 'Pasado irregular: ' + b + ' → ' + p + ' (igual, pero suena «red»).' : 'Pasado irregular: ' + b + ' → ' + p + ' (se aprende de memoria).';
    if (p.endsWith('ied')) return 'Pasado regular: ' + b + ' → ' + p + ' (y cambia a -ied).';
    if (p === b + b.slice(-1) + 'ed') return 'Pasado regular: ' + b + ' → ' + p + ' (se dobla la ' + b.slice(-1) + ').';
    if (b.endsWith('e')) return 'Pasado regular: ' + b + ' → ' + p + ' (solo se agrega -d).';
    return 'Pasado regular: ' + b + ' → ' + p + ' (verbo + -ed).';
  }
  function reglaPresente(it) {
    if (it.tema === 'to be') return 'Presente de to be: I am · he / she / it is · you / we / they are.';
    if (!esP3(it)) return 'Con I / you / we / they el verbo va sin -s: ' + it.verbo + '.';
    if (it.presente === 'has') return 'Con he / she / it, have cambia a has.';
    if (it.presente.endsWith('ies')) return 'Con he / she / it: consonante + y → -ies (' + it.verbo + ' → ' + it.presente + ').';
    if (it.presente.endsWith('es') && tercera(it.verbo) === it.presente) return 'Con he / she / it, los verbos en -ch, -sh, -s, -x, -o llevan -es: ' + it.presente + '.';
    return 'Con he / she / it el verbo lleva -s: ' + it.presente + '.';
  }
  const reglaFuturo = it => it.tema === 'to be' ? 'Futuro de to be: will be (nunca will is ni will are).' : 'Futuro: will + verbo base, igual con todas las personas: will ' + it.verbo + '.';
  const reglaTiempo = (it, t) => t === 'pasado' ? reglaPasado(it) : t === 'presente' ? reglaPresente(it) : reglaFuturo(it);
  function explicaTiempo(it, t) {
    if (t === 'futuro') return 'Está en futuro: «will ' + it.verbo + '» = will + verbo base.';
    if (t === 'presente') return it.tema === 'to be' ? 'Está en presente: «' + it.presente + '» es presente de to be.' : 'Está en presente: «' + it.presente + '», sin will y sin pasado.';
    if (it.tema === 'to be') return 'Está en pasado: «' + it.pasado + '» es el pasado de to be.';
    return it.tema === 'regular' ? 'Está en pasado: «' + it.pasado + '» termina en -ed.' : 'Está en pasado: «' + it.pasado + '» es el pasado de ' + it.verbo + '.';
  }
  function falloConvertir(it, t) {
    if (t === 'pasado') return it.tema === 'to be' ? 'Was / were' : it.tema === 'irregular' ? 'Pasado irregular' : 'Pasado regular (-ed)';
    if (t === 'presente') return it.tema === 'to be' ? 'Am / is / are' : esP3(it) ? 'Presente con he / she / it (-s)' : 'Presente con I / you / we / they';
    return it.tema === 'to be' ? 'Futuro: will be' : 'Futuro con will';
  }
  // Tiempo que se muestra y tiempo al que hay que cambiarla (distintos).
  function parTiempos(rnd) {
    const r = rnd || Math.random;
    const origen = TIEMPOS[Math.floor(r() * 3)];
    const otros = TIEMPOS.filter(t => t !== origen);
    return { origen, destino: otros[Math.floor(r() * 2)] };
  }
  // Paso 0: ¿en qué tiempo está? · Paso 1: cámbiala a <destino>.
  function preguntaTiempos(it, paso, par, rnd) {
    const f = formas(it);
    if (paso === 0) {
      const ex = explicaTiempo(it, par.origen);
      return { big: '⏳', q: f[par.origen], sub: '¿En qué tiempo está?', opciones: OPC_TIEMPO.slice(), correcta: TIEMPOS.indexOf(par.origen), explicacion: ex, dato: ex, fallo: 'Reconocer el ' + par.origen };
    }
    const regla = reglaTiempo(it, par.destino);
    return conOpciones({ big: EMOJI_T[par.destino], q: f[par.origen], sub: 'Cámbiala a ' + EMOJI_T[par.destino] + ' ' + par.destino.toUpperCase(), explicacion: 'Es: ' + f[par.destino] + ' · 📌 ' + regla, dato: regla, fallo: falloConvertir(it, par.destino) },
      f[par.destino], [f[par.origen], trampa(it, par.destino)], rnd);
  }
  // n preguntas (dos por oración) para una partida.
  function preguntasTiempos(d, n, rnd) {
    const lista = [];
    for (const it of mezclar(d.tiempos, rnd).slice(0, Math.ceil(n / 2))) {
      const par = parTiempos(rnd);
      lista.push(preguntaTiempos(it, 0, par, rnd), preguntaTiempos(it, 1, par, rnd));
    }
    return lista.slice(0, n);
  }

  // ---------- Resumen de fallos ----------
  // conteo: { etiqueta: veces } → las 3 con más fallos.
  function masFallos(conteo, max) {
    return Object.entries(conteo || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max || 3);
  }

  g.InglesGramatica = {
    TEMAS, GRUPOS, temaValido, nombreTema, filtrar, reglaOrden, preguntaFrase, preguntaEn, preguntasFrasesPartida,
    formas, trampa, reglaTiempo, parTiempos, preguntaTiempos, preguntasTiempos, masFallos,
  };

  // ---------- Pantallas (usan los helpers de juegos.html) ----------
  const htmlFallos = (conteo, escapar) => {
    const top = masFallos(conteo);
    return top.length ? '🧠 Lo que más se te complicó: ' + top.map(e => '<b>' + escapar(e[0]) + '</b> (' + e[1] + ')').join(' · ') : '🎯 ¡Sin errores!';
  };

  // Selector de tema de 🧩 Completa y responde y 🔀 Ordena la oración.
  g.elegirTemaIngles = function (id) {
    marco(id, { menu: true });
    const j = juegoPorId(id);
    const m = document.getElementById('m-body');
    m.innerHTML = '<div class="q-card"><div class="big">' + j.emoji + '</div><div class="q">Elige el tema</div><div class="sub">Practica lo que vimos en clase</div></div>' +
      '<div class="opts una-col">' + TEMAS.map(t => '<button class="opt" data-tema="' + t.id + '">' + t.emoji + ' ' + escapeHtml(t.t) +
        '<small class="muted" style="display:block;font-weight:600;font-size:.78rem">' + escapeHtml(t.d) + '</small></button>').join('') + '</div>';
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-tema]');
      if (!b) return;
      const fallo = err => { app.innerHTML = '<div class="alert">No se pudo cargar el juego (' + escapeHtml(err.message) + ').</div>'; };
      if (id === 'en-ordena') jugarOrdena('en', b.dataset.tema).catch(fallo);
      else g.jugarFrasesTema(b.dataset.tema).catch(fallo);
    });
  };

  // 🧩 Completa y responde con tema: alterna frase y pregunta (si el tema no tiene preguntas, solo frases).
  g.jugarFrasesTema = async function (tema) {
    tema = temaValido(tema);
    const d = await datos('ingles');
    const frases = barajar(filtrar(d.verbos, tema)), preguntas = barajar(filtrar(d.preguntas, tema));
    const fallos = {};
    quiz({
      id: 'en-frases', modo: 'reloj', segundos: 90, foto: { tema },
      alResponder: (p, bien) => { if (!bien) fallos[p.fallo] = (fallos[p.fallo] || 0) + 1; },
      detalle: () => 'Tema: <b>' + escapeHtml(nombreTema(tema)) + '</b><br>' + htmlFallos(fallos, escapeHtml),
      siguiente: n => preguntas.length && n % 2 ? preguntaEn(preguntas[(n >> 1) % preguntas.length]) : preguntaFrase(frases[(preguntas.length ? n >> 1 : n) % frases.length]),
    });
  };

  // ⏳ Máquina del tiempo en solitario: 90 s contra reloj, dos pasos por oración.
  g.jugarTiempos = async function () {
    const d = await datos('ingles');
    const previo = typeof reanudacion !== 'undefined' && reanudacion && reanudacion.juego === 'en-tiempos' ? reanudacion : null;
    const pool = barajar(d.tiempos);
    const foto = { fallos: Object.assign({}, previo && previo.fallos && typeof previo.fallos === 'object' ? previo.fallos : {}) };
    for (const k of Object.keys(foto.fallos)) if (typeof foto.fallos[k] !== 'number' || k.length > 60) delete foto.fallos[k];
    let par = null;
    quiz({
      id: 'en-tiempos', modo: 'reloj', segundos: 90, foto,
      alResponder: (p, bien) => { if (!bien) foto.fallos[p.fallo] = (foto.fallos[p.fallo] || 0) + 1; },
      detalle: () => htmlFallos(foto.fallos, escapeHtml),
      siguiente: n => {
        const it = pool[(n >> 1) % pool.length];
        if (n % 2 === 0 || !par) par = parTiempos();
        return preguntaTiempos(it, n % 2, par);
      },
    });
  };

  // Final de una partida de preguntas de gramática: lo que más falló (respuestas propias).
  g.resumenFallosSala = function (sala, total) {
    const e = sala.estado; if (!e || !['en-tiempos', 'en-frases'].includes(e.sala.juego) || !Array.isArray(sala.contenido)) return '';
    const mias = (e.jugadores.find(x => x.id === e.yo) || {}).respuestas || {};
    const conteo = {};
    for (let q = 0; q < total; q++) {
      const r = mias[q] || (sala.mias && sala.mias[q]); const p = sala.contenido[q];
      if (p && p.fallo && !(r && r.correcta)) conteo[p.fallo] = (conteo[p.fallo] || 0) + 1;
    }
    return '<div class="card" id="p-fallos" style="margin-top:12px">' + htmlFallos(conteo, escapeHtml) + '</div>';
  };
})(globalThis);
