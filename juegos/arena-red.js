// Netcode de «⚽ Futbolito Arena» en vivo (openspec: futbolito-arena, design.md §7). Sin DOM: lo usan
// juegos/futbolito-arena.html y las pruebas de Deno (server/arena_red_test.ts). Depende de juegos/arena-motor.js
// (ArenaMotor) y de juegos/en-vivo.js (EnVivo.interpolador).
//   - El anfitrión (quien creó la sala) simula a 60 Hz con su entrada, la de cada invitado y la IA (bots y quien se
//     desconecta), y manda una foto cuantizada (`fa:foto`) a 15 Hz.
//   - Cada invitado manda su entrada (`fa:entrada`) a 15 Hz (12 Hz con más de 4 personas), interpola a los demás con
//     100 ms de retraso y predice solo su robot (reconciliación con la foto).
// El canal es el de EnVivo.conectar o cualquier objeto con la misma API: enviar, enviarYa?, al, alDesconectar?.
(function (raiz) {
  'use strict';
  const ESTADOS = ['saque', 'juego', 'gol', 'fin'];
  const Q_POS = 20, Q_VEL = 10, PASOS_DIR = 64;
  const HZ_FOTO = 15, RETRASO_MS = 100, EXTRAPOLA_MS = 100, EVENTOS_FOTOS = 3;
  const SILENCIO_MS = 3000, DESCONEXION_MS = 15000, CORRECCION = 0.25, SALTO = 2;
  // Eventos del motor que viajan en la foto (sonidos, avisos y Emoción en los invitados).
  const EVENTOS_RED = new Set(['gol', 'saque', 'arranque', 'oro', 'fin', 'patada', 'poste', 'barrida', 'desconexion', 'regreso']);
  const DOS_PI = 2 * Math.PI;
  const hzEntrada = personas => (personas > 4 ? 12 : 15);

  const r = (v, q) => Math.round(v * q);
  const acotar = (v, a, b) => Math.min(b, Math.max(a, v));
  const dirIndice = (fx, fy) => ((Math.round(Math.atan2(fy, fx) * PASOS_DIR / DOS_PI) % PASOS_DIR) + PASOS_DIR) % PASOS_DIR;

  // ================= Foto (anfitrión → invitados) =================
  // extra: { q, t (ms del anfitrión), a: [último seq aplicado por robot], ia: máscara de robots con IA, ev }
  function foto(p, extra) {
    const b = p.balon, j = [];
    for (const x of p.robots) {
      const flags = (x.dashT > 0 ? 1 : 0) | (x.giroT > 0 ? 2 : 0) | (x.recA <= 0 ? 4 : 0) | (x.recB <= 0 ? 8 : 0);
      j.push(r(x.x, Q_POS), r(x.y, Q_POS), r(x.vx, Q_VEL), r(x.vy, Q_VEL), dirIndice(x.fx, x.fy), flags);
    }
    const f = {
      q: extra.q, t: Math.round(extra.t), e: Math.max(0, ESTADOS.indexOf(p.estado)), r: Math.round(p.t * 10), og: p.oro ? 1 : 0,
      g: [p.goles[0], p.goles[1]], b: [r(b.x, Q_POS), r(b.y, Q_POS), r(b.vx, Q_VEL), r(b.vy, Q_VEL)], j, a: (extra.a || []).slice(), ia: extra.ia | 0,
    };
    if (p.ganador !== null && p.ganador !== undefined) f.w = p.ganador;
    if (extra.ev && extra.ev.length) f.ev = extra.ev;
    return f;
  }
  const num = x => Math.trunc(Number(x) || 0);
  function leerFoto(f) {
    if (!f || !Array.isArray(f.j) || f.j.length % 6 || !Array.isArray(f.b) || f.b.length !== 4 || !Array.isArray(f.g)) return null;
    const robots = [];
    for (let k = 0; k < f.j.length; k += 6) {
      const ang = (f.j[k + 4] % PASOS_DIR) * DOS_PI / PASOS_DIR, fl = f.j[k + 5];
      robots.push({ x: f.j[k] / Q_POS, y: f.j[k + 1] / Q_POS, vx: f.j[k + 2] / Q_VEL, vy: f.j[k + 3] / Q_VEL, ang, fx: Math.cos(ang), fy: Math.sin(ang), dash: !!(fl & 1), giro: !!(fl & 2), listaA: !!(fl & 4), listaB: !!(fl & 8) });
    }
    return {
      q: num(f.q), t: num(f.t), estado: ESTADOS[f.e] || 'juego', reloj: num(f.r) / 10, oro: f.og === 1, goles: [num(f.g[0]), num(f.g[1])],
      ganador: f.w === undefined ? null : num(f.w), balon: { x: f.b[0] / Q_POS, y: f.b[1] / Q_POS, vx: f.b[2] / Q_VEL, vy: f.b[3] / Q_VEL },
      robots, a: Array.isArray(f.a) ? f.a.map(num) : [], ia: num(f.ia), ev: Array.isArray(f.ev) ? f.ev : [],
    };
  }

  // ================= Entrada (invitado → anfitrión) =================
  // na/nb: cuántas veces se ha presionado A/B (mod 64). Si se pierde un paquete, la siguiente entrada trae la presión.
  function empacarEntrada(ent, s, na, nb) {
    return { s, x: r(acotar(Number(ent && ent.x) || 0, -1, 1), 100), y: r(acotar(Number(ent && ent.y) || 0, -1, 1), 100), m: (ent && ent.a ? 1 : 0) | (ent && ent.b ? 2 : 0), na: na & 63, nb: nb & 63 };
  }
  function leerEntrada(m) {
    const b = num(m && m.m);
    return { x: acotar(num(m && m.x) / 100, -1, 1), y: acotar(num(m && m.y) / 100, -1, 1), a: !!(b & 1), b: !!(b & 2), na: num(m && m.na) & 63, nb: num(m && m.nb) & 63 };
  }
  const presiones = (antes, ahora) => (ahora - antes + 64) % 64;

  // ================= Anfitrión =================
  // cfg: { canal, p, M, ids: [id de la persona de cada robot o null si es bot], yo (robot del anfitrión), ahora() ms,
  //        nivel (IA de bots y de quien se cae; 'medio') }
  function anfitrion(cfg) {
    const { canal, p, M, ids, yo } = cfg, ahora = cfg.ahora, nivel = cfg.nivel || 'medio';
    const n = p.robots.length;
    const st = { ent: Array(n).fill(null), s: Array(n).fill(-1), na: Array(n).fill(null), nb: Array(n).fill(null), pendA: Array(n).fill(false), pendB: Array(n).fill(false),
      ultimo: Array(n).fill(ahora()), ia: new Set(), q: 0, ultimoEnvio: -Infinity, eventos: [], nEv: 0, t0: ahora(), ultimaFoto: null };
    const persona = i => i !== yo && !!ids[i];
    const evento = (tipo, extra) => st.eventos.push({ n: ++st.nEv, q: st.q + 1, tipo, ...extra });
    function caer(i) {
      if (!persona(i) || st.ia.has(i)) return;
      st.ia.add(i); st.ent[i] = null;
      evento('desconexion', { i });
    }
    canal.al('fa:entrada', (m, meta) => {
      const i = meta && meta.de !== undefined ? ids.indexOf(meta.de) : -1;
      if (i < 0 || !persona(i)) return;
      st.ultimo[i] = ahora();
      if (st.ia.has(i)) { st.ia.delete(i); evento('regreso', { i }); }
      if (!m || !(m.s > st.s[i])) return; // viejas o repetidas
      st.s[i] = m.s;
      const e = leerEntrada(m);
      if (st.na[i] !== null && presiones(st.na[i], e.na) > 0) st.pendA[i] = true;
      if (st.nb[i] !== null && presiones(st.nb[i], e.nb) > 0) st.pendB[i] = true;
      if (st.na[i] === null && e.na > 0 && e.a) st.pendA[i] = true; // primera entrada con A presionada
      st.na[i] = e.na; st.nb[i] = e.nb; st.ent[i] = e;
    });
    if (canal.alDesconectar) canal.alDesconectar(id => { const i = ids.indexOf(id); if (i >= 0) caer(i); });
    function entradaDe(i, local) {
      if (i === yo) return local;
      if (!persona(i) || st.ia.has(i) || !st.ent[i]) return M.ia(p, i, nivel);
      const e = st.ent[i], x = { x: e.x, y: e.y, a: e.a, b: e.b, ga: st.pendA[i], gb: st.pendB[i] };
      st.pendA[i] = false; st.pendB[i] = false;
      return x;
    }
    return {
      st, p,
      // Un paso de la simulación con la entrada local del anfitrión.
      paso(local) {
        const ev = M.paso(p, p.robots.map((_, i) => entradaDe(i, local)));
        for (const e of ev) if (EVENTOS_RED.has(e.tipo)) evento(e.tipo, { eq: e.eq, i: e.i, marcador: e.marcador, ganador: e.ganador, primero: e.primero || undefined });
        return ev;
      },
      // Foto a 15 Hz (o ya, con `forzar`) con los eventos de las últimas 3 fotos (por si se pierde alguna).
      enviarSiToca(forzar) {
        const t = ahora();
        for (let i = 0; i < n; i++) if (persona(i) && !st.ia.has(i) && t - st.ultimo[i] >= SILENCIO_MS) caer(i);
        if (!forzar && t - st.ultimoEnvio < 1000 / HZ_FOTO - 1) return null;
        st.ultimoEnvio = t; st.q++;
        st.eventos = st.eventos.filter(e => e.q > st.q - EVENTOS_FOTOS);
        let mask = 0;
        for (let i = 0; i < n; i++) if (!ids[i] || st.ia.has(i)) mask |= 1 << i;
        const f = foto(p, { q: st.q, t: t - st.t0, a: st.s.map(x => Math.max(0, x)), ia: mask, ev: st.eventos.map(({ q: _q, ...e }) => e) });
        st.ultimaFoto = f;
        if (forzar && canal.enviarYa) canal.enviarYa('fa:foto', f); else canal.enviar('fa:foto', f);
        return f;
      },
      caidos: () => [...st.ia].sort((a, b) => a - b),
    };
  }

  // ================= Invitado =================
  // cfg: { canal, p (partido «sombra» que solo se dibuja), M, anfitrion (id), yo (su robot), ahora() ms, hz }
  function invitado(cfg) {
    const { canal, p, M, yo } = cfg, ahora = cfg.ahora, hz = cfg.hz || 15, n = p.robots.length;
    const angulos = []; for (let i = 0; i < n; i++) angulos.push(2 + 3 * i + 2);
    const interp = raiz.EnVivo.interpolador({ retraso: RETRASO_MS, extrapolar: EXTRAPOLA_MS, angulos });
    const st = { s: 0, na: 0, nb: 0, aPrev: false, bPrev: false, ultimoEnvio: -Infinity, junto: null, ultima: null, recibidas: 0, ultimoMsg: ahora(), caido: null,
      vistos: new Set(), pendientes: [], goles: [0, 0], ultimoPaso: ahora(), ia: 0 };
    const pred = Object.assign({}, p.robots[yo], { pend: [], ex: 0, ey: 0, lista: false });
    const vector = s => { const v = [s.balon.x, s.balon.y]; for (const x of s.robots) v.push(x.x, x.y, x.ang); return v; };
    function reconciliar(s) {
      const aut = s.robots[yo];
      if (!aut || s.estado !== 'juego') { pred.lista = false; pred.pend = []; return; }
      pred.pend = pred.pend.filter(x => x.s > (s.a[yo] || 0));
      const antes = pred.lista ? { x: pred.x + pred.ex, y: pred.y + pred.ey } : null;
      Object.assign(pred, { x: aut.x, y: aut.y, vx: aut.vx, vy: aut.vy, fx: aut.fx, fy: aut.fy, dashT: aut.dash ? Math.max(pred.dashT, 0.05) : 0, giroT: aut.giro ? Math.max(pred.giroT, 0.05) : 0,
        recA: aut.listaA ? 0 : Math.max(pred.recA, 0.05), recB: aut.listaB ? 0 : Math.max(pred.recB, 0.05), lista: true });
      for (const x of pred.pend) { pred.aPrev = true; pred.bPrev = true; M.moverRobot(pred, x.ent, x.dt, p, true); }
      const dx = antes ? antes.x - pred.x : 0, dy = antes ? antes.y - pred.y : 0;
      if (antes && dx * dx + dy * dy < SALTO * SALTO) { pred.ex = dx; pred.ey = dy; } else { pred.ex = 0; pred.ey = 0; }
    }
    canal.al('fa:foto', (f, meta) => {
      if (meta && meta.de !== undefined && meta.de !== cfg.anfitrion) return;
      const s = leerFoto(f);
      if (!s || s.robots.length !== n) return;
      st.ultimoMsg = ahora(); st.caido = null; st.recibidas++;
      const t = meta && Number.isFinite(meta.tLocal) ? meta.tLocal : ahora();
      interp.agregar(t, vector(s));
      for (const e of s.ev) if (!st.vistos.has(e.n)) { st.vistos.add(e.n); st.pendientes.push({ ...e, t }); }
      if (!st.ultima || s.q > st.ultima.q) { st.ultima = s; reconciliar(s); }
    });
    if (canal.alDesconectar) canal.alDesconectar(id => { if (id === cfg.anfitrion && st.caido === null) st.caido = ahora(); });
    // Eventos que ya «ocurrieron» en el tiempo dibujado; los goles mueven el marcador que se ve.
    function eventosListos(tRender, s) {
      const ev = [];
      st.pendientes = st.pendientes.filter(e => {
        if (e.t > tRender) return true;
        ev.push(e);
        if (e.tipo === 'gol' && Array.isArray(e.marcador)) st.goles = e.marcador.slice();
        return false;
      });
      // Gol cuyo aviso se perdió (más de 3 fotos sin llegar): el marcador de la foto manda.
      const sum = g => g[0] + g[1];
      if (sum(s.goles) > sum(st.goles) && !st.pendientes.some(e => e.tipo === 'gol')) {
        for (let eq = 0; eq < 2; eq++) if (s.goles[eq] > st.goles[eq]) ev.push({ tipo: 'gol', eq, i: -1, marcador: s.goles.slice() });
        st.goles = s.goles.slice();
      }
      return ev;
    }
    return {
      st, pred, interp,
      // Junta la entrada de este cuadro (las presiones se cuentan al bajar el botón), predice y manda a `hz`.
      entrada(ent) {
        const t = ahora(), dt = Math.min(0.1, Math.max(0, (t - st.ultimoPaso) / 1000)); st.ultimoPaso = t;
        const a = !!(ent && ent.a), b = !!(ent && ent.b), ga = a && !st.aPrev, gb = b && !st.bPrev;
        st.aPrev = a; st.bPrev = b;
        if (ga) st.na = (st.na + 1) & 63;
        if (gb) st.nb = (st.nb + 1) & 63;
        st.junto = { x: Number(ent && ent.x) || 0, y: Number(ent && ent.y) || 0, a, b };
        if (pred.lista && st.ultima && st.ultima.estado === 'juego' && dt > 0) {
          const e = { x: st.junto.x, y: st.junto.y, a: false, b, ga, gb };
          pred.aPrev = true; pred.bPrev = true;
          M.moverRobot(pred, e, dt, p, true);
          pred.pend.push({ s: st.s + 1, ent: e, dt });
          if (pred.pend.length > 240) pred.pend.shift();
        }
        if (t - st.ultimoEnvio < 1000 / hz - 1) return null;
        st.ultimoEnvio = t; st.s++;
        const m = empacarEntrada(st.junto, st.s, st.na, st.nb);
        canal.enviar('fa:entrada', m);
        return m;
      },
      // Deja en `p` lo que hay que dibujar y devuelve { estado, eventos } (null sin fotos).
      dibujar() {
        const t = ahora();
        if (st.caido === null && st.recibidas && t - st.ultimoMsg >= SILENCIO_MS) st.caido = t;
        const v = interp.muestra(t), s = st.ultima;
        if (!v || !s) return null;
        p.balon.x = v[0]; p.balon.y = v[1]; p.balon.vx = s.balon.vx; p.balon.vy = s.balon.vy;
        p.robots.forEach((x, i) => {
          const a = s.robots[i];
          x.x = v[2 + 3 * i]; x.y = v[3 + 3 * i]; x.fx = Math.cos(v[4 + 3 * i]); x.fy = Math.sin(v[4 + 3 * i]);
          x.vx = a.vx; x.vy = a.vy; x.dashT = a.dash ? 0.1 : 0; x.giroT = a.giro ? 0.1 : 0; x.recA = a.listaA ? 0 : 0.5; x.recB = a.listaB ? 0 : 0.5;
        });
        if (pred.lista && s.estado === 'juego') {
          pred.ex *= 1 - CORRECCION; pred.ey *= 1 - CORRECCION;
          Object.assign(p.robots[yo], { x: pred.x + pred.ex, y: pred.y + pred.ey, vx: pred.vx, vy: pred.vy, fx: pred.fx, fy: pred.fy, dashT: pred.dashT, giroT: pred.giroT, recA: pred.recA, recB: pred.recB });
        }
        p.estado = s.estado; p.t = s.reloj; p.oro = s.oro; p.ganador = s.ganador; st.ia = s.ia;
        const eventos = eventosListos(t - RETRASO_MS, s);
        p.goles = st.goles.slice();
        if (s.estado === 'fin') { p.goles = s.goles.slice(); st.goles = s.goles.slice(); }
        return { estado: s.estado, eventos };
      },
      anfitrionCaido: () => st.caido,
      cerrarPorCaida: () => st.caido !== null && ahora() - st.caido >= DESCONEXION_MS,
      ultimaFoto: () => st.ultima,
    };
  }

  raiz.ArenaRed = { ESTADOS, HZ_FOTO, RETRASO_MS, SILENCIO_MS, DESCONEXION_MS, EVENTOS_RED, hzEntrada, foto, leerFoto, empacarEntrada, leerEntrada, presiones, anfitrion, invitado };
})(typeof window !== 'undefined' ? window : globalThis);
