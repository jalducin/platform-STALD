// Netcode de «⚽ Fútbol Estelar 2010» en línea 1 vs 1 (openspec: futbol-en-linea, design.md §2–§5). Sin DOM: lo
// usan juegos/futbol.html y las pruebas de Deno (server/futbol_red_test.ts).
//   - El anfitrión simula con FutbolMotor a 60 Hz y manda una foto cuantizada (`fe:foto`) a 15 Hz.
//   - El invitado manda su entrada (`fe:entrada`) a 30 Hz, interpola a los demás con 100 ms de retraso y predice
//     solo a su jugador controlado (reconciliación con la foto).
// El canal es el de juegos/en-vivo.js (EnVivo.conectar) o cualquier objeto con la misma API: enviar(evento, datos),
// al(evento, fn(datos, meta)), alDesconectar(fn(id)), presencia(), latencia(id), cerrar().
(function (raiz) {
  'use strict';
  const ANIMS = ['parado', 'corre', 'patea', 'barre', 'cae', 'lanza'];
  const ESTADOS = ['parada', 'juego', 'gol', 'medio', 'penal', 'tanda', 'fin'];
  const BOTONES = ['pase', 'tiro', 'hueco', 'elevado', 'sprint', 'cambiar'];
  // Eventos del motor que viajan en la foto (para avisos, sonidos y Emoción en el invitado).
  const EVENTOS_RED = new Set(['gol', 'medio', 'final', 'falta', 'banda', 'meta', 'esquina', 'fuera_lugar', 'poste', 'atajada', 'penal', 'penal_gol', 'penal_falla', 'tanda', 'ultimos', 'amarilla', 'saque']);
  const Q_POS = 20, Q_VEL = 10, Q_DIR = 64 / (2 * Math.PI); // 0.05 m, 0.1 m/s y 1/64 de vuelta
  const HZ_FOTO = 15, HZ_ENTRADA = 30, RETRASO_MS = 100, BUFFER_MAX = 30, EXTRAPOLA_MS = 100;
  const CORRECCION = 0.3, SALTO_M = 3, EVENTOS_FOTOS = 3;
  const DESCONEXION_MS = 15000; // design.md §5: aviso + IA de inmediato y cierre a los 15 s
  const SILENCIO_MS = 3000; // sin mensajes del otro aparato: se da por caído (igual que alDesconectar de EnVivo)
  const MINUTOS_LINEA = 3;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r = (v, q) => Math.round(v * q);
  const lerp = (a, b, k) => a + (b - a) * k;
  function lerpAng(a, b, k) {
    let d = (b - a) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return a + d * k;
  }

  // ================= Foto (anfitrión → invitado) =================
  // p: partido de FutbolMotor. extra: { q (seq), t (ms del anfitrión), ai (último seq de entrada aplicado), ev }.
  function foto(p, extra) {
    const b = p.balon, j = [];
    for (const x of p.jug) j.push(r(x.x, Q_POS), r(x.y, Q_POS), ((Math.round(x.dir * Q_DIR) % 64) + 64) % 64, Math.max(0, ANIMS.indexOf(x.anim)));
    const f = {
      q: extra.q, t: Math.round(extra.t), e: Math.max(0, ESTADOS.indexOf(p.estado)), mi: p.mitad, m: p.minuto,
      g: [p.eq[0].goles, p.eq[1].goles], du: p.dueno, po: p.posesion, h: p.humanos.map(h => h.jug), ai: Math.trunc(Number(extra.ai) || 0),
      b: [r(b.x, Q_POS), r(b.y, Q_POS), r(b.z, Q_POS), r(b.vx, Q_VEL), r(b.vy, Q_VEL), r(b.vz, Q_VEL)], j,
    };
    if (p.tanda) f.ta = [p.tanda.goles[0], p.tanda.goles[1]];
    if (extra.ev && extra.ev.length) f.ev = extra.ev;
    return f;
  }
  // Foto → estado legible (números reales). Devuelve null si la foto no tiene la forma esperada.
  function leerFoto(f) {
    if (!f || !Array.isArray(f.j) || f.j.length % 4 || !Array.isArray(f.b) || f.b.length !== 6 || !Array.isArray(f.g)) return null;
    const jug = [];
    for (let k = 0; k < f.j.length; k += 4) jug.push({ x: f.j[k] / Q_POS, y: f.j[k + 1] / Q_POS, dir: f.j[k + 2] / Q_DIR, anim: ANIMS[f.j[k + 3]] || 'parado' });
    return {
      q: f.q, t: f.t, estado: ESTADOS[f.e] || 'juego', mitad: f.mi, minuto: f.m, goles: [Math.trunc(Number(f.g[0]) || 0), Math.trunc(Number(f.g[1]) || 0)], dueno: f.du, posesion: f.po,
      humanos: Array.isArray(f.h) ? f.h.slice() : [], ai: Math.trunc(Number(f.ai) || 0), tanda: f.ta || null, ev: Array.isArray(f.ev) ? f.ev : [],
      balon: { x: f.b[0] / Q_POS, y: f.b[1] / Q_POS, z: f.b[2] / Q_POS, vx: f.b[3] / Q_VEL, vy: f.b[4] / Q_VEL, vz: f.b[5] / Q_VEL }, jug,
    };
  }
  // Escribe un estado (leído o interpolado) en un partido «sombra» del invitado, que solo se dibuja.
  function aplicar(p, s) {
    p.estado = s.estado; p.minuto = s.minuto; p.mitad = s.mitad; p.dueno = s.dueno; p.posesion = s.posesion;
    p.eq[0].goles = s.goles[0]; p.eq[1].goles = s.goles[1];
    Object.assign(p.balon, s.balon);
    s.jug.forEach((x, i) => {
      const j = p.jug[i]; if (!j) return;
      j.vx = x.vx === undefined ? (x.x - j.x) * 15 : x.vx; j.vy = x.vy === undefined ? (x.y - j.y) * 15 : x.vy;
      j.x = x.x; j.y = x.y; j.dir = x.dir; j.anim = x.anim;
    });
    p.humanos.forEach((h, k) => {
      const i = s.humanos[k];
      if (h.jug >= 0 && p.jug[h.jug] && p.jug[h.jug].humano === k) p.jug[h.jug].humano = -1;
      h.jug = Number.isInteger(i) ? i : -1;
      if (h.jug >= 0 && p.jug[h.jug]) p.jug[h.jug].humano = k;
    });
    if (s.tanda) p.tanda = Object.assign(p.tanda || {}, { goles: s.tanda.slice() });
  }

  // ================= Entrada (invitado → anfitrión) =================
  function empacarEntrada(ent, s) {
    let b = 0;
    BOTONES.forEach((k, n) => { if (ent && ent[k]) b |= 1 << n; });
    return { s, x: r(clamp(Number(ent && ent.x) || 0, -1, 1), 100), y: r(clamp(Number(ent && ent.y) || 0, -1, 1), 100), b };
  }
  function leerEntrada(m) {
    const e = { x: clamp((Number(m && m.x) || 0) / 100, -1, 1), y: clamp((Number(m && m.y) || 0) / 100, -1, 1) };
    BOTONES.forEach((k, n) => { e[k] = !!((Number(m && m.b) || 0) & (1 << n)); });
    return e;
  }

  // ================= Búfer de interpolación (invitado) =================
  function crearBuffer(retraso) { return { fotos: [], retraso: retraso === undefined ? RETRASO_MS : retraso, offset: null, ultimaQ: -1 }; }
  // Agrega una foto leída; descarta repetidas y las más viejas que la primera del búfer. Ajusta el reloj del anfitrión:
  // offset = t_foto − ahora_local, quedándose con el mínimo (la foto que llegó más rápido) y relajándolo poco a poco.
  function agregarFoto(buf, s, ahora) {
    if (!s || buf.fotos.some(x => x.q === s.q)) return false;
    if (buf.fotos.length && s.t < buf.fotos[0].t) return false;
    const muestra = s.t - ahora;
    if (buf.offset === null || muestra > buf.offset) buf.offset = muestra; // llegó «antes» de lo esperado: el reloj iba atrasado
    else buf.offset = buf.offset + (muestra - buf.offset) * 0.02; // retraso extra de la red: se relaja despacio
    buf.fotos.push(s);
    buf.fotos.sort((a, b) => a.t - b.t);
    if (buf.fotos.length > BUFFER_MAX) buf.fotos.splice(0, buf.fotos.length - BUFFER_MAX);
    if (s.q > buf.ultimaQ) buf.ultimaQ = s.q;
    return true;
  }
  const ultima = buf => buf.fotos.reduce((a, b) => (!a || b.q > a.q ? b : a), null);
  // Estado entre dos fotos (k de 0 a 1): posiciones lineales, dirección por el camino corto, lo demás de la nueva.
  function interpolar(a, b, k) {
    k = clamp(k, 0, 1);
    const base = k < 1 ? a : b;
    const jug = a.jug.map((x, i) => {
      const y = b.jug[i] || x;
      return { x: lerp(x.x, y.x, k), y: lerp(x.y, y.y, k), dir: lerpAng(x.dir, y.dir, k), anim: (k < 0.5 ? x : y).anim, vx: (y.x - x.x) / Math.max(0.001, (b.t - a.t) / 1000), vy: (y.y - x.y) / Math.max(0.001, (b.t - a.t) / 1000) };
    });
    const ba = a.balon, bb = b.balon;
    const saltoBalon = Math.hypot(bb.x - ba.x, bb.y - ba.y) > 15; // saque tras gol: no se dibuja el viaje
    const balon = saltoBalon ? { ...(k < 0.5 ? ba : bb) } : { x: lerp(ba.x, bb.x, k), y: lerp(ba.y, bb.y, k), z: lerp(ba.z, bb.z, k), vx: lerp(ba.vx, bb.vx, k), vy: lerp(ba.vy, bb.vy, k), vz: lerp(ba.vz, bb.vz, k) };
    const nueva = k >= 0.5 ? b : a;
    return { ...base, t: lerp(a.t, b.t, k), estado: nueva.estado, minuto: nueva.minuto, mitad: nueva.mitad, goles: b.goles.slice(), dueno: nueva.dueno, posesion: nueva.posesion, humanos: nueva.humanos, tanda: b.tanda, jug, balon };
  }
  // Estado para dibujar en `tRender` (ms del anfitrión). Sin la foto siguiente extrapola el balón hasta 100 ms.
  function estadoEn(buf, tRender) {
    const fs = buf.fotos;
    if (!fs.length) return null;
    if (tRender <= fs[0].t) return fs[0];
    for (let k = 0; k < fs.length - 1; k++) {
      const a = fs[k], b = fs[k + 1];
      if (tRender >= a.t && tRender <= b.t) return interpolar(a, b, (tRender - a.t) / Math.max(1, b.t - a.t));
    }
    const u = fs[fs.length - 1], dt = Math.min(EXTRAPOLA_MS, tRender - u.t) / 1000;
    const b = u.balon;
    return { ...u, balon: { ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt, z: Math.max(0, b.z + b.vz * dt) } };
  }
  // Ms del anfitrión que se dibujan ahora (con el retraso del búfer).
  const tiempoRender = (buf, ahora) => (buf.offset === null ? null : ahora + buf.offset - buf.retraso);
  // Quita las fotos que ya no se necesitan (deja una antes de tRender).
  function podar(buf, tRender) {
    while (buf.fotos.length > 2 && buf.fotos[1].t <= tRender) buf.fotos.shift();
  }

  // ================= Predicción y reconciliación (invitado, solo su jugador) =================
  // Cinemática del motor (moverJugador): acelera hacia la velocidad deseada con tope de aceleración.
  const ACEL = 7.7;
  function deseo(ent, vmax) {
    let x = clamp(Number(ent.x) || 0, -1, 1), y = -clamp(Number(ent.y) || 0, -1, 1);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    const v = vmax(!!ent.sprint);
    return { vx: x * v, vy: y * v };
  }
  function mover(s, ent, dt, vmax) {
    const d = deseo(ent, vmax), a = ACEL * dt;
    const dvx = d.vx - s.vx, dvy = d.vy - s.vy, m = Math.hypot(dvx, dvy), k = m > a ? a / m : 1;
    s.vx += dvx * k; s.vy += dvy * k;
    s.x += s.vx * dt; s.y += s.vy * dt;
  }
  function crearPrediccion() { return { pend: [], x: 0, y: 0, vx: 0, vy: 0, ex: 0, ey: 0, jug: -1, lista: false }; }
  // Aplica una entrada propia (seq s) y la guarda hasta que el anfitrión la confirme.
  function predecir(pred, s, ent, dt, vmax) {
    pred.pend.push({ s, ent, dt });
    if (pred.pend.length > 120) pred.pend.shift();
    if (pred.lista) mover(pred, ent, dt, vmax);
  }
  // Con la foto: parte de la posición autoritativa del jugador y re-aplica las entradas que el anfitrión aún no vio
  // (seq > ai). La diferencia con lo que se dibujaba queda como error que se corrige suave (o de golpe si es grande).
  function reconciliar(pred, aut, ai, vmax) {
    pred.pend = pred.pend.filter(x => x.s > ai);
    const antes = pred.lista ? { x: pred.x + pred.ex, y: pred.y + pred.ey } : null;
    Object.assign(pred, { x: aut.x, y: aut.y, vx: aut.vx || 0, vy: aut.vy || 0, lista: true });
    for (const x of pred.pend) mover(pred, x.ent, x.dt, vmax);
    if (antes && Math.hypot(antes.x - pred.x, antes.y - pred.y) < SALTO_M) { pred.ex = antes.x - pred.x; pred.ey = antes.y - pred.y; }
    else { pred.ex = 0; pred.ey = 0; }
  }
  // Posición a dibujar: la predicha más el error que se va corrigiendo (30 % por cuadro).
  function posicionPredicha(pred) {
    pred.ex *= 1 - CORRECCION; pred.ey *= 1 - CORRECCION;
    return { x: pred.x + pred.ex, y: pred.y + pred.ey };
  }

  // ================= Clubes y partido de la sala =================
  // Dos clubes distintos según la semilla de la sala (los dos aparatos llegan a los mismos).
  function clubesDeSala(seed, n) {
    const a = ((Number(seed) || 0) >>> 0) % n;
    const b = (a + 1 + (Math.floor((Number(seed) || 0) / n) >>> 0) % (n - 1)) % n;
    return [a, b];
  }

  // ================= Anfitrión =================
  // cfg: { canal, p, M, invitado (id), ahora() ms }. paso(local) simula un cuadro con [local, invitado o IA];
  // enviarSiToca() manda la foto a 15 Hz con los eventos de las últimas 3 fotos (por si se pierde alguna).
  function anfitrion(cfg) {
    const { canal, p, M } = cfg, ahora = cfg.ahora;
    const st = { entrada: M.NADA, ultimaS: -1, ultimoMsg: ahora(), q: 0, ultimoEnvio: -Infinity, eventos: [], nEv: 0, iaInvitado: false, caido: null, t0: ahora() };
    canal.al('fe:entrada', (m, meta) => {
      if (meta && meta.de !== undefined && meta.de !== cfg.invitado) return;
      st.ultimoMsg = ahora();
      if (st.iaInvitado) devolverInvitado();
      if (!m || !(m.s > st.ultimaS)) return; // entradas viejas o repetidas
      st.ultimaS = m.s; st.entrada = leerEntrada(m);
    });
    const humanoInvitado = () => p.humanos.find(h => h.eq === 1);
    // La IA toma al equipo del invitado: quita su humano (los jugadores sin humano los mueve la IA).
    function iaAlInvitado() {
      if (st.iaInvitado) return;
      const h = humanoInvitado();
      if (h) {
        if (h.jug >= 0 && p.jug[h.jug]) p.jug[h.jug].humano = -1;
        st.guardado = h;
        p.humanos.splice(p.humanos.indexOf(h), 1);
      }
      p.eq[1].nivel = M.NIVELES.medio;
      st.iaInvitado = true; st.caido = ahora(); st.entrada = M.NADA;
    }
    function devolverInvitado() {
      if (!st.iaInvitado) return;
      const h = st.guardado || { eq: 1, jug: -1, prev: { ...M.NADA }, carga: null, cola: null, cambioT: 0, lanzaY: 0 };
      h.jug = -1; p.humanos.push(h);
      const libre = p.jug.filter(j => j.eq === 1 && j.rol !== 'POR' && j.humano < 0).sort((a, b) => Math.hypot(a.x - p.balon.x, a.y - p.balon.y) - Math.hypot(b.x - p.balon.x, b.y - p.balon.y))[0];
      if (libre) M.asignarHumano(p, p.humanos.length - 1, libre.i);
      p.eq[1].nivel = st.nivelHumano || p.eq[0].nivel;
      st.iaInvitado = false; st.caido = null;
    }
    st.nivelHumano = p.eq[1].nivel;
    if (canal.alDesconectar) canal.alDesconectar(id => { if (id === cfg.invitado) iaAlInvitado(); });
    return {
      st,
      paso(local) {
        const ev = M.paso(p, st.iaInvitado ? [local] : [local, st.entrada]);
        for (const e of ev) if (EVENTOS_RED.has(e.tipo)) st.eventos.push({ n: ++st.nEv, q: st.q + 1, tipo: e.tipo, eq: e.eq, i: e.i, autogol: e.autogol || undefined, marcador: e.marcador, tanda: e.tanda || undefined, penal: e.penal || undefined });
        return ev;
      },
      enviarSiToca(forzar) {
        const t = ahora();
        if (!st.iaInvitado && t - st.ultimoMsg >= SILENCIO_MS) iaAlInvitado(); // 3 s sin entradas (aunque el canal no avise)
        if (!forzar && t - st.ultimoEnvio < 1000 / HZ_FOTO - 1) return null;
        st.ultimoEnvio = t; st.q++;
        st.eventos = st.eventos.filter(e => e.q > st.q - EVENTOS_FOTOS);
        const f = foto(p, { q: st.q, t: t - st.t0, ai: st.ultimaS, ev: st.eventos.map(({ q: _q, ...e }) => e) });
        canal.enviar('fe:foto', f);
        return f;
      },
      iaAlInvitado, devolverInvitado,
      invitadoCaido: () => (st.iaInvitado ? st.caido : null),
      // ¿Se acabó la espera de 15 s por el invitado?
      cerrarPorCaida: () => st.iaInvitado && ahora() - st.caido >= DESCONEXION_MS,
    };
  }

  // ================= Invitado =================
  // cfg: { canal, p (partido sombra), M, anfitrion (id), ahora() ms, retraso }. entrada(ent) junta botones y manda a
  // 30 Hz (con predicción); dibujar() deja en p el estado interpolado y su jugador predicho, y devuelve eventos nuevos.
  function invitado(cfg) {
    const { canal, p, M } = cfg, ahora = cfg.ahora;
    const buf = crearBuffer(cfg.retraso), pred = crearPrediccion();
    const st = { s: 0, ultimoEnvio: -Infinity, junto: null, vistos: new Set(), ultimaFoto: null, recibidas: 0, ultimoMsg: ahora(), caido: null, goles: [0, 0], aplicado: null, ultimoPaso: ahora() };
    const vmax = sprint => {
      const h = p.humanos[1], j = h && h.jug >= 0 ? p.jug[h.jug] : p.jug[11];
      return M.velocidadTope(p, j, sprint);
    };
    const pendientes = [];
    // Foto nueva más reciente: reconcilia al jugador propio (velocidad estimada con la foto anterior).
    function alFotoNueva(s) {
      st.ultimaFoto = s;
      const jug = s.humanos[1];
      if (!(jug >= 0) || !s.jug[jug]) return;
      const prev = buf.fotos.findLast(x => x.q < s.q), dt = prev ? Math.max(0.03, (s.t - prev.t) / 1000) : 1;
      const v = prev?.jug[jug] ? { vx: (s.jug[jug].x - prev.jug[jug].x) / dt, vy: (s.jug[jug].y - prev.jug[jug].y) / dt } : { vx: 0, vy: 0 };
      if (pred.jug !== jug) Object.assign(pred, { lista: false, ex: 0, ey: 0, jug });
      reconciliar(pred, { x: s.jug[jug].x, y: s.jug[jug].y, ...v }, s.ai, vmax);
    }
    canal.al('fe:foto', (f, meta) => {
      if (meta?.de !== undefined && meta.de !== cfg.anfitrion) return;
      st.ultimoMsg = ahora(); st.caido = null;
      const s = leerFoto(f);
      if (!s || !agregarFoto(buf, s, ahora())) return;
      st.recibidas++;
      for (const e of s.ev) {
        if (!st.vistos.has(e.n)) { st.vistos.add(e.n); pendientes.push(e); }
      }
      if (!st.ultimaFoto || s.q > st.ultimaFoto.q) alFotoNueva(s);
    });
    // Eventos que ya «ocurrieron» en el tiempo dibujado; los goles que llegaran sin evento se sacan del marcador.
    function eventosListos(s) {
      const ev = [], total = s.goles[0] + s.goles[1];
      for (let k = 0; k < pendientes.length;) {
        const e = pendientes[k];
        if (e.tipo !== 'gol' || !e.marcador || total >= e.marcador[0] + e.marcador[1]) { ev.push(e); pendientes.splice(k, 1); } else k++;
      }
      const golDe = (lista, eq) => lista.some(e => e.tipo === 'gol' && e.eq === eq);
      for (let eq = 0; eq < 2; eq++) {
        if (s.goles[eq] > st.goles[eq] && !golDe(ev, eq) && !golDe(pendientes, eq)) ev.push({ tipo: 'gol', eq, i: -1, marcador: s.goles.slice() });
      }
      st.goles = s.goles.slice();
      return ev;
    }
    function dibujarPredicho() {
      const pos = posicionPredicha(pred), j = p.jug[pred.jug], v = Math.hypot(pred.vx, pred.vy);
      Object.assign(j, { x: pos.x, y: pos.y, vx: pred.vx, vy: pred.vy, anim: v > 0.5 ? 'corre' : 'parado' });
      if (v > 0.4) j.dir = Math.atan2(pred.vy, pred.vx);
    }
    if (canal.alDesconectar) canal.alDesconectar(id => { if (id === cfg.anfitrion && st.caido === null) st.caido = ahora(); });
    const predecible = s => s && s.estado === 'juego' && pred.lista && pred.jug >= 0 && s.dueno !== pred.jug;
    return {
      st, buf, pred,
      // Junta la entrada de este cuadro (los botones se suman hasta el envío) y manda a 30 Hz.
      entrada(ent) {
        const t = ahora(), dt = Math.min(0.1, (t - st.ultimoPaso) / 1000); st.ultimoPaso = t;
        if (!st.junto) st.junto = { ...ent };
        else { st.junto.x = ent.x; st.junto.y = ent.y; for (const k of BOTONES) st.junto[k] = st.junto[k] || !!ent[k]; }
        if (predecible(st.aplicado)) predecir(pred, st.s + 1, ent, dt, vmax);
        else if (pred.pend.length) pred.pend.push({ s: st.s + 1, ent, dt: 0 });
        if (t - st.ultimoEnvio < 1000 / HZ_ENTRADA - 1) return null;
        st.ultimoEnvio = t; st.s++;
        const m = empacarEntrada(st.junto, st.s);
        st.junto = null;
        canal.enviar('fe:entrada', m);
        return m;
      },
      // Estado interpolado a dibujar (null sin fotos) + eventos nuevos (gol, medio, final, avisos).
      dibujar() {
        if (st.caido === null && st.recibidas && ahora() - st.ultimoMsg >= SILENCIO_MS) st.caido = ahora(); // 3 s sin fotos
        const tr = tiempoRender(buf, ahora());
        if (tr === null) return null;
        const s = estadoEn(buf, tr);
        if (!s) return null;
        podar(buf, tr);
        aplicar(p, s);
        st.aplicado = s;
        if (predecible(s)) dibujarPredicho();
        return { estado: s, eventos: eventosListos(s) };
      },
      // ms sin noticias del anfitrión (null si está bien) y si ya pasaron los 15 s.
      anfitrionCaido: () => st.caido,
      cerrarPorCaida: () => st.caido !== null && ahora() - st.caido >= DESCONEXION_MS,
      ultimaFoto: () => st.ultimaFoto,
    };
  }

  raiz.FutbolRed = {
    ANIMS, ESTADOS, BOTONES, Q_POS, HZ_FOTO, HZ_ENTRADA, RETRASO_MS, DESCONEXION_MS, MINUTOS_LINEA, EVENTOS_RED,
    foto, leerFoto, aplicar, empacarEntrada, leerEntrada,
    crearBuffer, agregarFoto, interpolar, estadoEn, tiempoRender, podar, ultima,
    crearPrediccion, predecir, reconciliar, posicionPredicha, mover,
    clubesDeSala, anfitrion, invitado,
  };
})(typeof window !== 'undefined' ? window : globalThis);
