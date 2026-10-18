// Motor de «🦎 Brigada Xalli» (openspec: brigada-xalli, design.md §2–§7 y §10). Sin DOM: lo usan juegos/brigada.html,
// juegos/brigada-red.js y el servidor (server/brigada.ts). Depende de juegos/brigada-misiones.js (BrigadaMisiones).
//   M.crearMision({ mision | def, personajes: [{ personaje, ia? }], semilla })  → estado de la misión
//   M.paso(m, entradas)  → eventos del paso (1/60 s). entrada = { x, y (−1…1), a (saltar mantenido), b (disparar
//                          mantenido), ga (saltar presionado), gx (globo/bajar presionado), gy (cambiar arma presionado),
//                          c4 (apuntado de 4 direcciones, con toques) }
//   M.ia(m, i)           → la entrada que daría el piloto automático para el personaje i
//   M.reintentar(m), M.estrellas(m), M.resumen(m), M.puntosMaximos(mision, n), M.puntosRanking(puntos)
//   M.progresoVacio(), M.registrarMision(prog, resultado), M.validarProgreso(datos)
// Todo es determinista: el azar sale de `semilla` (mulberry32) y no se crean objetos por cuadro en las listas de
// proyectiles, enemigos y objetos (pools de tamaño fijo).
(function (raiz) {
  'use strict';
  const MIS = () => raiz.BrigadaMisiones;

  // ================= Constantes =================
  const W = 480, H = 270, PASO = 1 / 60;
  const VEL = 120, ACEL_SUELO = 1100, ACEL_AIRE = 650, FRENO = 1400, FRENO_AIRE = 260;
  const SALTO = 330, SALTO_VEHICULO = 280, CORTE = 120, GRAV = 950, CAIDA_MAX = 430, ESCALON = 10;
  const ANCHO = 14, ALTO = 26, ALTO_AGACHADO = 16;
  const COR = 3, VIDAS = 3, INV_GOLPE = 1.2, INV_RESPAWN = 2, CAIDO_S = 1, REVIVIR_S = 0.6, LIGA_S = 3;
  const INTRO_S = 1.2, VICTORIA_S = 2.5, VIDA_VEHICULO = 8;
  const UMBRAL_MOVER = 0.3, UMBRAL_APUNTAR = 0.22, UMBRAL_GIRO = 0.1;
  const MAX_BALAS = 160, MAX_BALAS_E = 64, MAX_GLOBOS = 24, MAX_ENEMIGOS = 48, MAX_OBJETOS = 40, MAX_AVISOS = 12;
  const PERSONAJES = ['xalli', 'itzae', 'yahui', 'xochiquetzal', 'xolo', 'tlali', 'tona', 'kinich'];
  const S2 = Math.SQRT1_2;
  // 0 = derecha, 2 = abajo, 4 = izquierda, 6 = arriba (y crece hacia abajo).
  const DIRS = [[1, 0], [S2, S2], [0, 1], [-S2, S2], [-1, 0], [-S2, -S2], [0, -1], [S2, -S2]];

  const ARMAS = {
    burbuja: { nombre: 'Lanzaburbujas', emoji: '🫧', cad: 0.16, dano: 1, vel: 330, vida: 1.6, r: 4, balas: 1 },
    rafaga: { nombre: 'Ráfaga turbo', emoji: '💨', cad: 0.07, dano: 1, vel: 380, vida: 1.4, r: 3, balas: 1, mun: 150, max: 300 },
    abanico: { nombre: 'Abanico de confeti', emoji: '🎉', cad: 0.34, dano: 1, vel: 300, vida: 0.45, r: 3, balas: 5, abre: 0.21, mun: 40, max: 80 },
    laser: { nombre: 'Láser de juguete', emoji: '🔦', cad: 0.12, dano: 2, vel: 560, vida: 1, r: 3, balas: 1, perfora: true, mun: 80, max: 160 },
    canon: { nombre: 'Cañón de confeti', emoji: '🎊', cad: 0.32, dano: 4, vel: 340, vida: 1.5, r: 6, balas: 1 },
  };
  const ORDEN_ARMAS = ['burbuja', 'rafaga', 'abanico', 'laser'];
  const GLOBO = { vx: 150, vy: -220, r: 5, area: 40, dano: 6, max: 20, inicial: 5 };
  const ENEMIGOS = {
    patrulla: { nombre: 'Patrullabot', w: 18, h: 26, hp: 3, puntos: 100, vel: 40, cad: 2.4, suelo: true },
    dron: { nombre: 'Dron zumbador', w: 22, h: 14, hp: 2, puntos: 120, vel: 55, cad: 2.8 },
    torreta: { nombre: 'Torreta tuerca', w: 22, h: 20, hp: 6, puntos: 200, vel: 0, cad: 3 },
    saltabot: { nombre: 'Saltabot', w: 16, h: 16, hp: 2, puntos: 80, vel: 90, cad: 1.3, suelo: true },
    escudobot: { nombre: 'Escudobot', w: 24, h: 28, hp: 6, puntos: 250, vel: 25, cad: 3.2, suelo: true, escudo: true },
    alien: { nombre: 'Gelatino invasor', w: 18, h: 18, hp: 3, puntos: 150, vel: 75, cad: 1.8, suelo: true },
  };
  // Jefes y minijefes: caja (w × h, con la base en y), vida base, casa = x dentro de la arena, vuela = y de la base.
  const JEFES = {
    tractor: { nombre: 'Tractor Tragahojas', w: 110, h: 84, hp: 90, casa: 360, ataques: ['engranes', 'embestida', 'saltabots'] },
    excavadora: { nombre: 'Excavadora', w: 96, h: 70, hp: 70, casa: 370, ataques: ['rocas', 'embestida', 'polvo'] },
    escorpion: { nombre: 'Escorpión de Hojalata', w: 120, h: 64, hp: 130, casa: 360, ataques: ['pinzas', 'cola', 'excavar'] },
    grua: { nombre: 'Grúa robot', w: 64, h: 130, hp: 80, casa: 410, ataques: ['cajas', 'gancho', 'tuercas'] },
    antenon: { nombre: 'Antenón', w: 150, h: 60, hp: 160, casa: 250, vuela: 96, ataques: ['lluvia', 'triple', 'minibots'] },
    torre: { nombre: 'Torre láser', w: 56, h: 140, hp: 95, casa: 410, ataques: ['columnas', 'orbes', 'saltabots'] },
    reina: { nombre: 'Reina Nodriza', w: 124, h: 96, hp: 200, casa: 350, vuela: 132, ataques: ['espiral', 'aliens', 'columnas', 'triple'] },
  };
  const PREMIOS = ['rafaga', 'globos', 'abanico', 'escudo', 'laser', 'corazon'];
  const PUNTOS = { rescate: 500, objeto: 50, estrella: 300, minijefe: 2000, jefe: 5000 };

  // ================= Utilidades =================
  const acotar = (v, a, b) => Math.min(b, Math.max(a, v));
  const signo = v => (v > 0 ? 1 : v < 0 ? -1 : 0); // NOSONAR: ternario anidado corto y claro
  const acercar = (v, meta, d) => (v < meta ? Math.min(meta, v + d) : Math.max(meta, v - d));
  function hash(s) {
    let h = 2166136261;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(semilla) {
    let a = hash(semilla) || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0; // NOSONAR: aritmética de 32 bits de mulberry32
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const escala = n => ({ enemigo: 1 + 0.15 * (Math.max(1, n) - 1), jefe: 1 + 0.45 * (Math.max(1, n) - 1) });
  const copiasExtra = (indice, n) => ((indice % 4) < Math.floor((Math.max(1, n) - 1) / 2) ? 1 : 0);
  const solapa = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  // ================= Suelo y cuerpos =================
  // y del suelo más alto bajo [x0, x1].
  function pisoEntre(def, x0, x1) {
    let y = Infinity;
    for (const s of def.suelo) if (s[0] < x1 && s[1] > x0 && s[2] < y) y = s[2];
    return y === Infinity ? MIS().SUELO : y;
  }
  const sueloEn = (def, x) => pisoEntre(def, x - 0.5, x + 0.5);
  // Mueve un cuerpo { x, y (pies), vx, vy, suelo, plat, caeT } de ancho w: escalones ≤ 10 px se suben, más altos son
  // pared; plataformas de un solo sentido si `plat` no es null.
  function mover(def, b, w, dt, conPlataformas) {
    const mitad = w / 2;
    if (b.vx) {
      let nx = acotar(b.x + b.vx * dt, mitad, def.largo - mitad);
      for (const s of def.suelo) {
        if (!(s[0] < nx + mitad && s[1] > nx - mitad) || s[2] >= b.y - ESCALON) continue;
        nx = b.vx > 0 ? Math.min(nx, s[0] - mitad - 0.01) : Math.max(nx, s[1] + mitad + 0.01);
        b.vx = 0; b.pared = true;
      }
      b.x = nx;
    }
    const piso = pisoEntre(def, b.x - mitad + 1, b.x + mitad - 1);
    if (b.suelo) pegarAlSuelo(def, b, piso, conPlataformas);
    if (!b.suelo) caer(def, b, piso, dt, conPlataformas);
  }
  function pegarAlSuelo(def, b, piso, conPlataformas) {
    if (b.plat >= 0) {
      const pl = def.plataformas[b.plat];
      if (conPlataformas && b.caeT <= 0 && b.x >= pl[0] && b.x <= pl[1]) { b.y = pl[2]; b.vy = 0; return; }
      b.plat = -1; b.suelo = false; return;
    }
    if (Math.abs(piso - b.y) <= ESCALON) { b.y = piso; b.vy = 0; } else if (piso > b.y) b.suelo = false;
  }
  function caer(def, b, piso, dt, conPlataformas) {
    const ny = b.y + b.vy * dt;
    if (b.vy >= 0 && conPlataformas && b.caeT <= 0) {
      const plats = def.plataformas;
      for (let k = 0; k < plats.length; k++) {
        const pl = plats[k];
        if (b.x >= pl[0] && b.x <= pl[1] && b.y <= pl[2] + 0.01 && ny >= pl[2]) { b.y = pl[2]; b.vy = 0; b.suelo = true; b.plat = k; return; }
      }
    }
    if (b.vy >= 0 && ny >= piso) { b.y = piso; b.vy = 0; b.suelo = true; b.plat = -1; return; }
    b.y = ny;
  }

  // ================= Apuntado =================
  // Índice 0–7 de la dirección del disparo. En el suelo, ↓ (o diagonal abajo) dispara al frente (agachado).
  // Con toques (`cuatro`): solo adelante, arriba, atrás y, en el aire, abajo.
  function apuntar(x, y, dir, enSuelo, cuatro) {
    const frente = dir < 0 ? 4 : 0;
    if (Math.hypot(x, y) < UMBRAL_APUNTAR) return frente;
    const k = cuatro ? apuntarCuatro(x, y) : ((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8;
    return enSuelo ? sinAbajoEnSuelo(k, frente) : k;
  }
  // Con toques: adelante/atrás si es más horizontal; arriba/abajo si es claramente vertical.
  function apuntarCuatro(x, y) {
    const vertical = Math.abs(y) >= 0.6 * Math.abs(x) && Math.abs(y) >= 0.35;
    if (!vertical) return x < 0 ? 4 : 0;
    return y < 0 ? 6 : 2;
  }
  // En el suelo no se dispara hacia abajo: diagonal abajo → al frente de ese lado; abajo → al frente.
  function sinAbajoEnSuelo(k, frente) {
    if (k === 1) return 0;
    if (k === 3) return 4;
    return k === 2 ? frente : k;
  }

  // ================= Crear la misión =================
  function nuevoJugador(i, o, x, y) {
    return {
      i, personaje: PERSONAJES.includes(o.personaje) ? o.personaje : PERSONAJES[i % 8], ia: !!o.ia,
      x, y, vx: 0, vy: 0, dir: 1, suelo: true, plat: -1, caeT: 0, pared: false, agachado: false, aim: 0, c4: false,
      arma: 'burbuja', mun: { rafaga: 0, abanico: 0, laser: 0 }, globos: GLOBO.inicial, escudo: 0,
      cor: COR, vidas: VIDAS, estado: 'vivo', estT: 0, inv: INV_RESPAWN, cad: 0, nDisp: 0, dispT: 9, herT: 9,
      vehiculo: -1, bajoT: 0, revive: 0, paso: 0,
      puntos: 0, robots: 0, rescates: 0,
      iaSalto: 0, iaGlobo: 0, iaArma: 0,
    };
  }
  const pool = (n, f) => Array.from({ length: n }, f);
  function listaAparicion(def, n) {
    const lista = [];
    def.enemigos.forEach((e, k) => {
      const copias = 1 + copiasExtra(k, n);
      for (let c = 0; c < copias; c++) lista.push({ x: e[0] + 26 * c, tipo: e[1], y: e[2] || 0, clave: 'e' + k + '.' + c });
    });
    return lista.sort((a, b) => a.x - b.x);
  }
  function puntosDeControl(def) {
    const cps = [...def.puntosControl];
    if (def.minijefe) cps.push(def.minijefe.x - 40);
    cps.push(def.jefe.x - 40);
    return cps.sort((a, b) => a - b);
  }
  function crearMision(o) {
    const def = o.def || MIS().porId(o.mision);
    if (!def) throw new Error('Brigada: misión desconocida');
    const personas = (o.personajes && o.personajes.length ? o.personajes : [{}]).slice(0, 8);
    const n = personas.length;
    const m = {
      def, mision: def.id, semilla: String(o.semilla || 'brigada'), rnd: rng('brigada:' + (o.semilla || '') + ':' + def.id),
      t: 0, estado: 'intro', estT: 0, n, esc: escala(n), reintentos: 0, completadaEn: null,
      cam: { x: 0, bloqueo: null, liga: 0 }, cps: puntosDeControl(def), cp: -1,
      jugadores: personas.map((p, i) => nuevoJugador(i, p, 60 + 22 * i, sueloEn(def, 60 + 22 * i))),
      lista: listaAparicion(def, n), sig: 0, cobrados: new Set(), sigId: 1,
      enemigos: pool(MAX_ENEMIGOS, () => ({ vivo: false })),
      balas: pool(MAX_BALAS, () => ({ vivo: false, hits: [] })),
      balasE: pool(MAX_BALAS_E, () => ({ vivo: false })),
      globos: pool(MAX_GLOBOS, () => ({ vivo: false })),
      objetos: pool(MAX_OBJETOS, () => ({ vivo: false })),
      avisos: pool(MAX_AVISOS, () => ({ vivo: false })),
      jaulas: def.jaulas.map((j, k) => ({ k, x: j[0], y: j[2] || sueloEn(def, j[0]), animal: j[1], abierta: false })),
      vehiculos: def.vehiculos.map(v => ({ x: v[0], y: sueloEn(def, v[0]), vx: 0, vy: 0, suelo: true, plat: -1, caeT: 0, hp: VIDA_VEHICULO, inv: 0, ocupante: -1, vivo: true })),
      jefe: null, miniHecho: false, jefeHecho: false, ev: [],
    };
    def.objetos.forEach(ob => ponerObjeto(m, ob[1], ob[0], ob[2] || sueloEn(def, ob[0]) - 10, true));
    return m;
  }

  // ================= Pools =================
  function libre(lista) {
    for (const x of lista) if (!x.vivo) return x;
    return null;
  }
  function ponerObjeto(m, tipo, x, y, flota) {
    const o = libre(m.objetos);
    if (!o) return null;
    Object.assign(o, { vivo: true, id: m.sigId++, tipo, x, y, vy: flota ? 0 : -120, flota: !!flota, t: 0 });
    return o;
  }
  function ponerEnemigo(m, tipo, x, y, o = {}) {
    const e = libre(m.enemigos), d = ENEMIGOS[tipo];
    if (!e || !d) return null;
    const hp = Math.ceil(d.hp * m.esc.enemigo);
    const yy = y || sueloEn(m.def, x);
    Object.assign(e, {
      vivo: true, id: m.sigId++, tipo, x, y: yy, baseY: yy, vx: 0, vy: 0, dir: -1, hp, hpMax: hp, t: d.cad * 0.6, t2: d.cad, golpeT: 0,
      suelo: !!d.suelo, plat: -1, caeT: 0, pared: false, quieto: false, invocado: !!o.invocado, clave: o.clave || ('p' + m.sigId), paga: !o.invocado,
    });
    return e;
  }
  function dispararE(m, x, y, vx, vy, tipo, extra) {
    const b = libre(m.balasE);
    if (!b) return null;
    Object.assign(b, { vivo: true, id: m.sigId++, x, y, vx, vy, tipo, r: 4, g: 0, vida: 6, w: 0, h: 0, ...(extra || {}) });
    return b;
  }
  function ponerAviso(m, tipo, x, y, w, t) {
    const a = libre(m.avisos);
    if (a) Object.assign(a, { vivo: true, id: m.sigId++, tipo, x, y, w, t, total: t });
    return a;
  }
  const contar = lista => lista.reduce((s, x) => s + (x.vivo ? 1 : 0), 0);

  // ================= Jugadores =================
  const vivos = m => m.jugadores.filter(p => p.estado === 'vivo');
  function cajaJugador(p) {
    if (p.vehiculo >= 0) return { x: p.x - 15, y: p.y - 28, w: 30, h: 28 };
    const h = p.agachado ? ALTO_AGACHADO : ALTO;
    return { x: p.x - ANCHO / 2, y: p.y - h, w: ANCHO, h };
  }
  // fuente: qué lo golpeó (tipo de enemigo, de proyectil o de jefe), para sonidos y pruebas.
  function herir(m, i, fuente) {
    const p = m.jugadores[i];
    if (!p || p.estado !== 'vivo' || p.inv > 0) return false;
    if (p.vehiculo >= 0) return herirVehiculo(m, p);
    if (p.escudo > 0) { p.escudo = 0; p.inv = 0.6; m.ev.push({ tipo: 'escudo', i }); return true; }
    p.cor--; p.inv = INV_GOLPE; p.herT = 0;
    m.ev.push({ tipo: 'herido', i, cor: p.cor, fuente: fuente || '' });
    if (p.cor <= 0) derribar(m, p);
    return true;
  }
  function herirVehiculo(m, p) {
    const v = m.vehiculos[p.vehiculo];
    if (v.inv > 0) return false;
    v.hp--; v.inv = 0.5;
    m.ev.push({ tipo: 'golpeVehiculo', i: p.i, hp: v.hp });
    if (v.hp > 0) return true;
    v.vivo = false; v.ocupante = -1; p.vehiculo = -1; p.inv = 1.5; p.vy = -200; p.suelo = false;
    m.ev.push({ tipo: 'boom', x: v.x, y: v.y - 14, enemigo: 'vehiculo', i: p.i });
    return true;
  }
  function derribar(m, p) {
    if (p.vehiculo >= 0) { m.vehiculos[p.vehiculo].ocupante = -1; p.vehiculo = -1; }
    p.estado = 'caido'; p.estT = CAIDO_S; p.vidas--; p.vx = 0; p.revive = 0;
    m.ev.push({ tipo: 'caida', i: p.i, x: p.x, y: p.y - 13, vidas: p.vidas });
  }
  function aparecerJugador(m, p, x) {
    const xx = acotar(x, m.cam.x + 20, m.cam.x + W - 20);
    Object.assign(p, { estado: 'vivo', x: xx, y: Math.min(sueloEn(m.def, xx) - 90, 60), vx: 0, vy: 0, suelo: false, plat: -1, cor: COR, inv: INV_RESPAWN, revive: 0, agachado: false });
  }
  function actualizarCaido(m, p, dt) {
    p.estT -= dt;
    if (p.estT > 0) return;
    if (p.vidas > 0) { aparecerJugador(m, p, m.cam.x + 70 + 16 * p.i); m.ev.push({ tipo: 'reaparece', i: p.i }); return; }
    p.estado = 'burbuja'; p.x = acotar(p.x, m.cam.x + 20, m.cam.x + W - 20); p.y = Math.min(p.y, sueloEn(m.def, p.x) - 14);
    m.ev.push({ tipo: 'burbuja', i: p.i });
  }
  // La burbuja flota hacia el grupo; un compañero que la toca 0.6 s la revive con 1 vida.
  function actualizarBurbuja(m, p, dt) {
    const vs = vivos(m);
    if (!vs.length) return;
    const cx = vs.reduce((s, q) => s + q.x, 0) / vs.length - 24, cy = Math.min(...vs.map(q => q.y)) - 14;
    p.x = acotar(acercar(p.x, cx, 70 * dt), m.cam.x + 16, m.cam.x + W - 16);
    p.y = acercar(p.y, cy, 70 * dt);
    const toca = vs.find(q => Math.abs(q.x - p.x) < 18 && Math.abs(q.y - p.y) < 24);
    p.revive = toca ? p.revive + dt : Math.max(0, p.revive - dt / 2);
    if (p.revive < REVIVIR_S) return;
    Object.assign(p, { estado: 'vivo', vidas: 1, cor: COR, inv: INV_RESPAWN, vy: -120, suelo: false, plat: -1, revive: 0 });
    m.ev.push({ tipo: 'revive', i: p.i, por: toca.i });
  }

  function actualizarJugador(m, p, e, dt) {
    if (p.estado === 'caido') { actualizarCaido(m, p, dt); return; }
    if (p.estado === 'burbuja') { actualizarBurbuja(m, p, dt); return; }
    if (p.estado !== 'vivo') return;
    relojes(p, dt);
    const x = acotar(Number(e.x) || 0, -1, 1), y = acotar(Number(e.y) || 0, -1, 1);
    p.c4 = !!e.c4;
    p.agachado = p.suelo && p.vehiculo < 0 && y > 0.6 && y > Math.abs(x);
    if (Math.abs(x) > UMBRAL_GIRO) p.dir = x > 0 ? 1 : -1;
    p.aim = apuntar(x, y, p.dir, p.suelo, p.c4);
    correr(p, x, dt);
    saltar(m, p, e, y);
    if (!p.suelo) p.vy = Math.min(CAIDA_MAX, p.vy + GRAV * dt);
    moverJugador(m, p, dt);
    acciones(m, p, e);
    tocarCosas(m, p);
  }
  function relojes(p, dt) {
    for (const k of ['inv', 'escudo', 'bajoT', 'caeT']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
    if (p.cad > 0) p.cad -= dt;
    p.dispT += dt; p.herT += dt;
  }
  // Aceleración del suelo o del aire hacia la velocidad que pide la palanca; frenado si no pide nada.
  function tasaDe(meta, suelo) {
    if (meta === 0) return suelo ? FRENO : FRENO_AIRE;
    return suelo ? ACEL_SUELO : ACEL_AIRE;
  }
  function correr(p, x, dt) {
    const fuerza = Math.abs(x) > UMBRAL_MOVER ? Math.min(1, (Math.abs(x) - UMBRAL_MOVER) / 0.4) : 0;
    const factor = p.vehiculo >= 0 ? 0.85 : 1;
    const meta = p.agachado ? 0 : signo(x) * VEL * fuerza * factor;
    p.vx = acercar(p.vx, meta, tasaDe(meta, p.suelo) * dt);
  }
  // Física y ventana de la cámara (nadie sale de ella); el vehículo va con quien lo maneja.
  function moverJugador(m, p, dt) {
    const x0 = p.x;
    mover(m.def, p, ANCHO, dt, true);
    const izq = m.cam.x + 8, der = m.cam.x + W - 8;
    if (p.x < izq || p.x > der) { p.x = acotar(p.x, izq, der); p.vx = 0; }
    p.paso += Math.abs(p.x - x0);
    if (p.vehiculo >= 0) Object.assign(m.vehiculos[p.vehiculo], { x: p.x, y: p.y });
  }
  function acciones(m, p, e) {
    if (e.b) disparar(m, p);
    if (e.gx && p.vehiculo >= 0) bajar(m, p);
    else if (e.gx) lanzarGlobo(m, p);
    if (e.gy) cambiarArma(m, p);
  }
  function saltar(m, p, e, y) {
    if (e.ga && p.suelo) {
      if (p.plat >= 0 && y > 0.6) { p.caeT = 0.25; p.suelo = false; p.plat = -1; m.ev.push({ tipo: 'bajaPlataforma', i: p.i }); }
      else { p.vy = -(p.vehiculo >= 0 ? SALTO_VEHICULO : SALTO); p.suelo = false; p.plat = -1; m.ev.push({ tipo: 'salto', i: p.i }); }
    }
    if (!e.a && p.vy < -CORTE) p.vy = -CORTE;
  }
  function cambiarArma(m, p) {
    if (p.vehiculo >= 0) return;
    const k = ORDEN_ARMAS.indexOf(p.arma);
    for (let d = 1; d <= ORDEN_ARMAS.length; d++) {
      const a = ORDEN_ARMAS[(k + d) % ORDEN_ARMAS.length];
      if (a !== 'burbuja' && !(p.mun[a] > 0)) continue;
      if (a !== p.arma) { p.arma = a; m.ev.push({ tipo: 'arma', i: p.i, arma: a }); }
      return;
    }
  }
  // Altura de la que sale el disparo: agachado, en el vehículo, hacia arriba o hacia abajo.
  function alturaDisparo(p) {
    if (p.aim === 2) return p.y - 4;
    if (p.aim === 6) return p.y - 24;
    if (p.vehiculo >= 0) return p.y - 16;
    return p.agachado ? p.y - 9 : p.y - 17;
  }
  function anguloBala(A, arma, k, nDisp) {
    if (arma === 'rafaga') return nDisp % 2 ? 0.04 : -0.04;
    return A.balas > 1 ? (k - (A.balas - 1) / 2) * (A.abre / 2) : 0;
  }
  function disparar(m, p) {
    if (p.cad > 0) return;
    const arma = p.vehiculo >= 0 ? 'canon' : p.arma, A = ARMAS[arma], d = DIRS[p.aim];
    const oy = alturaDisparo(p), ox = p.x + d[0] * 10;
    let n = 0;
    for (let k = 0; k < A.balas; k++) {
      const ang = anguloBala(A, arma, k, p.nDisp);
      const c = Math.cos(ang), s = Math.sin(ang), dx = d[0] * c - d[1] * s, dy = d[0] * s + d[1] * c;
      const b = libre(m.balas);
      if (!b) break;
      Object.assign(b, { vivo: true, id: m.sigId++, x: ox, y: oy + d[1] * 8, vx: dx * A.vel, vy: dy * A.vel, dano: A.dano, r: A.r, vida: A.vida, tipo: arma, de: p.i, perfora: !!A.perfora });
      b.hits.length = 0;
      n++;
    }
    p.nDisp++; p.dispT = 0; p.cad += A.cad;
    if (A.mun) gastarMunicion(m, p, arma);
    m.ev.push({ tipo: 'disparo', i: p.i, arma, balas: n, aim: p.aim });
  }
  function gastarMunicion(m, p, arma) {
    p.mun[arma] = Math.max(0, p.mun[arma] - 1);
    if (p.mun[arma] > 0) return;
    p.arma = 'burbuja';
    m.ev.push({ tipo: 'sinMunicion', i: p.i });
  }
  function lanzarGlobo(m, p) {
    if (p.globos <= 0) return;
    const g = libre(m.globos);
    if (!g) return;
    p.globos--;
    Object.assign(g, { vivo: true, id: m.sigId++, x: p.x + p.dir * 6, y: p.y - 20, vx: p.dir * GLOBO.vx + p.vx * 0.4, vy: GLOBO.vy, de: p.i, t: 0 });
    m.ev.push({ tipo: 'lanza', i: p.i });
  }
  function bajar(m, p) {
    const v = m.vehiculos[p.vehiculo];
    v.ocupante = -1; v.vx = 0; v.vy = 0; v.suelo = false;
    p.vehiculo = -1; p.vy = -300; p.suelo = false; p.plat = -1; p.bajoT = 0.8;
    m.ev.push({ tipo: 'bajar', i: p.i });
  }
  // Objetos, jaulas y vehículos que el personaje toca.
  function tocarCosas(m, p) {
    const c = cajaJugador(p);
    for (const o of m.objetos) if (o.vivo && solapa(c.x, c.y, c.w, c.h, o.x - 8, o.y - 16, 16, 16)) recoger(m, p, o);
    for (const j of m.jaulas) if (!j.abierta && solapa(c.x, c.y, c.w, c.h, j.x - 11, j.y - 24, 22, 24)) abrirJaula(m, j, p.i);
    if (p.vehiculo >= 0 || p.bajoT > 0 || p.vy < 0) return;
    m.vehiculos.forEach((v, k) => {
      if (p.vehiculo >= 0 || !v.vivo || v.ocupante >= 0 || !solapa(c.x, c.y, c.w, c.h, v.x - 17, v.y - 26, 34, 26)) return;
      v.ocupante = p.i; p.vehiculo = k; p.agachado = false;
      m.ev.push({ tipo: 'vehiculo', i: p.i });
    });
  }
  function recoger(m, p, o) {
    o.vivo = false;
    const t = o.tipo, A = ARMAS[t];
    if (A && A.mun) { p.mun[t] = Math.min(A.max, p.mun[t] + A.mun); p.arma = t; }
    else if (t === 'globos') p.globos = Math.min(GLOBO.max, p.globos + 5);
    else if (t === 'escudo') p.escudo = 10;
    else if (t === 'corazon') { if (p.cor < COR) p.cor = COR; else p.vidas = Math.min(5, p.vidas + 1); }
    p.puntos += t === 'estrella' ? PUNTOS.estrella : PUNTOS.objeto;
    m.ev.push({ tipo: 'objeto', i: p.i, objeto: t, x: o.x, y: o.y });
  }
  function abrirJaula(m, j, i) {
    j.abierta = true;
    const p = m.jugadores[i];
    if (p) { p.puntos += PUNTOS.rescate; p.rescates++; }
    ponerObjeto(m, PREMIOS[j.k % PREMIOS.length], j.x, j.y - 14, false);
    m.ev.push({ tipo: 'rescate', i, animal: j.animal, x: j.x, y: j.y - 12 });
  }

  // ================= Cámara compartida, arenas y liga =================
  function camara(m, dt) {
    const vs = vivos(m), def = m.def;
    if (!vs.length) return;
    let lead = vs[0], rear = vs[0];
    for (const q of vs) {
      if (q.x > lead.x) lead = q;
      if (q.x < rear.x) rear = q;
    }
    if (m.cam.bloqueo !== null) { m.cam.x = Math.min(m.cam.bloqueo, m.cam.x + 260 * dt); return; }
    const deseo = Math.min(lead.x - W * 0.4, rear.x - 8, def.largo - W);
    if (deseo > m.cam.x) m.cam.x = deseo;
    if (def.minijefe && !m.miniHecho && !m.jefe && lead.x >= def.minijefe.x + 30) abrirArena(m, def.minijefe, true);
    else if (!m.jefeHecho && !m.jefe && lead.x >= def.jefe.x + 30) abrirArena(m, def.jefe, false);
    liga(m, vs, lead, rear, dt);
  }
  function liga(m, vs, lead, rear, dt) {
    const empuja = vs.length > 1 && lead.x >= m.cam.x + W - 14 && rear.x <= m.cam.x + 14;
    m.cam.liga = empuja ? m.cam.liga + dt : 0;
    if (m.cam.liga < LIGA_S) return;
    m.cam.liga = 0;
    let k = 0;
    for (const q of vs) {
      if (q === lead || q.x > m.cam.x + 30) continue;
      const x = acotar(lead.x - 50 - 16 * k++, m.cam.x + 20, m.cam.x + W - 20);
      Object.assign(q, { x, y: sueloEn(m.def, x), vx: 0, vy: 0, suelo: true, plat: -1, inv: Math.max(q.inv, 0.8) });
      m.ev.push({ tipo: 'liga', i: q.i });
    }
  }
  function abrirArena(m, a, mini) {
    m.cam.bloqueo = a.x;
    crearJefe(m, a.tipo, a.x, mini);
    if (!mini) { m.estado = 'jefe'; m.estT = 0; }
    m.ev.push({ tipo: 'jefe', jefe: a.tipo, mini });
  }
  function checkpoints(m) {
    const vs = vivos(m);
    if (!vs.length) return;
    const lead = Math.max(...vs.map(p => p.x));
    while (m.cp + 1 < m.cps.length && lead >= m.cps[m.cp + 1]) { m.cp++; m.ev.push({ tipo: 'checkpoint', k: m.cp, x: m.cps[m.cp] }); }
  }

  // ================= Enemigos =================
  function aparecer(m) {
    while (m.sig < m.lista.length && m.lista[m.sig].x <= m.cam.x + W + 30) {
      const a = m.lista[m.sig++];
      if (a.x < m.cam.x - 40) continue;
      const e = ponerEnemigo(m, a.tipo, a.x, a.y, { clave: a.clave });
      if (e && a.tipo === 'dron') { e.baseY = a.y || 120; e.y = e.baseY; }
    }
  }
  function objetivo(m, x) {
    let mejor = null, d = Infinity;
    for (const p of m.jugadores) if (p.estado === 'vivo' && Math.abs(p.x - x) < d) { d = Math.abs(p.x - x); mejor = p; }
    return mejor;
  }
  const activo = (m, e) => e.x >= m.cam.x - 40 && e.x <= m.cam.x + W + 60;
  const visible = (m, x) => x >= m.cam.x - 4 && x <= m.cam.x + W + 4;
  // Disparo apuntado de un enemigo hacia el pecho del objetivo.
  function apuntado(m, x, y, p, vel, tipo, extra) {
    const dx = p.x - x, dy = p.y - 15 - y, d = Math.hypot(dx, dy) || 1;
    return dispararE(m, x, y, dx / d * vel, dy / d * vel, tipo, extra);
  }
  const IA_ENEMIGO = {
    patrulla(m, e, p, dt) { caminarYDisparar(m, e, p, dt, 110, 'tuerca'); },
    escudobot(m, e, p, dt) { caminarYDisparar(m, e, p, dt, 90, 'tuerca'); },
    dron(m, e, p, dt) {
      const d = ENEMIGOS.dron, meta = p.x + 40 * Math.sin(m.t * 0.9 + e.id);
      e.vx = acotar((meta - e.x) * 2, -d.vel, d.vel); e.x += e.vx * dt;
      e.y = e.baseY + 10 * Math.sin(m.t * 2.2 + e.id); e.dir = p.x < e.x ? -1 : 1;
      e.t -= dt;
      if (e.t <= 0 && Math.abs(p.x - e.x) < 50 && visible(m, e.x)) { dispararE(m, e.x, e.y + 8, 0, 40, 'gota', { g: 500 }); e.t = d.cad; }
    },
    // La torreta se ilumina (carga) medio segundo antes de disparar; la bola es lenta.
    torreta(m, e, p, dt) {
      e.dir = p.x < e.x ? -1 : 1;
      if (Math.abs(p.x - e.x) < 300 && visible(m, e.x)) e.t -= dt;
      e.carga = e.t < 0.5;
      if (e.t <= 0) { apuntado(m, e.x + e.dir * 8, e.y - 14, p, 95, 'bola'); e.t = ENEMIGOS.torreta.cad; }
    },
    saltabot(m, e, p, dt) { saltarHacia(m, e, p, dt, ENEMIGOS.saltabot); },
    alien(m, e, p, dt) {
      saltarHacia(m, e, p, dt, ENEMIGOS.alien);
      e.t2 -= dt;
      if (e.t2 <= 0 && visible(m, e.x)) {
        for (const a of [-0.25, 0, 0.25]) { const b = apuntado(m, e.x, e.y - 10, p, 105, 'baba'); if (b) rotar(b, a); }
        e.t2 = 3.2;
      }
    },
  };
  function rotar(b, a) { const c = Math.cos(a), s = Math.sin(a), vx = b.vx; b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c; }
  function caminarYDisparar(m, e, p, dt, distancia, tipo) {
    const d = ENEMIGOS[e.tipo], dx = p.x - e.x;
    e.dir = dx < 0 ? -1 : 1;
    e.vx = e.quieto || Math.abs(dx) <= distancia ? 0 : e.dir * d.vel;
    e.t -= dt;
    // La tuerca va a la altura de la cabeza: agacharse la esquiva (y saltarla también).
    if (e.t <= 0 && Math.abs(dx) < 260 && visible(m, e.x)) { dispararE(m, e.x + e.dir * 10, e.y - 21, e.dir * 125, 0, tipo); e.t = d.cad; }
  }
  function saltarHacia(m, e, p, dt, d) {
    e.t -= dt;
    if (e.suelo) e.vx = 0;
    if (e.suelo && e.t <= 0 && Math.abs(p.x - e.x) < 280) { e.dir = p.x < e.x ? -1 : 1; e.vx = e.dir * d.vel; e.vy = -260; e.suelo = false; e.t = d.cad; }
  }
  function enemigos(m, dt) {
    for (const e of m.enemigos) if (e.vivo) actualizarEnemigo(m, e, dt);
  }
  function actualizarEnemigo(m, e, dt) {
    if (e.x < m.cam.x - 80) { e.vivo = false; return; }
    if (e.golpeT > 0) e.golpeT -= dt;
    if (!activo(m, e)) return;
    const p = objetivo(m, e.x);
    if (p) IA_ENEMIGO[e.tipo](m, e, p, dt);
    const d = ENEMIGOS[e.tipo];
    if (d.suelo) {
      if (!e.suelo) e.vy = Math.min(CAIDA_MAX, e.vy + GRAV * dt);
      mover(m.def, e, d.w, dt, false);
    }
    contactoEnemigo(m, e, d);
  }
  function contactoEnemigo(m, e, d) {
    for (const p of m.jugadores) {
      if (p.estado !== 'vivo' || p.inv > 0) continue;
      const c = cajaJugador(p);
      if (solapa(c.x, c.y, c.w, c.h, e.x - d.w / 2, e.y - d.h, d.w, d.h)) herir(m, p.i, e.tipo);
    }
  }
  function danarEnemigo(m, e, dano, i) {
    e.hp -= dano; e.golpeT = 0.1;
    if (e.hp > 0) return;
    e.vivo = false;
    const d = ENEMIGOS[e.tipo];
    m.ev.push({ tipo: 'boom', x: e.x, y: e.y - d.h / 2, enemigo: e.tipo, i, id: e.id });
    const p = m.jugadores[i];
    if (!e.paga || !p || m.cobrados.has(e.clave)) return;
    m.cobrados.add(e.clave); p.puntos += d.puntos; p.robots++;
  }

  // ================= Jefes (patrones con semilla) =================
  function crearJefe(m, tipo, arenaX, mini) {
    const d = JEFES[tipo], hp = Math.round(d.hp * m.esc.jefe);
    m.jefe = {
      tipo, mini, arena: arenaX, w: d.w, h: d.h, hp, hpMax: hp, casa: arenaX + d.casa, x: arenaX + W + d.w / 2 + 10,
      y: d.vuela || sueloEn(m.def, arenaX + d.casa), yCasa: d.vuela || sueloEn(m.def, arenaX + d.casa),
      fase: 'entrada', faseT: 0, dur: 1.6, previo: '', golpeT: 0, oculto: false, invul: true, aviso: false, n: 0, objX: 0, vx: 0,
    };
  }
  const rapidez = j => (j.hp < j.hpMax / 2 ? 1.3 : 1);
  function jefe(m, dt) {
    const j = m.jefe;
    if (!j) return;
    if (j.golpeT > 0) j.golpeT -= dt;
    j.faseT += dt * rapidez(j);
    const p = objetivo(m, j.x);
    if (j.fase === 'entrada') entradaJefe(j);
    else if (j.fase === 'pausa') flotar(m, j, dt);
    else ATAQUES[j.fase].tick(m, j, p, dt);
    if (j.faseT >= j.dur) siguienteFase(m, j);
    if (!j.oculto) contactoJefe(m, j);
  }
  function entradaJefe(j) {
    const f = Math.min(1, j.faseT / j.dur);
    j.x = j.arena + W + j.w / 2 + 10 + (j.casa - (j.arena + W + j.w / 2 + 10)) * f;
  }
  function flotar(m, j, dt) {
    if (!JEFES[j.tipo].vuela) { j.x = acercar(j.x, j.casa, 90 * dt); return; }
    j.x = j.casa + 80 * Math.sin(m.t * 0.7); j.y = j.yCasa + 8 * Math.sin(m.t * 1.3);
  }
  function siguienteFase(m, j) {
    j.invul = false; j.oculto = false; j.aviso = false; j.n = 0;
    if (j.fase !== 'pausa') { j.previo = j.fase === 'entrada' ? '' : j.fase; j.fase = 'pausa'; j.faseT = 0; j.dur = 0.9; return; }
    const opciones = JEFES[j.tipo].ataques.filter(a => a !== j.previo);
    j.fase = opciones[Math.floor(m.rnd() * opciones.length)];
    j.faseT = 0; j.dur = ATAQUES[j.fase].dur;
    if (ATAQUES[j.fase].inicio) ATAQUES[j.fase].inicio(m, j);
    m.ev.push({ tipo: 'ataque', ataque: j.fase });
  }
  function contactoJefe(m, j) {
    for (const p of m.jugadores) {
      if (p.estado !== 'vivo' || p.inv > 0) continue;
      const c = cajaJugador(p);
      if (solapa(c.x, c.y, c.w, c.h, j.x - j.w / 2, j.y - j.h, j.w, j.h)) herir(m, p.i, j.tipo);
    }
  }
  function danarJefe(m, j, dano, i) {
    if (j.invul || j.oculto || j.hp <= 0) return false;
    j.hp -= dano; j.golpeT = 0.08;
    if (j.hp > 0) return true;
    m.ev.push({ tipo: 'jefeFin', jefe: j.tipo, mini: j.mini, x: j.x, y: j.y - j.h / 2, i });
    const p = m.jugadores[i];
    if (p) p.puntos += j.mini ? PUNTOS.minijefe : PUNTOS.jefe;
    m.jefe = null; m.cam.bloqueo = null;
    for (const e of m.enemigos) if (e.vivo && e.invocado) { e.vivo = false; m.ev.push({ tipo: 'boom', x: e.x, y: e.y - 8, enemigo: e.tipo, i: -1, id: e.id }); }
    for (const b of m.balasE) b.vivo = false;
    for (const a of m.avisos) a.vivo = false;
    if (j.mini) m.miniHecho = true;
    else { m.jefeHecho = true; m.estado = 'victoria'; m.estT = 0; }
    return true;
  }
  // Una salida del jefe en arco que cae cerca de x (gravedad g, tiempo de vuelo T).
  function arco(m, x0, y0, xf, T, tipo, r) {
    const g = 600;
    return dispararE(m, x0, y0, (xf - x0) / T, -g * T / 2, tipo, { g, r: r || 7 });
  }
  const objetivoAzar = (m, j) => { const vs = vivos(m); return vs.length ? vs[Math.floor(m.rnd() * vs.length)].x : j.arena + 100; };
  function invocar(m, j, tipo) {
    if (m.enemigos.filter(e => e.vivo && e.invocado).length >= 4) return;
    const e = ponerEnemigo(m, tipo, j.x - j.w / 2 - 10, tipo === 'dron' ? j.y + 10 : 0, { invocado: true });
    if (e && tipo === 'dron') e.baseY = 120;
  }
  // Disparos que salen a ciertos segundos de la fase (cada momento una sola vez).
  function enMomentos(j, momentos, f) {
    while (j.n < momentos.length && j.faseT >= momentos[j.n]) f(j.n++);
  }
  const ATAQUES = {
    engranes: { dur: 2.4, tick: (m, j) => enMomentos(j, [0.3, 0.9, 1.5], () => arco(m, j.x - 40, j.y - 64, objetivoAzar(m, j) + (m.rnd() - 0.5) * 60, 1 + m.rnd() * 0.4, 'engrane')) },
    rocas: { dur: 2.2, tick: (m, j) => enMomentos(j, [0.2, 0.6, 1.0, 1.4], () => arco(m, j.x - 44, j.y - 50, objetivoAzar(m, j) + (m.rnd() - 0.5) * 80, 0.8 + m.rnd() * 0.4, 'roca', 6)) },
    embestida: {
      dur: 3.2,
      tick(m, j, _p, dt) {
        j.aviso = j.faseT < 0.8;
        if (j.faseT < 0.8) return;
        const tope = j.casa - 150;
        if (j.faseT < 2) j.x = Math.max(tope, j.x - 230 * dt); else j.x = acercar(j.x, j.casa, 150 * dt);
      },
    },
    saltabots: { dur: 1.6, tick: (m, j) => enMomentos(j, [0.4, 1.0], () => invocar(m, j, 'saltabot')) },
    polvo: {
      dur: 2.4,
      tick(m, j) {
        j.aviso = j.faseT < 0.6;
        enMomentos(j, [0.6, 1.3], () => dispararE(m, j.x - j.w / 2, j.y - 6, -170, 0, 'onda', { w: 18, h: 12, vida: 4 }));
      },
    },
    pinzas: { dur: 2.0, tick: (m, j) => enMomentos(j, [0.2, 0.55, 0.9, 1.25], k => dispararE(m, j.x - j.w / 2, j.y - (k % 2 ? 24 : 8), -165, 0, 'pinza')) },
    cola: {
      dur: 1.9,
      inicio: (m, j) => ponerAviso(m, 'rayo', j.arena, j.y - 8, j.x - j.w / 2 - j.arena, 0.9),
      tick(m, j) {
        enMomentos(j, [0.9], () => dispararE(m, j.arena, j.y - 14, 0, 0, 'rayo', { w: j.x - j.w / 2 - j.arena, h: 12, vida: 0.45, r: 0 }));
      },
    },
    excavar: {
      dur: 3,
      inicio(m, j) { j.objX = acotar(objetivoAzar(m, j), j.arena + 40, j.arena + W - 40); ponerAviso(m, 'polvo', j.objX, j.yCasa, 70, 1.1); },
      tick(m, j, _p, dt) {
        j.invul = j.faseT < 1.1; j.oculto = j.faseT < 1.1;
        enMomentos(j, [1.1], () => { j.x = j.objX; dispararE(m, j.objX - 35, j.yCasa - 60, 0, 0, 'erupcion', { w: 70, h: 60, vida: 0.4, r: 0 }); });
        if (j.faseT > 1.6) j.x = acercar(j.x, j.casa, 120 * dt);
      },
    },
    cajas: {
      dur: 2.6,
      tick(m, j) {
        enMomentos(j, [0.1, 0.5, 0.9], () => {
          const x = acotar(objetivoAzar(m, j) + (m.rnd() - 0.5) * 40, j.arena + 20, j.arena + W - 20);
          ponerAviso(m, 'sombra', x, sueloEn(m.def, x), 26, 0.7);
          dispararE(m, x, -30, 0, 0, 'caja', { g: 0, r: 9, retraso: 0.7, vy0: 200 });
        });
      },
    },
    gancho: {
      dur: 2.6,
      tick(m, j) {
        j.aviso = j.faseT < 0.6;
        enMomentos(j, [0.6], () => dispararE(m, j.x - j.w / 2, j.yCasa - 34, -220, 0, 'gancho', { w: 26, h: 12, vida: 3, r: 0 }));
      },
    },
    tuercas: { dur: 1.4, tick: (m, j, p) => enMomentos(j, [0.3, 0.8], () => { if (p) apuntado(m, j.x - j.w / 2, j.y - j.h * 0.7, p, 150, 'tuerca'); }) },
    lluvia: {
      dur: 2.8,
      tick(m, j) {
        enMomentos(j, [0.1, 0.35, 0.6, 0.85, 1.1, 1.35], () => {
          const x = acotar(j.arena + 30 + m.rnd() * (W - 60), j.arena + 20, j.arena + W - 20);
          ponerAviso(m, 'sombra', x, sueloEn(m.def, x), 18, 0.6);
          dispararE(m, x, j.y, 0, 0, 'tuerca', { g: 0, retraso: 0.6, vy0: 230 });
        });
      },
    },
    triple: {
      dur: 1.7,
      tick: (m, j, p) => enMomentos(j, [0.3, 1.0], () => {
        if (!p) return;
        for (const a of [-0.25, 0, 0.25]) { const b = apuntado(m, j.x, j.y - j.h / 2, p, 140, 'bola'); if (b) rotar(b, a); }
      }),
    },
    minibots: { dur: 1.4, tick: (m, j) => enMomentos(j, [0.3, 0.9], () => invocar(m, j, 'dron')) },
    aliens: { dur: 1.4, tick: (m, j) => enMomentos(j, [0.3, 0.9], () => invocar(m, j, 'alien')) },
    columnas: {
      dur: 2.3,
      inicio(m, j) {
        j.cols = [0, 1, 2].map(k => acotar(j.arena + 50 + (k + m.rnd()) * (W - 140) / 3, j.arena + 20, j.arena + W - 20));
        for (const x of j.cols) ponerAviso(m, 'columna', x, 0, 22, 0.9);
      },
      tick: (m, j) => enMomentos(j, [0.9], () => { for (const x of j.cols) dispararE(m, x - 11, 0, 0, 0, 'columna', { w: 22, h: 240, vida: 0.4, r: 0 }); }),
    },
    orbes: { dur: 2.0, tick: (m, j, p) => enMomentos(j, [0.3, 0.8, 1.3], () => { if (p) apuntado(m, j.x - j.w / 2, j.y - j.h * 0.8, p, 110, 'orbe', { r: 7 }); }) },
    espiral: {
      dur: 2.2,
      tick: (m, j) => enMomentos(j, [0.2, 0.5, 0.8, 1.1, 1.4, 1.7], k => {
        for (let r = 0; r < 5; r++) {
          const a = k * 0.45 + r * (2 * Math.PI / 5);
          dispararE(m, j.x, j.y - j.h / 2, Math.cos(a) * 95, Math.sin(a) * 95, 'orbe', { r: 5 });
        }
      }),
    },
  };

  // ================= Proyectiles =================
  function balas(m, dt) {
    for (const b of m.balas) {
      if (!b.vivo) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
      if (b.vida <= 0 || b.x < m.cam.x - 30 || b.x > m.cam.x + W + 30 || b.y < -40 || b.y >= sueloEn(m.def, b.x)) { b.vivo = false; continue; }
      golpearConBala(m, b);
    }
  }
  // Orden fijo: jaulas, enemigos y jefe; cada parte dice si la bala ya se gastó.
  function golpearConBala(m, b) {
    if (golpearJaulas(m, b) || golpearEnemigos(m, b)) return;
    golpearJefe(m, b);
  }
  const tocaBala = (b, x, y, w, h) => solapa(b.x - b.r, b.y - b.r, 2 * b.r, 2 * b.r, x, y, w, h);
  function golpearJaulas(m, b) {
    for (const j of m.jaulas) {
      if (j.abierta || !tocaBala(b, j.x - 11, j.y - 24, 22, 24)) continue;
      abrirJaula(m, j, b.de);
      if (!b.perfora) { b.vivo = false; return true; }
    }
    return false;
  }
  function golpearEnemigos(m, b) {
    for (const e of m.enemigos) {
      if (!e.vivo || b.hits.includes(e.id)) continue;
      const d = ENEMIGOS[e.tipo];
      if (!tocaBala(b, e.x - d.w / 2, e.y - d.h, d.w, d.h)) continue;
      if (d.escudo && b.vx * e.dir < 0 && Math.abs(b.vy) < Math.abs(b.vx)) { b.vivo = false; m.ev.push({ tipo: 'bloqueo', x: b.x, y: b.y }); return true; }
      danarEnemigo(m, e, b.dano, b.de);
      if (!b.perfora) { b.vivo = false; return true; }
      b.hits.push(e.id);
    }
    return false;
  }
  function golpearJefe(m, b) {
    const j = m.jefe;
    if (!j || b.hits.includes(-1) || !tocaBala(b, j.x - j.w / 2, j.y - j.h, j.w, j.h) || !danarJefe(m, j, b.dano, b.de)) return;
    if (b.perfora) b.hits.push(-1);
    else b.vivo = false;
  }
  function balasEnemigas(m, dt) {
    for (const b of m.balasE) if (b.vivo) actualizarBalaE(m, b, dt);
  }
  function actualizarBalaE(m, b, dt) {
    if (b.retraso > 0) {
      b.retraso -= dt;
      if (b.retraso <= 0) b.vy = b.vy0 || 200;
      return;
    }
    if (b.g) b.vy += b.g * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    const rect = b.w > 0;
    const fuera = b.vida <= 0 || b.x < m.cam.x - 60 || b.x > m.cam.x + W + 60 || b.y > H + 20;
    if (fuera || (!rect && b.y >= sueloEn(m.def, b.x))) { b.vivo = false; return; }
    for (const p of m.jugadores) {
      if (p.estado !== 'vivo') continue;
      const c = cajaJugador(p);
      const toca = rect ? solapa(c.x, c.y, c.w, c.h, b.x, b.y, b.w, b.h) : solapa(c.x, c.y, c.w, c.h, b.x - b.r, b.y - b.r, 2 * b.r, 2 * b.r);
      if (toca && herir(m, p.i, b.tipo) && !rect) { b.vivo = false; return; }
    }
  }
  function globos(m, dt) {
    for (const g of m.globos) {
      if (!g.vivo) continue;
      g.vy += GRAV * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.t += dt;
      if (g.t > 2.5 || g.y >= sueloEn(m.def, g.x) || tocaAlgo(m, g)) reventar(m, g);
    }
  }
  function tocaAlgo(m, g) {
    for (const e of m.enemigos) {
      if (!e.vivo) continue;
      const d = ENEMIGOS[e.tipo];
      if (solapa(g.x - GLOBO.r, g.y - GLOBO.r, 2 * GLOBO.r, 2 * GLOBO.r, e.x - d.w / 2, e.y - d.h, d.w, d.h)) return true;
    }
    const j = m.jefe;
    return !!j && !j.oculto && solapa(g.x - GLOBO.r, g.y - GLOBO.r, 2 * GLOBO.r, 2 * GLOBO.r, j.x - j.w / 2, j.y - j.h, j.w, j.h);
  }
  // Distancia de un punto a una caja.
  const distCaja = (x, y, bx, by, bw, bh) => Math.hypot(Math.max(bx - x, 0, x - (bx + bw)), Math.max(by - y, 0, y - (by + bh)));
  function reventar(m, g) {
    g.vivo = false;
    m.ev.push({ tipo: 'globo', x: g.x, y: g.y, i: g.de });
    for (const e of m.enemigos) {
      if (!e.vivo) continue;
      const d = ENEMIGOS[e.tipo];
      if (distCaja(g.x, g.y, e.x - d.w / 2, e.y - d.h, d.w, d.h) <= GLOBO.area) danarEnemigo(m, e, GLOBO.dano, g.de);
    }
    for (const j of m.jaulas) if (!j.abierta && distCaja(g.x, g.y, j.x - 11, j.y - 24, 22, 24) <= GLOBO.area) abrirJaula(m, j, g.de);
    const j = m.jefe;
    if (j && distCaja(g.x, g.y, j.x - j.w / 2, j.y - j.h, j.w, j.h) <= GLOBO.area) danarJefe(m, j, GLOBO.dano, g.de);
  }
  function objetos(m, dt) {
    for (const o of m.objetos) if (o.vivo) caerObjeto(m, o, dt);
    for (const a of m.avisos) {
      if (!a.vivo) continue;
      a.t -= dt;
      if (a.t <= 0) a.vivo = false;
    }
    for (const v of m.vehiculos) if (v.vivo) vehiculoSolo(m, v, dt);
  }
  function caerObjeto(m, o, dt) {
    o.t += dt;
    if (o.flota) return;
    const piso = sueloEn(m.def, o.x);
    o.vy = Math.min(CAIDA_MAX, o.vy + GRAV * dt); o.y = Math.min(piso, o.y + o.vy * dt);
    if (o.y >= piso) o.vy = 0;
  }
  // Vehículo sin conductor: cae y se queda donde lo dejaron.
  function vehiculoSolo(m, v, dt) {
    if (v.inv > 0) v.inv -= dt;
    if (v.ocupante >= 0) return;
    if (!v.suelo) v.vy = Math.min(CAIDA_MAX, v.vy + GRAV * dt);
    mover(m.def, v, 34, dt, false);
  }

  // ================= Estado de la misión =================
  function estadoMision(m, dt) {
    m.estT += dt;
    if (m.estado === 'intro' && m.estT >= INTRO_S) { m.estado = 'juego'; m.estT = 0; m.ev.push({ tipo: 'arranque' }); }
    if (m.estado === 'victoria' && m.estT >= VICTORIA_S) cumplir(m);
    const enPie = m.jugadores.some(p => p.estado === 'vivo' || (p.estado === 'caido' && (p.vidas > 0 || p.estT > 0)));
    if (!enPie && m.estado !== 'cumplida' && m.estado !== 'victoria') { m.estado = 'fallida'; m.estT = 0; m.ev.push({ tipo: 'fallida' }); }
  }
  const bonoTiempo = (meta, seg) => Math.max(0, Math.round((meta - seg) * 10));
  function cumplir(m) {
    m.estado = 'cumplida'; m.estT = 0; m.completadaEn = m.t;
    const bono = bonoTiempo(m.def.tiempoMeta, m.t);
    for (const p of m.jugadores) p.puntos += bono;
    m.ev.push({ tipo: 'cumplida', bono });
  }
  function paso(m, entradas) {
    if (m.estado === 'cumplida' || m.estado === 'fallida') { const ev = m.ev; m.ev = []; return ev; }
    const dt = PASO;
    m.t += dt;
    m.jugadores.forEach((p, i) => actualizarJugador(m, p, (entradas && entradas[i]) || QUIETO, dt));
    camara(m, dt);
    checkpoints(m);
    aparecer(m);
    enemigos(m, dt);
    jefe(m, dt);
    balas(m, dt); balasEnemigas(m, dt); globos(m, dt); objetos(m, dt);
    estadoMision(m, dt);
    const ev = m.ev; m.ev = [];
    return ev;
  }
  const QUIETO = { x: 0, y: 0, a: false, b: false, ga: false, gx: false, gy: false };

  // Reintento desde el último punto de control (o desde el inicio): el equipo vuelve con sus vidas.
  function reintentar(m) {
    const cpX = m.cp >= 0 ? m.cps[m.cp] : 60;
    m.reintentos++; m.estado = 'juego'; m.estT = 0;
    m.cam.x = Math.max(0, Math.min(cpX - 140, m.def.largo - W)); m.cam.bloqueo = null; m.cam.liga = 0;
    for (const lista of [m.enemigos, m.balas, m.balasE, m.globos, m.avisos]) for (const x of lista) x.vivo = false;
    m.jefe = null;
    m.sig = m.lista.findIndex(a => a.x >= cpX + 120);
    if (m.sig < 0) m.sig = m.lista.length;
    for (const v of m.vehiculos) v.ocupante = -1;
    m.jugadores.forEach((p, k) => {
      const x = acotar(cpX - 40 - 18 * k, m.cam.x + 16, m.cam.x + W - 16);
      Object.assign(p, { estado: 'vivo', vidas: VIDAS, cor: COR, inv: INV_RESPAWN, x, y: sueloEn(m.def, x), vx: 0, vy: 0, suelo: true, plat: -1, vehiculo: -1, revive: 0, agachado: false });
    });
    m.ev.push({ tipo: 'reintento', desde: cpX });
  }

  // ================= Piloto automático (compañeros IA, quien se desconecta y pruebas) =================
  function entradaIA() { return { x: 0, y: 0, a: false, b: false, ga: false, gx: false, gy: false }; }
  // Blanco más cercano en la ventana: enemigos (los de atrás cuentan 60 px más) y luego jaulas (30 px menos).
  function blancoIA(m, p) {
    const r = { d: Infinity, b: null };
    enemigoCercano(m, p, r);
    jaulaCercana(m, p, r);
    const mejor = r.b, j = m.jefe;
    if (!j || j.oculto || j.fase === 'entrada') return mejor;
    return mejor && Math.abs(mejor.x - p.x) < 90 ? mejor : { x: j.x, y: j.y - j.h / 2, jefe: j };
  }
  function enemigoCercano(m, p, r) {
    for (const e of m.enemigos) {
      if (!e.vivo || !visible(m, e.x)) continue;
      const d = Math.abs(e.x - p.x) + (e.x < p.x ? 60 : 0);
      if (d < r.d) { r.d = d; r.b = { x: e.x, y: e.y - ENEMIGOS[e.tipo].h / 2, e }; }
    }
  }
  function jaulaCercana(m, p, r) {
    for (const j of m.jaulas) {
      if (j.abierta || !visible(m, j.x)) continue;
      const d = Math.abs(j.x - p.x) - 30;
      if (d < r.d) { r.d = d; r.b = { x: j.x, y: j.y - 12, jaula: j }; }
    }
  }
  // ¿Viene algo que hay que saltar, esquivar agachado o de lado? { accion, x } con x = de dónde viene.
  function peligroIA(m, p) {
    return peligroBalas(m, p) || peligroAvisos(m, p) || peligroSaltones(m, p);
  }
  function peligroBalas(m, p) {
    for (const b of m.balasE) {
      if (!b.vivo || b.retraso > 0) continue;
      const r = b.w > 0 ? peligroRect(p, b) : peligroBala(p, b);
      if (r) return { accion: r, x: b.w > 0 ? b.x + b.w / 2 : b.x };
    }
    return null;
  }
  const AVISOS_DE_LADO = new Set(['columna', 'sombra', 'polvo']);
  function peligroAvisos(m, p) {
    for (const a of m.avisos) {
      if (!a.vivo) continue;
      if (a.tipo === 'rayo' && a.t < 0.2) return { accion: 'saltar', x: a.x };
      if (AVISOS_DE_LADO.has(a.tipo) && Math.abs(a.x - p.x) < a.w / 2 + 14) return { accion: 'apartar', x: a.x };
    }
    return null;
  }
  function peligroSaltones(m, p) {
    for (const e of m.enemigos) if (e.vivo && (e.tipo === 'saltabot' || e.tipo === 'alien') && Math.abs(e.x - p.x) < 34 && p.suelo) return { accion: 'saltar', x: e.x };
    return null;
  }
  // Proyectiles en caja (ondas, ganchos, rayos, columnas, erupciones).
  function peligroRect(p, b) {
    const c = { x: p.x - ANCHO / 2, y: p.y - ALTO, w: ANCHO, h: ALTO };
    if (!solapa(c.x - 30, c.y, c.w + 60, c.h, b.x + b.vx * 0.25, b.y, b.w, b.h)) return null;
    if (b.tipo === 'gancho') return 'agachar';
    return b.tipo === 'columna' || b.tipo === 'erupcion' ? 'apartar' : 'saltar';
  }
  // Proyectil redondo: tiempo hasta llegar a la caja de pie y altura a la que llega.
  function peligroBala(p, b) {
    const dx = p.x - b.x;
    if (Math.abs(b.vx) < 20) {
      const llega = b.vy > 0 && Math.abs(dx) < ANCHO / 2 + b.r + 6 && (p.y - ALTO - b.y) / b.vy < 0.7;
      return llega ? 'apartar' : null;
    }
    if (Math.sign(b.vx) !== Math.sign(dx)) return null;
    const t = Math.max(0, (Math.abs(dx) - ANCHO / 2 - b.r) / Math.abs(b.vx));
    if (t > 0.42) return null;
    const y = b.y + b.vy * t + (b.g || 0) * t * t / 2;
    if (y + b.r < p.y - ALTO || y - b.r > p.y) return null;
    if (y + b.r <= p.y - ALTO_AGACHADO && !b.g) return 'agachar';
    if (b.g || b.vy > 80) return 'apartar';
    return t < 0.3 ? 'saltar' : null;
  }
  function destinoIA(m, p, blanco) {
    const izq = m.cam.x + 24, der = m.cam.x + W - 36;
    const caida = m.jugadores.find(q => q.estado === 'burbuja');
    if (caida) return caida.x;
    const j = m.jefe;
    if (j) return destinoJefe(p, j, izq, der);
    const hacia = blanco && blanco.e ? destinoEnemigo(m, p, blanco, izq, der) : null;
    return hacia === null ? der : hacia;
  }
  // Frente al jefe: a distancia (o en la diagonal si vuela); si está escondido, al centro de la arena.
  function destinoJefe(p, j, izq, der) {
    if (j.oculto) return acotar(j.arena + 120, izq, der);
    const lejos = JEFES[j.tipo].vuela ? Math.max(j.w / 2 + 40, p.y - 17 - (j.y - j.h / 2)) : j.w / 2 + 120;
    return acotar(j.x - lejos, izq, der);
  }
  // null = seguir avanzando.
  function destinoEnemigo(m, p, blanco, izq, der) {
    const dx = blanco.x - p.x, dy = blanco.y - (p.y - 17);
    if (esEscudo(blanco) && (p.globos === 0 || p.vehiculo >= 0)) return blanco.x + blanco.e.dir * -30; // por arriba y por detrás
    // Blanco alto: a la diagonal de 45° (o debajo, si está muy arriba).
    if (dy < -30) return acotar(blanco.x - (signo(dx) || 1) * Math.min(-dy, 150), izq, der);
    if (!lineaLibre(m, p, blanco)) return blanco.x;
    return dx >= 40 && dx < 140 ? p.x : null;
  }
  // ¿El disparo de pie llega al blanco sin chocar con un escalón?
  function lineaLibre(m, p, blanco) {
    const y = p.y - 17, d = signo(blanco.x - p.x) * 8, n = Math.floor((Math.abs(blanco.x - p.x) - 12) / 8);
    for (let k = 1; k <= n; k++) if (sueloEn(m.def, p.x + d * k) <= y + 4) return false;
    return true;
  }
  const esEscudo = blanco => !!(blanco && blanco.e && ENEMIGOS[blanco.e.tipo].escudo);
  function ia(m, i) {
    const p = m.jugadores[i], e = entradaIA();
    if (!p || p.estado !== 'vivo' || m.estado === 'cumplida' || m.estado === 'fallida') return e;
    const blanco = blancoIA(m, p), riesgo = peligroIA(m, p), peligro = riesgo && riesgo.accion;
    const meta = peligro === 'apartar' ? apartarse(m, p, riesgo) : destinoIA(m, p, blanco);
    const mover = Math.abs(meta - p.x) > 6 ? signo(meta - p.x) : 0;
    const k = palancaIA(p, e, blanco, mover);
    if (peligro === 'agachar' && p.suelo) { e.x = 0; e.y = 1; }
    else if (!peligro && p.suelo && blanco && (k === 0 || k === 4)) tiroBajo(p, e, blanco);
    e.b = !!blanco;
    saltoIA(m, p, e, peligro, mover, blanco);
    // En una plataforma con el blanco abajo (desde el suelo no se apunta en diagonal hacia abajo): bajar.
    if (p.plat >= 0 && p.suelo && blanco && blanco.y > p.y + 8 && !e.ga) { e.y = 1; e.x = 0; e.ga = true; }
    globoIA(m, p, e, blanco);
    armaIA(p, e);
    return e;
  }
  // Lejos de lo que viene (del otro lado si ya no hay espacio en la ventana).
  function apartarse(m, p, riesgo) {
    const lado = riesgo.x > p.x ? -1 : 1, libre = lado < 0 ? p.x - 40 > m.cam.x + 16 : p.x + 40 < m.cam.x + W - 16;
    return p.x + (libre ? lado : -lado) * 60;
  }
  // Apuntado al blanco (o al frente) con la misma palanca: si no camina, una inclinación chica solo apunta.
  function palancaIA(p, e, blanco, mover) {
    let ax = p.dir, ay = 0;
    if (blanco) { ax = blanco.x - p.x; ay = blanco.y - (p.y - 17); }
    const k = apuntar(ax, ay, ax < 0 ? -1 : 1, p.suelo, false), d = DIRS[k];
    if (mover) { e.x = mover; e.y = d[1] * (Math.abs(d[0]) > 0.1 && signo(d[0]) !== mover ? 0 : 1); }
    else { e.x = d[0] * 0.28; e.y = d[1] * 0.28; }
    return k;
  }
  function armaIA(p, e) {
    if (p.iaArma > 0) { p.iaArma -= 1 / 60; return; }
    if (p.arma === 'burbuja' && ORDEN_ARMAS.some(a => p.mun[a] > 0)) { e.gy = true; p.iaArma = 2; }
  }
  // Blanco más abajo que el disparo de pie (un escalón): agacharse para tirar bajo o, si ni así, acercarse.
  function tiroBajo(p, e, blanco) {
    const alto = blanco.e ? ENEMIGOS[blanco.e.tipo].h : 24, abajo = blanco.e ? blanco.e.y : blanco.y + 12, arriba = abajo - alto;
    const pega = y => y + 4 > arriba && y - 4 < abajo;
    if (pega(p.y - 17)) return;
    const hacia = signo(blanco.x - p.x) || p.dir;
    if (pega(p.y - 9)) { e.x = hacia * 0.15; e.y = 1; return; }
    if (abajo > p.y) { e.x = hacia; e.y = 0; }
  }
  function saltoIA(m, p, e, peligro, mover, blanco) {
    if (p.iaSalto > 0) { p.iaSalto -= 1 / 60; e.a = true; }
    if (!p.suelo) {
      if (esEscudo(blanco) && Math.abs(blanco.x - p.x) < 34) { e.y = 1; e.x = signo(e.x) * 0.25; }
      return;
    }
    const delante = mover ? sueloEn(m.def, p.x + mover * 14) : p.y;
    const pared = mover && (delante < p.y - ESCALON || p.pared);
    const encima = blanco && blanco.e && ENEMIGOS[blanco.e.tipo].suelo && Math.abs(blanco.x - p.x) < (esEscudo(blanco) ? 64 : 36);
    if (peligro === 'saltar' || pared || encima) { e.ga = true; e.a = true; p.iaSalto = 0.3; if (encima) e.x = signo(blanco.x - p.x) || p.dir; }
    p.pared = false;
  }
  function globoIA(m, p, e, blanco) {
    if (p.iaGlobo > 0) { p.iaGlobo -= 1 / 60; return; }
    if (!blanco || p.globos <= 0 || p.vehiculo >= 0) return;
    const cerca = m.enemigos.filter(x => x.vivo && Math.abs(x.x - p.x) < 140).length;
    const escudo = blanco.e && ENEMIGOS[blanco.e.tipo].escudo && Math.abs(blanco.x - p.x) < 150 && signo(blanco.x - p.x) === p.dir;
    const jefeCerca = blanco.jefe && Math.abs(blanco.x - p.x) < 170 && !JEFES[blanco.jefe.tipo].vuela;
    if (cerca >= 3 || escudo || jefeCerca) { e.gx = true; p.iaGlobo = 1.4; }
  }

  // ================= Puntos, estrellas, resumen y plausibilidad =================
  function estrellas(m) {
    if (m.estado !== 'cumplida') return 0;
    return 1 + (m.jaulas.every(j => j.abierta) ? 1 : 0) + (m.reintentos === 0 ? 1 : 0);
  }
  const puntosRanking = puntos => Math.max(0, Math.min(1000, Math.round((Number(puntos) || 0) / 20)));
  // Máximo que una sola persona puede juntar en la misión con n personajes (enemigos de la lista con sus copias,
  // jefes, rescates, premios, objetos, estrellas y bono de tiempo) + holgura.
  function puntosMaximos(id, n) {
    const def = MIS().porId(id);
    if (!def) return 0;
    let enemigos = 0;
    def.enemigos.forEach((e, k) => { enemigos += ENEMIGOS[e[1]].puntos * (1 + copiasExtra(k, n)); });
    const objetos = def.objetos.reduce((s, o) => s + (o[1] === 'estrella' ? PUNTOS.estrella : PUNTOS.objeto), 0);
    const jaulas = def.jaulas.length * (PUNTOS.rescate + PUNTOS.objeto + PUNTOS.objeto);
    return enemigos + objetos + jaulas + (def.minijefe ? PUNTOS.minijefe : 0) + PUNTOS.jefe + def.tiempoMeta * 10 + 1000;
  }
  function resumen(m) {
    const puntos = m.jugadores.map(p => p.puntos);
    return {
      mision: m.mision, completada: m.estado === 'cumplida', ms: Math.round((m.completadaEn ?? m.t) * 1000), estrellas: estrellas(m),
      puntos, equipo: puntos.reduce((s, x) => s + x, 0), robots: m.jugadores.reduce((s, p) => s + p.robots, 0),
      rescatados: m.jaulas.filter(j => j.abierta).length, jaulas: m.jaulas.length, reintentos: m.reintentos,
    };
  }

  // ================= Avance (forma exacta y versionada: design.md §10) =================
  const VERSION_AVANCE = 1, COMPANEROS = [0, 1, 3];
  const progresoVacio = () => ({ ver: VERSION_AVANCE, desbloqueada: 1, personaje: 'xalli', misiones: {}, companeros: 0, totales: { robots: 0, rescatados: 0, completadas: 0 } });
  function registrarMision(prog, r) {
    const p = structuredClone(prog && validarProgreso(prog) ? prog : progresoVacio());
    const k = String(r.mision), antes = p.misiones[k] || { estrellas: 0, record: 0, mejorMs: null };
    const tope = puntosMaximos(r.mision, 8);
    const ms = r.completada ? acotar(Math.round(r.ms), 20000, 3600000) : null;
    p.misiones[k] = {
      estrellas: Math.max(antes.estrellas, r.completada ? acotar(Math.round(r.estrellas), 1, 3) : 0),
      record: Math.max(antes.record, acotar(Math.round(r.puntos) || 0, 0, tope)),
      mejorMs: ms === null ? antes.mejorMs : Math.min(antes.mejorMs ?? Infinity, ms),
    };
    if (r.completada) p.desbloqueada = Math.max(p.desbloqueada, Math.min(MIS().LISTA.length, Number(r.mision) + 1));
    const t = p.totales;
    t.robots = Math.min(1e7, t.robots + Math.max(0, Math.round(r.robots) || 0));
    t.rescatados = Math.min(1e6, t.rescatados + Math.max(0, Math.round(r.rescatados) || 0));
    t.completadas = Math.min(1e6, t.completadas + (r.completada ? 1 : 0));
    return p;
  }
  const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const entero = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
  const llaves = (o, ks) => { const k = Object.keys(o); return k.length === ks.length && ks.every(x => k.includes(x)); };
  function misionValida(k, v, desbloqueada) {
    const id = Number(k), n = MIS().LISTA.length;
    if (!/^[1-9]$/.test(k) || id > n || id > desbloqueada) return false;
    if (!esObj(v) || !llaves(v, ['estrellas', 'record', 'mejorMs'])) return false;
    if (!entero(v.estrellas, 0, 3) || !entero(v.record, 0, puntosMaximos(id, 8))) return false;
    if (v.estrellas === 0) return v.mejorMs === null;
    return entero(v.mejorMs, 20000, 3600000) && desbloqueada >= Math.min(n, id + 1);
  }
  function validarProgreso(d) {
    if (!esObj(d) || !llaves(d, ['ver', 'desbloqueada', 'personaje', 'misiones', 'companeros', 'totales'])) return false;
    if (d.ver !== VERSION_AVANCE || !entero(d.desbloqueada, 1, MIS().LISTA.length) || !PERSONAJES.includes(d.personaje) || !COMPANEROS.includes(d.companeros)) return false;
    if (!esObj(d.misiones) || !Object.entries(d.misiones).every(([k, v]) => misionValida(k, v, d.desbloqueada))) return false;
    const t = d.totales;
    return esObj(t) && llaves(t, ['robots', 'rescatados', 'completadas']) && entero(t.robots, 0, 1e7) && entero(t.rescatados, 0, 1e6) && entero(t.completadas, 0, 1e6);
  }

  raiz.BrigadaMotor = {
    W, H, PASO, VEL, SALTO, GRAV, COR, VIDAS, VIDA_VEHICULO, PERSONAJES, DIRS, ARMAS, ORDEN_ARMAS, GLOBO, ENEMIGOS, JEFES, PREMIOS, PUNTOS,
    VERSION_AVANCE, COMPANEROS, INTRO_S, VICTORIA_S, LIGA_S,
    rng, escala, copiasExtra, sueloEn, apuntar, crearMision, paso, ia, reintentar, herir, cajaJugador, ponerEnemigo, ponerObjeto,
    contarBalas: m => contar(m.balas), contarEnemigos: m => contar(m.enemigos), contarObjetos: m => contar(m.objetos),
    estrellas, puntosRanking, puntosMaximos, bonoTiempo, resumen, progresoVacio, registrarMision, validarProgreso, mover, QUIETO,
  };
})(typeof window !== 'undefined' ? window : globalThis);
