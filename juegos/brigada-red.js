// Netcode de «🦎 Brigada Xalli» en vivo, hasta 8 personas (openspec: brigada-xalli, design.md §11). Sin DOM: lo usan
// juegos/brigada.html y las pruebas de Deno (server/brigada_red_test.ts). Depende de juegos/brigada-motor.js.
//   - El anfitrión (quien creó la sala) simula a 60 Hz enemigos, proyectiles, jefe y a todos los personajes (su
//     entrada, la de cada invitado y la IA de los compañeros y de quien se desconecta), y manda una foto (`bx:foto`) a
//     12 Hz: posiciones en px enteros, a lo más 24 enemigos y 16 proyectiles (los más cercanos a la ventana) y lo lento
//     (puntos, munición, objetos y vehículos) solo cuando cambia o cada segundo.
//   - Cada invitado manda su entrada (`bx:entrada`) a 12 Hz (10 Hz con más de 4 personas) con contadores de presiones,
//     predice solo su personaje con la misma física y lo reconcilia con la foto; a los demás y a los enemigos los
//     interpola por id con 100 ms de retraso. Sus disparos son cosméticos: los golpes los resuelve el anfitrión.
// El canal es el de EnVivo.conectar o cualquier objeto con la misma API: enviar, enviarYa?, al, alDesconectar?.
(function (raiz) {
  'use strict';
  const HZ_FOTO = 12, RETRASO_MS = 100, EVENTOS_FOTOS = 3, LENTO_MS = 1000;
  const SILENCIO_MS = 3000, DESCONEXION_MS = 15000, CORRECCION = 0.25, SALTO = 40, LENTO_MIN_MS = 250;
  const MAX_ENEMIGOS = 24, MAX_BALAS = 16, MAX_AVISOS = 6, MAX_EVENTOS = 12;
  const hzEntrada = personas => (personas > 4 ? 10 : 12);
  const ESTADOS = ['intro', 'juego', 'jefe', 'victoria', 'cumplida', 'fallida', 'reintentando'];
  const ARMAS = ['burbuja', 'rafaga', 'abanico', 'laser', 'canon'];
  const BALAS_E = ['tuerca', 'bola', 'gota', 'baba', 'engrane', 'roca', 'pinza', 'orbe', 'caja', 'onda', 'gancho', 'rayo', 'columna', 'erupcion'];
  const ALTO_RECT = { onda: 12, gancho: 12, rayo: 12, columna: 240, erupcion: 60 };
  const RADIO = { engrane: 7, roca: 6, orbe: 6, caja: 9 };
  const FASES = ['entrada', 'pausa', 'engranes', 'rocas', 'embestida', 'saltabots', 'polvo', 'pinzas', 'cola', 'excavar', 'cajas', 'gancho', 'tuercas', 'lluvia', 'triple', 'minibots', 'aliens', 'columnas', 'orbes', 'espiral'];
  const AVISOS = ['sombra', 'polvo', 'columna', 'rayo'];
  const OBJETOS = ['rafaga', 'abanico', 'laser', 'globos', 'escudo', 'corazon', 'estrella'];
  const ESTADOS_J = ['vivo', 'caido', 'burbuja'];
  // Eventos que viajan en la foto (sonidos, efectos y avisos en los invitados).
  const EVENTOS_RED = new Set(['boom', 'rescate', 'globo', 'jefe', 'jefeFin', 'checkpoint', 'caida', 'burbuja', 'revive', 'liga', 'cumplida', 'fallida',
    'reintento', 'objeto', 'herido', 'arranque', 'vehiculo', 'desconexion', 'regreso', 'escudo', 'bloqueo']);
  const LISTA_EVENTOS = [...EVENTOS_RED];
  const ANIMALES = ['ajolotito', 'xolito', 'guacamaya', 'tortuguita', 'conejito', 'colibri'];
  const TIPOS_ENEMIGO = ['patrulla', 'dron', 'torreta', 'saltabot', 'escudobot', 'alien', 'vehiculo'];
  const TIPOS_JEFE = ['tractor', 'excavadora', 'escorpion', 'grua', 'antenon', 'torre', 'reina'];
  // Evento compacto: [n, tipo, i, x, y, aux]; aux depende del tipo (enemigo, animal, objeto, jefe + 16·mini, vidas,
  // quién revivió, punto de control o bono).
  const AUX = {
    boom: { de: e => TIPOS_ENEMIGO.indexOf(e.enemigo), a: v => ({ enemigo: TIPOS_ENEMIGO[v] }) },
    rescate: { de: e => ANIMALES.indexOf(e.animal), a: v => ({ animal: ANIMALES[v] }) },
    objeto: { de: e => OBJETOS.indexOf(e.objeto), a: v => ({ objeto: OBJETOS[v] }) },
    jefe: { de: e => TIPOS_JEFE.indexOf(e.jefe) + (e.mini ? 16 : 0), a: v => ({ jefe: TIPOS_JEFE[v % 16], mini: v >= 16 }) },
    caida: { de: e => e.vidas, a: v => ({ vidas: v }) },
    revive: { de: e => e.por, a: v => ({ por: v }) },
    checkpoint: { de: e => e.k, a: v => ({ k: v }) },
    cumplida: { de: e => e.bono, a: v => ({ bono: v }) },
  };
  AUX.jefeFin = AUX.jefe;
  function eventoRed(e, n) {
    const aux = AUX[e.tipo] ? AUX[e.tipo].de(e) : 0;
    return [n, LISTA_EVENTOS.indexOf(e.tipo), e.i ?? -1, Math.round(e.x || 0), Math.round(e.y || 0), Math.round(Number(aux) || 0)];
  }
  function eventoDeRed(a) {
    const tipo = LISTA_EVENTOS[a[1]];
    return { n: a[0], tipo, i: a[2], x: a[3], y: a[4], ...(AUX[tipo] ? AUX[tipo].a(a[5]) : {}) };
  }
  const r = Math.round;
  const num = x => Math.trunc(Number(x) || 0);
  const idx = (lista, v) => Math.max(0, lista.indexOf(v));

  // ================= Foto (anfitrión → invitados) =================
  // Personaje: [x, y, vx·10, vy·10, banderas, apuntado + 8·arma, corazones + 4·vidas, vehículo + 1]
  function jugadorFoto(p) {
    const f = (p.suelo ? 1 : 0) | (p.agachado ? 2 : 0) | (p.dir > 0 ? 4 : 0) | (p.dispT < 0.12 ? 8 : 0) | (p.inv > 0 ? 16 : 0) |
      (idx(ESTADOS_J, p.estado) << 5) | (p.escudo > 0 ? 128 : 0);
    const arma = p.vehiculo >= 0 ? 'canon' : p.arma;
    return [r(p.x), r(p.y), r(p.vx * 10), r(p.vy * 10), f, p.aim + 8 * idx(ARMAS, arma), Math.max(0, p.cor) + 4 * Math.max(0, p.vidas), p.vehiculo + 1];
  }
  // Los n más cercanos al centro de la ventana.
  function cercanos(lista, cx, n) {
    const vivos = lista.filter(x => x.vivo);
    if (vivos.length <= n) return vivos;
    return vivos.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx)).slice(0, n);
  }
  function jefeFoto(M, j) {
    if (!j) return 0;
    const f = (j.oculto ? 1 : 0) | (j.aviso ? 2 : 0) | (j.golpeT > 0 ? 4 : 0) | (j.mini ? 8 : 0) | (j.invul ? 16 : 0);
    return [idx(Object.keys(M.JEFES), j.tipo), r(j.x), r(j.y), Math.max(0, r(j.hp)), r(j.hpMax), idx(FASES, j.fase), f, r(j.arena)];
  }
  // Lo lento: puntos, robots, rescates, munición y globos por personaje; objetos y vehículos.
  function lentoFoto(M, m) {
    return {
      s: m.jugadores.map(p => [p.puntos, p.robots, p.rescates, p.mun.rafaga, p.mun.abanico, p.mun.laser, p.globos]),
      o: m.objetos.filter(o => o.vivo).map(o => [o.id, idx(OBJETOS, o.tipo), r(o.x), r(o.y), o.flota ? 1 : 0]),
      v: m.vehiculos.map(v => [r(v.x), r(v.y), v.hp, v.ocupante, v.vivo ? 1 : 0]),
    };
  }
  function foto(M, m, extra) {
    const cx = m.cam.x + M.W / 2;
    const f = {
      q: extra.q, t: r(extra.t), e: idx(ESTADOS, m.estado), c: r(m.cam.x * 10) / 10, k: m.cp, ri: m.reintentos,
      j: m.jugadores.flatMap(jugadorFoto),
      n: cercanos(m.enemigos, cx, MAX_ENEMIGOS).flatMap(e => [e.id, idx(Object.keys(M.ENEMIGOS), e.tipo), r(e.x), r(e.y),
        (e.dir > 0 ? 1 : 0) | (e.golpeT > 0 ? 2 : 0) | (e.carga ? 4 : 0) | (e.suelo ? 8 : 0)]),
      p: cercanos(m.balasE.filter(b => !(b.retraso > 0)), cx, MAX_BALAS).flatMap(b => [b.id, idx(BALAS_E, b.tipo), r(b.x), r(b.y), r(b.w || 0)]),
      b: jefeFoto(M, m.jefe),
      av: m.avisos.filter(a => a.vivo).slice(0, MAX_AVISOS).flatMap(a => [idx(AVISOS, a.tipo), r(a.x), r(a.y), r(a.w), r(a.t * 10), r(a.total * 10)]),
      r: m.jaulas.reduce((s, j, k) => s + (j.abierta ? 2 ** k : 0), 0),
      a: (extra.a || []).slice(), ia: num(extra.ia),
    };
    if (extra.lento) f.l = extra.lento;
    if (extra.ev && extra.ev.length) f.ev = extra.ev;
    return f;
  }
  // Foto válida para esta misión o null.
  function leerFoto(f, n) {
    if (!f || !Array.isArray(f.j) || f.j.length !== 8 * n || !Array.isArray(f.n) || f.n.length % 5 || !Array.isArray(f.p) || f.p.length % 5) return null;
    return f;
  }

  // ================= Entrada (invitado → anfitrión) =================
  // m: A (1) y B (2) mantenidos; na, nx, ny: presiones de A, X e Y (mod 64), así un toque no se pierde.
  function empacarEntrada(ent, s, cont) {
    const e = ent || {};
    return {
      s, x: r(Math.max(-1, Math.min(1, Number(e.x) || 0)) * 100), y: r(Math.max(-1, Math.min(1, Number(e.y) || 0)) * 100),
      m: (e.a ? 1 : 0) | (e.b ? 2 : 0) | (e.c4 ? 4 : 0), na: cont.na & 63, nx: cont.nx & 63, ny: cont.ny & 63,
    };
  }
  function leerEntrada(m) {
    const b = num(m && m.m);
    return { x: Math.max(-1, Math.min(1, num(m && m.x) / 100)), y: Math.max(-1, Math.min(1, num(m && m.y) / 100)), a: !!(b & 1), b: !!(b & 2), c4: !!(b & 4),
      na: num(m && m.na) & 63, nx: num(m && m.nx) & 63, ny: num(m && m.ny) & 63 };
  }
  const presiones = (antes, ahora) => (ahora - antes + 64) % 64;
  // Entrada de la página con todos los campos (números y banderas).
  function normalizar(ent) {
    const e = ent || {};
    return { x: Number(e.x) || 0, y: Number(e.y) || 0, a: !!e.a, b: !!e.b, c4: !!e.c4, ga: !!e.ga, gx: !!e.gx, gy: !!e.gy };
  }

  // ================= Anfitrión =================
  // cfg: { canal, m, M, ids: [id de la persona de cada personaje o null si es IA], yo, ahora() ms }
  function anfitrion(cfg) {
    const { canal, m, M, ids, yo } = cfg, ahora = cfg.ahora, n = m.jugadores.length;
    const st = {
      ent: new Array(n).fill(null), s: new Array(n).fill(-1), cont: ids.map(() => null), pend: ids.map(() => ({ ga: false, gx: false, gy: false })),
      ultimo: new Array(n).fill(ahora()), ia: new Set(), q: 0, ultimoEnvio: -Infinity, ultimoLento: -Infinity, lentoClave: '', eventos: [], nEv: 0, t0: ahora(), ultimaFoto: null, bytes: [],
    };
    const persona = i => i !== yo && !!ids[i];
    const locales = [];
    const evento = e => { if (EVENTOS_RED.has(e.tipo)) st.eventos.push({ q: st.q + 1, a: eventoRed(e, ++st.nEv) }); };
    function caer(i) {
      if (!persona(i) || st.ia.has(i)) return;
      st.ia.add(i); st.ent[i] = null;
      const e = { tipo: 'desconexion', i };
      evento(e); locales.push(e);
    }
    canal.al('bx:entrada', (msg, meta) => {
      const i = meta && meta.de !== undefined ? ids.indexOf(meta.de) : -1;
      if (i < 0 || !persona(i)) return;
      st.ultimo[i] = ahora();
      if (st.ia.has(i)) { st.ia.delete(i); const e = { tipo: 'regreso', i }; evento(e); locales.push(e); }
      if (!msg || !(msg.s > st.s[i])) return;
      st.s[i] = msg.s;
      const e = leerEntrada(msg), antes = st.cont[i];
      if (antes) {
        if (presiones(antes.na, e.na)) st.pend[i].ga = true;
        if (presiones(antes.nx, e.nx)) st.pend[i].gx = true;
        if (presiones(antes.ny, e.ny)) st.pend[i].gy = true;
      } else if (e.a) st.pend[i].ga = true;
      st.cont[i] = e; st.ent[i] = e;
    });
    if (canal.alDesconectar) canal.alDesconectar(id => { const i = ids.indexOf(id); if (i >= 0) caer(i); });
    function entradaDe(i, local) {
      if (i === yo) return local;
      if (!persona(i) || st.ia.has(i) || !st.ent[i]) return M.ia(m, i);
      const e = st.ent[i], p = st.pend[i], x = { x: e.x, y: e.y, a: e.a, b: e.b, c4: e.c4, ga: p.ga, gx: p.gx, gy: p.gy };
      p.ga = false; p.gx = false; p.gy = false;
      return x;
    }
    // Lo lento (puntos, munición, objetos y vehículos) en su propio mensaje: al cambiar (cada 250 ms a lo más) o cada 1 s.
    function lentoSiToca(t, forzar) {
      if (!forzar && t - st.ultimoLento < LENTO_MIN_MS) return;
      const l = lentoFoto(M, m), clave = JSON.stringify(l);
      if (!forzar && clave === st.lentoClave && t - st.ultimoLento < LENTO_MS) return;
      st.lentoClave = clave; st.ultimoLento = t;
      if (canal.enviarYa) canal.enviarYa('bx:lento', l); else canal.enviar('bx:lento', l);
    }
    return {
      st, m,
      paso(local) {
        const ev = M.paso(m, m.jugadores.map((_, i) => entradaDe(i, local)));
        for (const e of ev) evento(e);
        return locales.length ? ev.concat(locales.splice(0)) : ev;
      },
      enviarSiToca(forzar) {
        const t = ahora();
        for (let i = 0; i < n; i++) if (persona(i) && !st.ia.has(i) && t - st.ultimo[i] >= SILENCIO_MS) caer(i);
        if (!forzar && t - st.ultimoEnvio < 1000 / HZ_FOTO - 1) return null;
        st.ultimoEnvio = t; st.q++;
        st.eventos = st.eventos.filter(e => e.q > st.q - EVENTOS_FOTOS).slice(-MAX_EVENTOS);
        let mask = 0;
        for (let i = 0; i < n; i++) if (!ids[i] || st.ia.has(i)) mask |= 1 << i;
        lentoSiToca(t, forzar);
        const f = foto(M, m, { q: st.q, t: t - st.t0, a: st.s.map(x => Math.max(0, x)), ia: mask, ev: st.eventos.map(e => e.a) });
        st.ultimaFoto = f;
        st.bytes.push(JSON.stringify(f).length);
        if (st.bytes.length > 600) st.bytes.shift();
        if (forzar && canal.enviarYa) canal.enviarYa('bx:foto', f); else canal.enviar('bx:foto', f);
        return f;
      },
      caidos: () => [...st.ia].sort((a, b) => a - b),
    };
  }

  // ================= Invitado =================
  // cfg: { canal, m (misión «sombra» que solo se dibuja), M, anfitrion (id), yo, ahora() ms, hz }
  function invitado(cfg) {
    const { canal, m, M, yo } = cfg, ahora = cfg.ahora, hz = cfg.hz || 12, n = m.jugadores.length;
    const TIPOS_E = Object.keys(M.ENEMIGOS), TIPOS_J = Object.keys(M.JEFES);
    const st = { s: 0, cont: { na: 0, nx: 0, ny: 0 }, aPrev: false, ultimoEnvio: -Infinity, junto: null, fotos: [], ultima: null, recibidas: 0, ultimoMsg: ahora(), caido: null,
      vistos: new Set(), pendientes: [], ultimoPaso: ahora(), lento: null };
    const pred = { pend: [], ex: 0, lista: false };
    function reconciliar(f) {
      if (cfg.espectador) { m.cam.x = f.c; return; } // espectador (openspec: espectador-partidas): sin jugador propio; solo la cámara compartida
      const p = m.jugadores[yo], k = 8 * yo, j = f.j;
      if (!j || ((j[k + 4] >> 5) & 3) !== 0) { pred.lista = false; pred.pend = []; return; }
      pred.pend = pred.pend.filter(x => x.s > (f.a[yo] || 0));
      const antes = pred.lista ? { x: p.x } : null;
      Object.assign(p, { x: j[k], y: j[k + 1], vx: j[k + 2] / 10, vy: j[k + 3] / 10, suelo: !!(j[k + 4] & 1), plat: -1, estado: 'vivo', vehiculo: j[k + 7] - 1 });
      m.cam.x = f.c;
      for (const x of pred.pend) M.predecir(m, yo, x.ent, x.dt, false);
      pred.lista = true;
      // Corrección suave en x: se arranca donde se veía y se acerca 25 % por cuadro; un salto grande se corrige de golpe.
      const dx = antes ? antes.x - p.x : 0;
      pred.ex = antes && Math.abs(dx) < SALTO ? dx : 0;
      p.x += pred.ex;
    }
    canal.al('bx:foto', (f0, meta) => {
      if (meta && meta.de !== undefined && meta.de !== cfg.anfitrion) return;
      const f = leerFoto(f0, n);
      if (!f) return;
      st.ultimoMsg = ahora(); st.caido = null; st.recibidas++;
      const t = ahora() - (meta && Number.isFinite(meta.edad) ? Math.max(0, meta.edad) : 0);
      for (const a of f.ev || []) if (Array.isArray(a) && !st.vistos.has(a[0])) { st.vistos.add(a[0]); st.pendientes.push({ ...eventoDeRed(a), t }); }
      if (st.ultima && f.q <= st.ultima.q) return;
      st.fotos.push({ t, f });
      if (st.fotos.length > 8) st.fotos.shift();
      st.ultima = f;
      reconciliar(f);
    });
    canal.al('bx:lento', (l, meta) => {
      if (meta && meta.de !== undefined && meta.de !== cfg.anfitrion) return;
      if (l && Array.isArray(l.s) && Array.isArray(l.o) && Array.isArray(l.v)) st.lento = l;
    });
    if (canal.alDesconectar) canal.alDesconectar(id => { if (id === cfg.anfitrion && st.caido === null) st.caido = ahora(); });

    // Dos fotos alrededor del tiempo dibujado y la fracción entre ellas.
    function marco(tR) {
      const fs = st.fotos;
      if (fs.length === 1 || tR <= fs[0].t) return { a: fs[0].f, b: fs[0].f, u: 0 };
      for (let k = fs.length - 1; k > 0; k--) if (tR >= fs[k - 1].t && tR <= fs[k].t) return { a: fs[k - 1].f, b: fs[k].f, u: (tR - fs[k - 1].t) / Math.max(1, fs[k].t - fs[k - 1].t) };
      const b = fs.at(-1).f;
      return { a: b, b, u: 0 };
    }
    // Entidades por id: posición interpolada entre las dos fotos (si solo está en la nueva, la nueva).
    function porId(lista, paso) {
      const mapa = new Map();
      for (let k = 0; k < lista.length; k += paso) mapa.set(lista[k], k);
      return mapa;
    }
    const mezcla = (a, b, u) => a + (b - a) * u;
    function aplicarJugadores(fa, fb, u) {
      m.jugadores.forEach((p, i) => {
        const k = 8 * i, j = fb.j, ja = fa.j, f = j[k + 4];
        Object.assign(p, {
          estado: ESTADOS_J[(f >> 5) & 3] || 'vivo', agachado: !!(f & 2), escudo: f & 128 ? 1 : 0, inv: f & 16 ? 0.5 : 0, vehiculo: j[k + 7] - 1,
          cor: j[k + 6] % 4, vidas: Math.floor(j[k + 6] / 4),
        });
        const arma = ARMAS[Math.floor(j[k + 5] / 8)] || 'burbuja';
        if (arma !== 'canon') p.arma = arma;
        if (i === yo && pred.lista && p.estado === 'vivo') return;
        Object.assign(p, { x: mezcla(ja[k], j[k], u), y: mezcla(ja[k + 1], j[k + 1], u), vx: j[k + 2] / 10, vy: j[k + 3] / 10, suelo: !!(f & 1), dir: f & 4 ? 1 : -1, aim: j[k + 5] % 8 });
        if (f & 8) p.dispT = 0; else p.dispT += 1 / 60;
        if (p.estado === 'caido') p.estT = 0.5;
      });
    }
    function aplicarEnemigos(fa, fb, u) {
      const antes = porId(fa.n, 5);
      let k = 0;
      for (let q = 0; q < fb.n.length; q += 5, k++) {
        const e = m.enemigos[k], id = fb.n[q], a = antes.get(id), fl = fb.n[q + 4];
        Object.assign(e, { vivo: true, id, tipo: TIPOS_E[fb.n[q + 1]] || 'patrulla', x: a === undefined ? fb.n[q + 2] : mezcla(fa.n[a + 2], fb.n[q + 2], u),
          y: a === undefined ? fb.n[q + 3] : mezcla(fa.n[a + 3], fb.n[q + 3], u), dir: fl & 1 ? 1 : -1, golpeT: fl & 2 ? 0.05 : 0, carga: !!(fl & 4), suelo: !!(fl & 8) });
      }
      for (; k < m.enemigos.length; k++) m.enemigos[k].vivo = false;
    }
    function aplicarBalas(fa, fb, u) {
      const antes = porId(fa.p, 5);
      let k = 0;
      for (let q = 0; q < fb.p.length; q += 5, k++) {
        const b = m.balasE[k], id = fb.p[q], a = antes.get(id), tipo = BALAS_E[fb.p[q + 1]] || 'tuerca', w = fb.p[q + 4];
        Object.assign(b, { vivo: true, id, tipo, x: a === undefined ? fb.p[q + 2] : mezcla(fa.p[a + 2], fb.p[q + 2], u), y: a === undefined ? fb.p[q + 3] : mezcla(fa.p[a + 3], fb.p[q + 3], u),
          w, h: w ? ALTO_RECT[tipo] || 12 : 0, r: RADIO[tipo] || 4, retraso: 0 });
      }
      for (; k < m.balasE.length; k++) m.balasE[k].vivo = false;
    }
    function aplicarJefe(fa, fb, u) {
      const b = fb.b;
      if (!b) { m.jefe = null; return; }
      const tipo = TIPOS_J[b[0]], d = M.JEFES[tipo], a = fa.b && fa.b[0] === b[0] ? fa.b : b;
      m.jefe = Object.assign(m.jefe && m.jefe.tipo === tipo ? m.jefe : {}, {
        tipo, w: d.w, h: d.h, x: mezcla(a[1], b[1], u), y: mezcla(a[2], b[2], u), hp: b[3], hpMax: b[4], fase: FASES[b[5]] || 'pausa',
        oculto: !!(b[6] & 1), aviso: !!(b[6] & 2), golpeT: b[6] & 4 ? 0.05 : 0, mini: !!(b[6] & 8), invul: !!(b[6] & 16), arena: b[7],
      });
    }
    function aplicarResto(f) {
      m.estado = ESTADOS[f.e] || 'juego'; m.cp = f.k; m.reintentos = f.ri;
      m.jaulas.forEach((j, k) => { j.abierta = Math.floor(f.r / 2 ** k) % 2 === 1; });
      let k = 0;
      for (let q = 0; q < f.av.length; q += 6, k++) Object.assign(m.avisos[k], { vivo: true, tipo: AVISOS[f.av[q]], x: f.av[q + 1], y: f.av[q + 2], w: f.av[q + 3], t: f.av[q + 4] / 10, total: Math.max(0.1, f.av[q + 5] / 10) });
      for (; k < m.avisos.length; k++) m.avisos[k].vivo = false;
      if (st.lento) aplicarLento(st.lento);
    }
    function aplicarLento(l) {
      l.s.forEach((s, i) => { const p = m.jugadores[i]; if (p) Object.assign(p, { puntos: s[0], robots: s[1], rescates: s[2], globos: s[6] }, { mun: { rafaga: s[3], abanico: s[4], laser: s[5] } }); });
      let k = 0;
      for (const o of l.o.slice(0, m.objetos.length)) Object.assign(m.objetos[k++], { vivo: true, id: o[0], tipo: OBJETOS[o[1]], x: o[2], y: o[3], flota: !!o[4], t: 0 });
      for (; k < m.objetos.length; k++) m.objetos[k].vivo = false;
      l.v.forEach((v, i) => { if (m.vehiculos[i]) Object.assign(m.vehiculos[i], { x: v[0], y: v[1], hp: v[2], ocupante: v[3], vivo: !!v[4] }); });
    }
    function eventosListos(tR) {
      const ev = [];
      st.pendientes = st.pendientes.filter(e => {
        if (e.t > tR) return true;
        ev.push(e);
        return false;
      });
      if (st.vistos.size > 2000) st.vistos = new Set([...st.vistos].slice(-500));
      return ev;
    }
    // Disparos de los demás (cosméticos): burbujas al ritmo de su arma mientras su bandera dice que disparan.
    function disparosAjenos(dt) {
      m.jugadores.forEach((p, i) => {
        if ((i === yo && !cfg.espectador) || p.estado !== 'vivo' || p.dispT > 0.05) return; // espectador: ve los disparos de todos
        p.cad = (p.cad || 0) - dt;
        if (p.cad > 0) return;
        p.cad = 0;
        M.disparar(m, p); // con su arma (o el cañón si va en el Armadillo); el evento no se usa aquí
        m.ev.length = 0;
      });
    }
    return {
      st, pred,
      // Junta la entrada de este cuadro, predice y manda a `hz`.
      entrada(ent) {
        if (cfg.espectador) return null; // espectador: no manda entrada
        const t = ahora(), dt = Math.min(0.1, Math.max(0, (t - st.ultimoPaso) / 1000)); st.ultimoPaso = t;
        const e = normalizar(ent);
        if (e.ga) st.cont.na = (st.cont.na + 1) & 63;
        if (e.gx) st.cont.nx = (st.cont.nx + 1) & 63;
        if (e.gy) st.cont.ny = (st.cont.ny + 1) & 63;
        if (pred.lista && st.ultima && dt > 0) {
          M.predecir(m, yo, e, dt, true);
          pred.pend.push({ s: st.s + 1, ent: { ...e, gx: false, gy: false }, dt });
          if (pred.pend.length > 240) pred.pend.shift();
        }
        st.junto = e;
        if (t - st.ultimoEnvio < 1000 / hz - 1) return null;
        st.ultimoEnvio = t; st.s++;
        const msg = empacarEntrada(e, st.s, st.cont);
        canal.enviar('bx:entrada', msg);
        return msg;
      },
      // Deja en `m` lo que hay que dibujar y devuelve { estado, eventos } (null sin fotos).
      dibujar(dt) {
        const t = ahora();
        if (st.caido === null && st.recibidas && t - st.ultimoMsg >= SILENCIO_MS) st.caido = t;
        if (!st.ultima) return null;
        const tR = t - RETRASO_MS, { a, b, u } = marco(tR);
        m.cam.x = Math.max(m.cam.x, mezcla(a.c, b.c, u));
        aplicarJugadores(a, b, u); aplicarEnemigos(a, b, u); aplicarBalas(a, b, u); aplicarJefe(a, b, u); aplicarResto(st.ultima);
        const p = m.jugadores[yo];
        if (pred.lista && p.estado === 'vivo' && pred.ex) { const d = pred.ex * CORRECCION; p.x -= d; pred.ex -= d; }
        disparosAjenos(dt || 1 / 60);
        M.balasCosmeticas(m, dt || 1 / 60);
        return { estado: m.estado, eventos: eventosListos(tR) };
      },
      anfitrionCaido: () => st.caido,
      cerrarPorCaida: () => st.caido !== null && ahora() - st.caido >= DESCONEXION_MS,
      ultimaFoto: () => st.ultima,
    };
  }

  raiz.BrigadaRed = { eventoRed, eventoDeRed, lentoFoto, HZ_FOTO, RETRASO_MS, SILENCIO_MS, DESCONEXION_MS, MAX_ENEMIGOS, MAX_BALAS, EVENTOS_RED, ESTADOS, hzEntrada, foto, leerFoto, empacarEntrada, leerEntrada, presiones, anfitrion, invitado };
})(typeof window !== 'undefined' ? window : globalThis);
