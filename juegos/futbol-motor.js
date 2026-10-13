/* Motor de «⚽ Fútbol Estelar 2010» (openspec: futbol-estelar). Sin DOM ni dependencias: lo cargan juegos/futbol.html,
   juegos/futbol-liga.js y las pruebas de Deno (server/futbol_motor_test.ts). Determinista: todo el azar sale de la
   semilla del partido, así que las mismas entradas dan el mismo partido.
   Unidades: metros y segundos. Cancha de 105 × 68 con el centro en (0, 0): x a lo largo, y a lo ancho (positivo = la
   banda lejana de la cámara) y z la altura. Cada equipo ataca hacia `lado` (+1 o −1) y cambia en el medio tiempo.
   Decisiones (física, posesión, patadas, IA, cartas y reanudaciones) en openspec/changes/futbol-estelar/design.md. */
(function (raiz) {
  'use strict';

  // ================= Azar con semilla (igual que juegos/arcade.js) =================
  function fnv(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; } // NOSONAR: aritmética entera de 32 bits del generador con semilla, no es truncado
  const rngDe = (semilla, etiqueta) => mulberry(fnv(semilla + '|' + etiqueta));
  const gauss = r => (r() + r() + r() + r() - 2) * 1.73; // ~N(0, 1)

  // ================= Utilidades =================
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function difAng(a, b) {
    let d = (b - a) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }
  // Distancia del punto c al segmento a→b.
  function distSegmento(c, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(c.x - a.x - dx * t, c.y - a.y - dy * t);
  }

  // ================= Cancha, balón y tablas =================
  const MX = 52.5, MY = 34, POSTE = 3.66, TRAVESANO = 2.44, AREA_X = 16.5, AREA_Y = 20.16, PENAL = 11, CIRCULO = 9.15;
  const PASO = 1 / 60, GRAV = 9.81;
  const FRENO = 1.5, ARRASTRE = 0.5, AIRE = 0.05, REBOTE = 0.55, FRICCION_REBOTE = 0.8;
  const BOTONES = ['pase', 'tiro', 'hueco', 'elevado', 'sprint', 'cambiar'];
  const PATADAS = ['pase', 'tiro', 'hueco', 'elevado'];
  const NADA = { x: 0, y: 0, pase: false, tiro: false, hueco: false, elevado: false, sprint: false, cambiar: false };

  // Cartas de habilidad pasivas (design.md §5).
  const CARTAS = [
    { id: 'hueco', nombre: 'Pase al hueco', icono: '🎯', d: 'Pases al hueco más precisos y con mejor ventaja.' },
    { id: 'lejano', nombre: 'Tirador lejano', icono: '🚀', d: 'Tiros de más de 20 m más fuertes y precisos.' },
    { id: 'muro', nombre: 'Muro', icono: '🧱', d: 'Gana más entradas y corta más pases.' },
    { id: 'regate', nombre: 'Regateador', icono: '🌀', d: 'Gira rápido con el balón y se lo quitan menos.' },
    { id: 'felino', nombre: 'Portero felino', icono: '🐱', d: 'Reacciona antes y se estira más.' },
    { id: 'cabeza', nombre: 'Cabeceador', icono: '🎩', d: 'Más alcance y precisión por arriba.' },
    { id: 'veloz', nombre: 'Velocista', icono: '⚡', d: 'Corre más rápido y acelera más.' },
    { id: 'pulmon', nombre: 'Incansable', icono: '🔋', d: 'Se cansa mucho menos al hacer sprint.' },
  ];
  const CARTA = Object.fromEntries(CARTAS.map(c => [c.id, c]));

  // Formaciones: [rol, u (0 = su portería … 1 = la rival), v (−1 … 1 a lo ancho)] en orden POR, DEF, MED, DEL.
  const FORMACIONES = {
    '4-4-2': [['POR', 0.02, 0], ['DEF', 0.2, -0.66], ['DEF', 0.17, -0.22], ['DEF', 0.17, 0.22], ['DEF', 0.2, 0.66],
      ['MED', 0.42, -0.66], ['MED', 0.38, -0.2], ['MED', 0.38, 0.2], ['MED', 0.42, 0.66], ['DEL', 0.6, -0.18], ['DEL', 0.6, 0.18]],
    '4-3-3': [['POR', 0.02, 0], ['DEF', 0.2, -0.66], ['DEF', 0.17, -0.22], ['DEF', 0.17, 0.22], ['DEF', 0.2, 0.66],
      ['MED', 0.37, -0.4], ['MED', 0.33, 0], ['MED', 0.37, 0.4], ['DEL', 0.6, -0.6], ['DEL', 0.64, 0], ['DEL', 0.6, 0.6]],
    '3-5-2': [['POR', 0.02, 0], ['DEF', 0.18, -0.42], ['DEF', 0.16, 0], ['DEF', 0.18, 0.42],
      ['MED', 0.42, -0.75], ['MED', 0.36, -0.3], ['MED', 0.32, 0], ['MED', 0.36, 0.3], ['MED', 0.42, 0.75], ['DEL', 0.6, -0.18], ['DEL', 0.6, 0.18]],
    '5-3-2': [['POR', 0.02, 0], ['DEF', 0.24, -0.75], ['DEF', 0.17, -0.38], ['DEF', 0.15, 0], ['DEF', 0.17, 0.38], ['DEF', 0.24, 0.75],
      ['MED', 0.38, -0.42], ['MED', 0.36, 0], ['MED', 0.38, 0.42], ['DEL', 0.58, -0.18], ['DEL', 0.58, 0.18]],
  };
  const TACTICA_BASE = { formacion: '4-4-2', linea: 50, ancho: 50, mentalidad: 50, presion: 50 };

  // Niveles de la IA (design.md §4). El equipo de una persona usa NIVEL_HUMANO para sus compañeros automáticos.
  const NIVELES = {
    facil: { vel: 0.82, reaccion: 0.6, errPase: 0.16, errTiro: 1.6, presion: 0.4, entradas: 0.5, portero: 0.12, ruido: 0.6, decide: 0.6, tira: 0.75 },
    medio: { vel: 0.93, reaccion: 0.4, errPase: 0.09, errTiro: 1, presion: 0.75, entradas: 0.8, portero: 0.05, ruido: 0.35, decide: 0.42, tira: 0.9 },
    dificil: { vel: 1, reaccion: 0.28, errPase: 0.05, errTiro: 0.7, presion: 1, entradas: 1, portero: 0, ruido: 0.18, decide: 0.3, tira: 1 },
    leyenda: { vel: 1.05, reaccion: 0.18, errPase: 0.03, errTiro: 0.5, presion: 1.2, entradas: 1.15, portero: -0.03, ruido: 0.08, decide: 0.2, tira: 1.05 },
  };
  const NIVEL_HUMANO = { vel: 1, reaccion: 0.3, errPase: 0.06, errTiro: 0.8, presion: 0.85, entradas: 0.9, portero: 0.04, ruido: 0.15, decide: 0.3, tira: 1 };

  // ================= Física del balón =================
  // En el piso: frenado constante más arrastre lineal; en el aire: gravedad y poco arrastre; rebote con restitución.
  function moverBalon(b, dt) {
    if (b.z > 0 || b.vz > 0) { vueloBalon(b, dt); return; }
    const v = Math.hypot(b.vx, b.vy);
    if (v === 0) return;
    const k = Math.max(0, v - (FRENO + ARRASTRE * v) * dt) / v;
    b.vx *= k; b.vy *= k; b.vz = 0;
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  function vueloBalon(b, dt) {
    const f = 1 - AIRE * dt;
    b.vx *= f; b.vy *= f; b.vz -= GRAV * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z > 0) return;
    b.z = 0;
    if (b.vz < -1.5) { b.vz = -b.vz * REBOTE; b.vx *= FRICCION_REBOTE; b.vy *= FRICCION_REBOTE; } else b.vz = 0;
  }
  // Distancia que rueda un balón lanzado a `v` (forma cerrada del frenado) y su inversa por bisección.
  const distanciaRodando = v => v / ARRASTRE - FRENO / (ARRASTRE * ARRASTRE) * Math.log(1 + ARRASTRE * v / FRENO);
  function velocidadPara(d) {
    let a = 0, b = 45;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (distanciaRodando(m) < d) a = m; else b = m; }
    return (a + b) / 2;
  }

  // ================= Equipos y jugadores =================
  // Equipo de prueba: 11 iguales en 4-4-2 (la carta va a los de campo, salvo «felino», que va al portero).
  function equipoGenerico(corto, media, carta) {
    const paraPortero = carta === 'felino';
    return {
      nombre: 'Equipo ' + corto, corto, formacion: '4-4-2',
      uniforme: { c1: '#d32f2f', c2: '#ffffff', patron: 'liso' }, portero: { c1: '#111827', c2: '#facc15' },
      jugadores: FORMACIONES['4-4-2'].map(([rol], k) => ({
        nombre: corto + ' ' + (k + 1), num: k + 1, pos: rol, vel: media, pas: media, tir: media, def: media, fis: media,
        por: rol === 'POR' ? media : 30, reg: media, carta: (rol === 'POR') === paraPortero ? carta || null : null,
        piel: k % 4, pelo: k % 4, g: k % 2 ? 'f' : 'm',
      })),
    };
  }
  function crearJugador(datos, eq, slot, rol, i) {
    return {
      i, eq, slot, rol, datos, carta: datos.carta || null,
      a: { vel: datos.vel, pas: datos.pas, tir: datos.tir, def: datos.def, fis: datos.fis, por: datos.por, reg: datos.reg },
      x: 0, y: 0, vx: 0, vy: 0, dir: 0, energia: 1, aturdido: 0, sinTocar: 0, barrida: 0, lanza: null, reaccion: 0,
      anim: 'parado', animT: 0, fase: 0, humano: -1, deseo: { vx: 0, vy: 0, sprint: false },
      ia: { decide: 0, plan: null, sprint: false, corre: 0, sigCorre: 0, conBalonDesde: 0 }, pend: null,
    };
  }
  const tiene = (j, c) => j.carta === c;
  const nivelDe = (p, eq) => p.eq[eq].nivel;
  const esHumano = j => j.humano >= 0;

  // ---- Atributos con cartas y cansancio ----
  function velocidadTope(p, j, sprint) {
    let v = 5.6 + j.a.vel * 0.03;
    if (tiene(j, 'veloz')) v *= 1.05;
    if (!sprint) v *= 0.72;
    v *= 0.75 + 0.25 * j.energia;
    if (p.dueno === j.i) v *= 0.9;
    return v * nivelDe(p, j.eq).vel;
  }
  function giro(p, j, conBalon) {
    let g = 6;
    if (conBalon) g = 3.4 + (tiene(j, 'regate') ? 1.4 : 0) + j.a.reg * 0.01;
    if (j.deseo.sprint) g *= 0.7;
    return g;
  }
  const reaccionPortero = (p, j) => 0.4 - (j.a.por - 60) * 0.003 + nivelDe(p, j.eq).portero - (tiene(j, 'felino') ? 0.06 : 0);
  const alcancePortero = j => 0.85 + (tiene(j, 'felino') ? 0.35 : 0);
  const umbralControl = j => 10 + j.a.reg * 0.1 + (tiene(j, 'regate') ? 2 : 0) + (j.rol === 'POR' ? 4 : 0);

  // ================= Coordenadas de equipo =================
  // u: 0 = la línea de su portería, 1 = la rival (según el lado que ataca); v: −1 … 1 a lo ancho.
  const uDe = (lado, x) => (x * lado + MX) / (2 * MX);
  const xDeU = (lado, u) => (u * 2 * MX - MX) * lado;
  const porteriaPropia = (p, eq) => ({ x: -MX * p.eq[eq].lado, y: 0 });
  const porteriaRival = (p, eq) => ({ x: MX * p.eq[eq].lado, y: 0 });
  const delEquipo = (p, eq) => p.jug.filter(j => j.eq === eq);
  const portero = (p, eq) => p.jug.find(j => j.eq === eq && j.rol === 'POR') || p.jug[eq * 11];
  // u del penúltimo rival (la línea del fuera de lugar) visto desde el equipo `eq`, nunca antes de la media cancha.
  function lineaRival(p, eq) {
    const lado = p.eq[eq].lado;
    const us = delEquipo(p, 1 - eq).map(j => uDe(lado, j.x)).sort((a, b) => b - a);
    return Math.max(us[1] || 0.5, 0.5);
  }

  // ================= Crear el partido =================
  function crearPartido(cfg) {
    const c = { minutos: 4, dificultad: 'medio', fueraDeLugar: true, eliminatoria: false, humanos: [], ...cfg };
    const p = {
      cfg: c, rng: rngDe(c.semilla, 'partido'), t: 0, duracion: clamp(Number(c.minutos) || 4, 1, 6) * 60, minuto: 0, mitad: 1,
      estado: 'parada', balon: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }, dueno: -1, ultimoToque: -1, posesion: -1,
      eq: [], jug: [], humanos: [], eventos: [], parada: null, offside: null, pase: null, tiro: null, penal: null, tanda: null,
      stats: { tiros: [0, 0], puerta: [0, 0], pases: [0, 0], posesion: [0, 0], faltas: [0, 0] },
      ultimos: false, iaPausada: false, saqueInicial: 0, golT: 0, medioT: 0, golEq: -1, tray: [], cache: null, ultimoPoste: -9,
    };
    for (let e = 0; e < 2; e++) armarEquipo(p, e);
    c.humanos.forEach(h => p.humanos.push({ eq: h.eq, jug: -1, prev: { ...NADA }, carga: null, cola: null, cambioT: 0, lanzaY: 0 }));
    p.humanos.forEach((h, k) => asignarHumano(p, k, masCercanoAlBalon(p, h.eq, -1)));
    saque(p, 0);
    return p;
  }
  function armarEquipo(p, e) {
    const datos = p.cfg.equipos[e], extra = (p.cfg.tacticas || [])[e] || {};
    const tactica = { ...TACTICA_BASE, formacion: datos.formacion || '4-4-2', ...extra };
    if (!FORMACIONES[tactica.formacion]) tactica.formacion = '4-4-2';
    const conHumano = (p.cfg.humanos || []).some(h => h.eq === e);
    const nombreNivel = (p.cfg.dificultades || [])[e] || p.cfg.dificultad;
    p.eq.push({ datos, lado: e === 0 ? 1 : -1, goles: 0, tactica, nivel: conHumano ? NIVEL_HUMANO : NIVELES[nombreNivel] || NIVELES.medio, doble: false });
    const slots = FORMACIONES[tactica.formacion];
    datos.jugadores.slice(0, 11).forEach((d, k) => p.jug.push(crearJugador(d, e, k, slots[k][0], e * 11 + k)));
  }
  // Cambiar la táctica a medio partido (pausa): los mismos jugadores toman los puestos de la formación nueva.
  function cambiarTactica(p, e, tactica) {
    const t = { ...p.eq[e].tactica, ...tactica };
    if (!FORMACIONES[t.formacion]) t.formacion = '4-4-2';
    p.eq[e].tactica = t;
    delEquipo(p, e).forEach(j => { j.rol = FORMACIONES[t.formacion][j.slot][0]; });
  }

  // ================= Eventos =================
  const evento = (p, tipo, extra) => { p.eventos.push({ tipo, t: p.t, minuto: p.minuto, ...extra }); };

  // ================= Personas =================
  function asignarHumano(p, k, i) {
    const h = p.humanos[k];
    if (!h || i < 0) return;
    if (h.jug >= 0 && p.jug[h.jug].humano === k) p.jug[h.jug].humano = -1;
    h.jug = i;
    p.jug[i].humano = k;
  }
  function masCercanoAlBalon(p, eq, excluir, sinPortero = true) {
    let mejor = -1, md = Infinity;
    for (const j of delEquipo(p, eq)) {
      if (j.i === excluir || (sinPortero && j.rol === 'POR') || (j.humano >= 0 && j.i !== excluir)) continue;
      const d = dist(j, p.balon);
      if (d < md) { md = d; mejor = j.i; }
    }
    return mejor;
  }
  function flancos(h, ent) {
    const baja = {}, sube = {};
    for (const b of BOTONES) { baja[b] = !!ent[b] && !h.prev[b]; sube[b] = !ent[b] && !!h.prev[b]; }
    h.prev = { ...ent };
    return { baja, sube };
  }
  // El joystick (pantalla: y hacia abajo) al mundo (y positivo = banda lejana, arriba en la pantalla).
  const joystick = ent => { const x = clamp(Number(ent.x) || 0, -1, 1), y = -clamp(Number(ent.y) || 0, -1, 1), m = Math.hypot(x, y); return m > 1 ? { x: x / m, y: y / m, m: 1 } : { x, y, m }; };

  function actualizarHumanos(p, entradas, dt) {
    p.eq[0].doble = false; p.eq[1].doble = false;
    p.humanos.forEach((h, k) => humano(p, h, k, entradas[k] || NADA, dt));
  }
  function humano(p, h, k, ent, dt) {
    const fl = flancos(h, ent);
    if (h.carga) h.carga.t = Math.min(1.2, h.carga.t + dt);
    if (p.estado === 'parada') { humanoParada(p, h, k, ent, fl); return; }
    if (p.estado === 'penal' || p.estado === 'tanda') { humanoPenal(p, h, k, ent, fl); return; }
    if (p.estado !== 'juego') return;
    autoCambio(p, h, k);
    if (fl.baja.cambiar) { asignarHumano(p, k, masCercanoAlBalon(p, h.eq, h.jug)); h.cambioT = p.t; }
    const j = p.jug[h.jug];
    if (!j) return;
    const s = joystick(ent);
    j.deseo = { vx: s.x * velocidadTope(p, j, !!ent.sprint), vy: s.y * velocidadTope(p, j, !!ent.sprint), sprint: !!ent.sprint };
    if (j.aturdido > 0 || j.barrida > 0) return;
    if (p.dueno === j.i) humanoConBalon(p, h, j, s, fl);
    else humanoSinBalon(p, h, j, ent, s, fl);
  }
  // Cambio automático: al jugador que recibe o al más cercano al balón cuando el tuyo quedó lejos.
  function autoCambio(p, h, k) {
    const d = p.dueno >= 0 ? p.jug[p.dueno] : null;
    if (d && d.eq === h.eq) {
      if (d.humano < 0) asignarHumano(p, k, d.i);
      return;
    }
    if (p.t - h.cambioT < 1) return;
    const c = p.cache && p.cache.chaser[h.eq];
    const mejor = c && c.i >= 0 ? c.i : masCercanoAlBalon(p, h.eq, -1);
    if (mejor < 0 || mejor === h.jug || p.jug[mejor].humano >= 0) return;
    if (dist(p.jug[mejor], p.balon) + 7 < dist(p.jug[h.jug], p.balon)) { asignarHumano(p, k, mejor); h.cambioT = p.t; }
  }
  // Barra de potencia: se carga al apretar y se patea al soltar ese botón.
  function cargar(h, fl) {
    if (!h.carga) {
      const b = PATADAS.find(x => fl.baja[x]);
      if (b) h.carga = { boton: b, t: 0 };
      return null;
    }
    if (!fl.sube[h.carga.boton]) return null;
    const c = h.carga; h.carga = null;
    return { tipo: c.boton, potencia: clamp(c.t / 1, 0, 1) };
  }
  function humanoConBalon(p, h, j, s, fl) {
    const k = cargar(h, fl);
    if (k) patear(p, j, k.tipo, k.potencia, s.m > 0.3 ? s : null);
  }
  function humanoSinBalon(p, h, j, ent, s, fl) {
    const k = cargar(h, fl);
    const d = p.dueno >= 0 ? p.jug[p.dueno] : null;
    if (k && !d && dist(j, p.balon) < 4) h.cola = { ...k, dir: s.m > 0.3 ? s : null, t: p.t }; // de primera
    if (d && d.eq !== j.eq) { defensaHumana(p, h, j, ent, fl, d); return; }
    // Recibir: con el joystick suelto va solo al balón que le pasaron.
    if (s.m < 0.2 && p.pase && p.pase.a === j.i && p.dueno < 0) irA(p, j, llegada(p, j).pt, true);
  }
  function defensaHumana(p, h, j, ent, fl, d) {
    if (fl.baja.tiro) { entrada(p, j); return; }
    if ((fl.baja.pase && ent.sprint) || fl.baja.elevado) { barrida(p, j); return; } // A con sprint o Y: barrida
    if (ent.hueco) p.eq[j.eq].doble = true;
    if (ent.pase) irA(p, j, puntoContencion(p, j, d), !!ent.sprint || dist(j, d) > 4);
    if (h.carga && h.carga.boton !== 'tiro') h.carga = null; // en defensa no hay barra
  }

  // ================= Moverse =================
  function irA(p, j, punto, sprint) {
    const dx = punto.x - j.x, dy = punto.y - j.y, d = Math.hypot(dx, dy);
    if (d < 0.25) { j.deseo = { vx: 0, vy: 0, sprint: false }; return; }
    const v = Math.min(velocidadTope(p, j, sprint), d * 2.4);
    j.deseo = { vx: dx / d * v, vy: dy / d * v, sprint: !!sprint };
  }
  function moverJugador(p, j, dt) {
    if (j.barrida > 0) { j.x += j.vx * dt; j.y += j.vy * dt; j.vx *= 1 - 1.6 * dt; j.vy *= 1 - 1.6 * dt; return; }
    const quieto = j.aturdido > 0;
    const acel = (7 + (tiene(j, 'veloz') ? 1.5 : 0) + j.a.fis * 0.01) * dt;
    const dvx = (quieto ? 0 : j.deseo.vx) - j.vx, dvy = (quieto ? 0 : j.deseo.vy) - j.vy, m = Math.hypot(dvx, dvy);
    const k = m > acel ? acel / m : 1;
    j.vx += dvx * k; j.vy += dvy * k;
    j.x = clamp(j.x + j.vx * dt, -MX - 3, MX + 3); j.y = clamp(j.y + j.vy * dt, -MY - 3, MY + 3);
    orientar(p, j, dt);
    cansancio(p, j, dt);
  }
  function orientar(p, j, dt) {
    const v = Math.hypot(j.vx, j.vy);
    const objetivo = v > 0.4 ? Math.atan2(j.vy, j.vx) : Math.atan2(p.balon.y - j.y, p.balon.x - j.x);
    const d = difAng(j.dir, objetivo), g = giro(p, j, p.dueno === j.i) * dt * (v > 0.4 ? 1 : 0.5);
    j.dir += clamp(d, -g, g);
  }
  function cansancio(p, j, dt) {
    const v = Math.hypot(j.vx, j.vy);
    if (j.deseo.sprint && v > velocidadTope(p, j, false) * 0.95) j.energia = Math.max(0, j.energia - (tiene(j, 'pulmon') ? 0.036 : 0.06) * (1.3 - j.a.fis / 200) * dt);
    else j.energia = Math.min(1, j.energia + 0.012 * dt);
  }
  // Animación para la página: corre (con fase por distancia), patea, barre, cae o se lanza.
  function animar(j, dt) {
    j.animT = Math.max(0, j.animT - dt);
    const v = Math.hypot(j.vx, j.vy);
    j.fase = (j.fase + v * dt / 2.2) % 1;
    if (j.barrida > 0) j.anim = 'barre';
    else if (j.lanza) j.anim = 'lanza';
    else if (j.aturdido > 0.2 && j.anim === 'cae') j.anim = 'cae';
    else if (j.animT > 0) j.anim = 'patea';
    else j.anim = v > 0.5 ? 'corre' : 'parado';
  }
  // Los jugadores no se enciman: se separan un poco si quedan a menos de 0.7 m.
  function separar(p) {
    const J = p.jug;
    for (let a = 0; a < J.length; a++) {
      for (let b = a + 1; b < J.length; b++) empujar(J[a], J[b]);
    }
  }
  function empujar(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 0.7 || d === 0) return;
    const f = (0.7 - d) / 2 / d;
    a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f;
  }

  // ================= Posesión =================
  function darBalon(p, i) {
    p.dueno = i; p.posesion = p.jug[i].eq; p.balon.z = 0; p.balon.vz = 0;
    p.jug[i].ia.conBalonDesde = p.t;
    p.jug[i].ia.decide = p.t + nivelDe(p, p.jug[i].eq).decide * 0.6;
    p.jug[i].ia.plan = null;
  }
  function soltarBalon(p) { p.dueno = -1; }
  // Conducción: el balón va delante del cuerpo con un retraso según el control (más lejos en sprint).
  function llevarBalon(p, dt) {
    const j = p.jug[p.dueno], b = p.balon;
    if (j.aturdido > 0) { soltarBalon(p); return; }
    const v = Math.hypot(j.vx, j.vy);
    const lejos = 0.45 + v * 0.09 + (j.deseo.sprint ? 0.35 : 0) - (tiene(j, 'regate') ? 0.1 : 0);
    const tx = j.x + Math.cos(j.dir) * lejos, ty = j.y + Math.sin(j.dir) * lejos;
    const k = clamp((9 + j.a.reg * 0.06 + (tiene(j, 'regate') ? 3 : 0)) * dt, 0, 1);
    b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; b.z = 0; b.vx = j.vx; b.vy = j.vy; b.vz = 0;
  }
  // Toque del balón: revisa el fuera de lugar y anota al último que tocó.
  function registrarToque(p, j) {
    if (p.offside) {
      const o = p.offside;
      p.offside = null;
      if (p.cfg.fueraDeLugar && j.eq === o.eq && o.ids.includes(j.i)) {
        evento(p, 'fuera_lugar', { eq: j.eq, i: j.i });
        crearParada(p, 'libre', 1 - j.eq, j.x, j.y);
        return false;
      }
    }
    p.ultimoToque = j.i;
    if (p.pase && j.i !== p.pase.de) p.pase = null;
    if (p.tiro && j.eq !== p.tiro.eq) p.tiro = null;
    return true;
  }
  // Balón suelto: lo toma (o rebota en) el jugador más cercano a su alcance.
  function contactos(p) {
    const b = p.balon;
    let mejor = null, md = Infinity;
    for (const j of p.jug) {
      if (j.aturdido > 0 || j.sinTocar > 0) continue;
      const d = dist(j, b);
      if (d < alcance(p, j, b) && d < md) { md = d; mejor = j; }
    }
    if (!mejor) return;
    if (mejor.rol === 'POR' && enSuArea(p, mejor)) porteroToca(p, mejor);
    else if (b.z > 1.05 && !alPecho(p, mejor)) cabezazo(p, mejor);
    else controlar(p, mejor);
  }
  function alcance(p, j, b) {
    if (j.rol === 'POR' && enSuArea(p, j)) {
      if (b.z >= 2.5) return 0;
      return alcancePortero(j) + (j.lanza ? 0.5 : 0);
    }
    if (b.z <= 1.05) return 0.7 + (tiene(j, 'muro') ? 0.15 : 0);
    if (b.z >= 2.6) return 0;
    return 0.7 + (tiene(j, 'cabeza') ? 0.35 : 0);
  }
  // Control con el pecho o el muslo: balón a media altura que no viene fuerte (fuera del área rival).
  const alPecho = (p, j) => p.balon.z < 1.8 && Math.hypot(p.balon.vx - j.vx, p.balon.vy - j.vy) < umbralControl(j) * 0.8 && !(enAreaRival(p, j) && p.balon.vz < 0);
  const enSuArea = (p, j) => { const g = porteriaPropia(p, j.eq); return Math.abs(j.x - g.x) < AREA_X && Math.abs(j.y) < AREA_Y; };
  const enAreaRival = (p, j) => { const g = porteriaRival(p, j.eq); return Math.abs(j.x - g.x) < AREA_X && Math.abs(j.y) < AREA_Y; };
  // Primer toque: si el balón llega más rápido que su umbral, rebota con un desvío.
  function controlar(p, j) {
    const b = p.balon, rel = Math.hypot(b.vx - j.vx, b.vy - j.vy);
    if (!registrarToque(p, j)) return;
    if (rel <= umbralControl(j)) {
      darBalon(p, j.i);
      deLaCola(p, j);
      return;
    }
    const a = Math.atan2(b.vy, b.vx) + Math.PI * (p.rng() < 0.5 ? 0.15 : -0.15) + gauss(p.rng) * 0.5;
    const v = Math.hypot(b.vx, b.vy) * 0.45;
    b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.vz = 1;
    j.sinTocar = 0.3;
  }
  // Patada «de primera» que la persona pidió justo antes de recibir.
  function deLaCola(p, j) {
    if (j.humano < 0) return;
    const h = p.humanos[j.humano];
    if (h.cola && p.t - h.cola.t < 0.45) patear(p, j, h.cola.tipo, h.cola.potencia, h.cola.dir);
    h.cola = null;
  }
  function cabezazo(p, j) {
    if (!registrarToque(p, j)) return;
    const b = p.balon, g = porteriaRival(p, j.eq), c = tiene(j, 'cabeza');
    j.sinTocar = 0.4; j.animT = 0.3;
    if (enAreaRival(p, j)) {
      const objetivoY = (p.rng() < 0.5 ? -1 : 1) * (POSTE - 0.8);
      const a = Math.atan2(objetivoY - j.y, g.x - j.x) + gauss(p.rng) * (c ? 0.07 : 0.13);
      const v = 12 + (c ? 3 : 0);
      Object.assign(b, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: -0.5 + p.rng() * 1.5 });
      p.tiro = { eq: j.eq, t: p.t }; p.stats.tiros[j.eq]++;
      evento(p, 'tiro', { eq: j.eq, i: j.i, cabeza: true });
      return;
    }
    const a = Math.atan2(-j.y * 0.3, p.eq[j.eq].lado) + gauss(p.rng) * 0.4;
    Object.assign(b, { vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, vz: 1.2 });
    evento(p, 'patada', { eq: j.eq, i: j.i, tipo: 'cabeza' });
  }
  function porteroToca(p, j) {
    const fuerte = !!p.tiro && p.tiro.eq !== j.eq;
    if (!registrarToque(p, j)) return;
    const b = p.balon, rel = Math.hypot(b.vx - j.vx, b.vy - j.vy);
    j.lanza = null;
    if (rel < 19 + j.a.por * 0.06) {
      darBalon(p, j.i);
      if (fuerte) { p.stats.puerta[1 - j.eq]++; evento(p, 'atajada', { eq: j.eq, i: j.i }); }
      p.tiro = null;
      return;
    }
    const lado = p.eq[j.eq].lado;
    const a = Math.atan2(b.y * 0.2 + (p.rng() - 0.5) * 6, lado * 4);
    const v = rel * 0.32;
    Object.assign(b, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 2 + p.rng() * 3 });
    j.sinTocar = 0.6;
    if (fuerte) p.stats.puerta[1 - j.eq]++;
    evento(p, 'atajada', { eq: j.eq, i: j.i, rechace: true });
  }

  // ================= Patadas =================
  // tipo: pase | hueco | elevado | tiro (| banda). potencia 0–1. dir: { x, y } del joystick en el mundo o null.
  // Si el cuerpo mira muy lejos de hacia donde va el balón, primero gira (la patada espera, design.md §3).
  function patear(p, j, tipo, potencia, dir, opciones = {}) {
    if (p.dueno !== j.i) return false;
    const plan = planPatada(p, j, tipo, potencia, dir, opciones.receptor);
    const giroFalta = Math.abs(difAng(j.dir, plan.ang));
    if (giroFalta > 0.6 && !opciones.forzar) { j.pend = { tipo, potencia, dir, receptor: opciones.receptor, t: 0 }; return 'espera'; }
    ejecutarPatada(p, j, plan, giroFalta);
    return true;
  }
  function ejecutarPatada(p, j, plan, giroFalta) {
    const b = p.balon, sigma = errorPatada(p, j, plan) + giroFalta * 0.25;
    const a = plan.ang + gauss(p.rng) * sigma;
    b.x = j.x + Math.cos(j.dir) * 0.5; b.y = j.y + Math.sin(j.dir) * 0.5; b.z = 0;
    b.vx = Math.cos(a) * plan.v; b.vy = Math.sin(a) * plan.v; b.vz = Math.max(0, plan.vz + gauss(p.rng) * plan.errZ);
    soltarBalon(p);
    j.sinTocar = 0.3; j.animT = 0.25; j.pend = null;
    p.ultimoToque = j.i;
    evento(p, 'patada', { eq: j.eq, i: j.i, tipo: plan.tipo });
    if (plan.tipo === 'tiro') {
      p.tiro = { eq: j.eq, t: p.t }; p.stats.tiros[j.eq]++; p.pase = null;
      evento(p, 'tiro', { eq: j.eq, i: j.i, potencia: plan.potencia });
      return;
    }
    p.stats.pases[j.eq]++;
    p.pase = { de: j.i, a: plan.receptor ? plan.receptor.i : -1, t: p.t, tipo: plan.tipo };
    marcarFueraDeLugar(p, j);
    if (plan.receptor && j.humano >= 0) asignarHumano(p, j.humano, plan.receptor.i);
  }
  function errorPatada(p, j, plan) {
    const n = nivelDe(p, j.eq), presion = presionSobre(p, j) ? 1.4 : 1;
    if (plan.tipo === 'tiro') {
      const lejano = tiene(j, 'lejano') && plan.d > 20 ? 0.7 : 1;
      return (0.015 + (100 - j.a.tir) / 100 * 0.05) * (1 + plan.d / 30) * n.errTiro * lejano * presion;
    }
    const hueco = plan.tipo === 'hueco' && tiene(j, 'hueco') ? 0.6 : 1;
    return (0.02 + (100 - j.a.pas) / 100 * 0.07) * (n.errPase / 0.06) * hueco * presion * 0.6;
  }
  const presionSobre = (p, j) => p.jug.some(o => o.eq !== j.eq && o.aturdido <= 0 && dist(o, j) < 2);
  function planPatada(p, j, tipo, potencia, dir, receptorFijo) {
    const ang = dir ? Math.atan2(dir.y, dir.x) : j.dir;
    if (tipo === 'tiro') return planTiro(p, j, potencia, dir);
    const r = receptorFijo ? p.jug[receptorFijo] : elegirReceptor(p, j, ang, tipo);
    if (tipo === 'hueco') return planHueco(p, j, r, potencia, ang);
    if (tipo === 'elevado' || tipo === 'banda') return planElevado(p, j, r, potencia, ang, tipo);
    return planPase(p, j, r, potencia, ang);
  }
  function planTiro(p, j, potencia, dir) {
    const g = porteriaRival(p, j.eq), gk = portero(p, 1 - j.eq);
    let objetivoY = (gk.y > 0 ? -1 : 1) * (POSTE - 0.7);
    if (dir && Math.abs(dir.y) > 0.3) objetivoY = clamp(dir.y, -1, 1) * (POSTE - 0.45);
    const d = Math.hypot(g.x - j.x, objetivoY - j.y);
    const v = 17 + potencia * 12 + j.a.tir * 0.03 + (tiene(j, 'lejano') && d > 20 ? 2.5 : 0);
    const errZ = 0.5 + (potencia > 0.85 ? (potencia - 0.85) * 14 : 0) * (1 - j.a.tir / 150);
    return { tipo: 'tiro', ang: Math.atan2(objetivoY - j.y, g.x - j.x), v, vz: 0.6 + potencia * potencia * 4.8 - (d < 12 ? 0.5 : 0), errZ, d, potencia };
  }
  function planPase(p, j, r, potencia, ang) {
    if (!r) return { tipo: 'pase', ang, v: velocidadPara(12) * (0.85 + potencia * 0.5), vz: 0, errZ: 0, d: 12, receptor: null };
    const t = { x: r.x + r.vx * 0.45, y: r.y + r.vy * 0.45 };
    const d = dist(j, t);
    return { tipo: 'pase', ang: Math.atan2(t.y - j.y, t.x - j.x), v: velocidadPara(d + 2.5) * (0.95 + potencia * 0.45), vz: 0, errZ: 0, d, receptor: r };
  }
  function planHueco(p, j, r, potencia, ang) {
    const lado = p.eq[j.eq].lado;
    const base = r || { x: j.x + Math.cos(ang) * 12, y: j.y + Math.sin(ang) * 12, vx: 0, vy: 0 };
    const adelante = 6 + potencia * 8 + (tiene(j, 'hueco') ? 2 : 0);
    const t = { x: clamp(base.x + lado * adelante + base.vx * 0.5, -MX + 2, MX - 2), y: clamp(base.y + base.vy * 0.5, -MY + 2, MY - 2) };
    const d = dist(j, t);
    return { tipo: 'hueco', ang: Math.atan2(t.y - j.y, t.x - j.x), v: velocidadPara(d) * 1.02, vz: 0, errZ: 0, d, receptor: r };
  }
  function planElevado(p, j, r, potencia, ang, tipo) {
    let t = r ? { x: r.x + r.vx * 0.9, y: r.y + r.vy * 0.9 } : { x: j.x + Math.cos(ang) * (18 + potencia * 15), y: j.y + Math.sin(ang) * (18 + potencia * 15) };
    if (!r && esCentro(p, j)) t = puntoCentro(p, j);
    const d = Math.max(4, dist(j, t));
    const largo = tipo === 'banda' ? Math.min(d, 22) : d * 0.82;
    const th = tipo === 'banda' ? 0.42 : 0.62 + potencia * 0.22;
    const v0 = Math.sqrt(largo * GRAV / Math.sin(2 * th));
    return { tipo: 'elevado', ang: Math.atan2(t.y - j.y, t.x - j.x), v: v0 * Math.cos(th), vz: v0 * Math.sin(th), errZ: 0.3, d, receptor: r };
  }
  const esCentro = (p, j) => Math.abs(j.y) > 15 && uDe(p.eq[j.eq].lado, j.x) > 0.72;
  const puntoCentro = (p, j) => { const g = porteriaRival(p, j.eq); return { x: g.x - p.eq[j.eq].lado * (7 + p.rng() * 5), y: -Math.sign(j.y) * (p.rng() * 5) }; };
  // Compañero en la dirección pedida (cono de ~52°; si no hay, el más alineado hasta ~80°).
  function elegirReceptor(p, j, ang, tipo) {
    let mejor = null, ms = Infinity;
    const lado = p.eq[j.eq].lado;
    for (const t of delEquipo(p, j.eq)) {
      if (t.i === j.i || t.aturdido > 0.3) continue;
      const d = dist(j, t), a = Math.abs(difAng(ang, Math.atan2(t.y - j.y, t.x - j.x)));
      if (a > 1.4 || d < 3 || (t.rol === 'POR' && a > 0.5)) continue;
      let s = a * 2.2 + d / 25 + (a > 0.9 ? 3 : 0);
      if (tipo === 'hueco') s -= (uDe(lado, t.x) - uDe(lado, j.x)) * 1.5;
      if (tipo === 'elevado') s += Math.abs(d - 25) / 30;
      if (s < ms) { ms = s; mejor = t; }
    }
    return mejor;
  }
  // Fuera de lugar: al pasar, quien está más allá del penúltimo rival, del balón y en campo rival.
  function marcarFueraDeLugar(p, j) {
    if (!p.cfg.fueraDeLugar) { p.offside = null; return; }
    const lado = p.eq[j.eq].lado, linea = Math.max(lineaRival(p, j.eq), uDe(lado, p.balon.x));
    const ids = delEquipo(p, j.eq).filter(t => t.i !== j.i && uDe(lado, t.x) > linea + 0.004).map(t => t.i);
    p.offside = ids.length ? { eq: j.eq, ids } : null;
  }
  // Patadas que esperaban a que el cuerpo girara.
  function patadasPendientes(p, dt) {
    for (const j of p.jug) {
      if (!j.pend) continue;
      if (p.dueno !== j.i) { j.pend = null; continue; }
      j.pend.t += dt;
      const plan = planPatada(p, j, j.pend.tipo, j.pend.potencia, j.pend.dir, j.pend.receptor);
      const d = difAng(j.dir, plan.ang), g = giro(p, j, true) * 1.6 * dt;
      j.dir += clamp(d, -g, g);
      if (Math.abs(d) < 0.6 || j.pend.t > 0.35) ejecutarPatada(p, j, plan, Math.max(0, Math.abs(d) - 0.6));
    }
  }

  // ================= Defensa =================
  function puntoContencion(p, j, d) {
    const g = porteriaPropia(p, j.eq), dx = g.x - d.x, dy = g.y - d.y, m = Math.hypot(dx, dy) || 1;
    return { x: d.x + d.vx * 0.25 + dx / m * 1.1, y: d.y + d.vy * 0.25 + dy / m * 1.1 };
  }
  // Entrada (B): de frente puede ganar el balón; por detrás es falta. Devuelve 'falta' | 'gana' | 'falla' | 'nada'.
  function entrada(p, d) {
    const o = p.dueno >= 0 ? p.jug[p.dueno] : null;
    d.animT = 0.3;
    if (!o || o.eq === d.eq || dist(d, o) > 1.9 || (o.rol === 'POR' && enSuArea(p, o))) { d.aturdido = 0.3; return 'nada'; }
    const atras = Math.abs(difAng(o.dir, Math.atan2(d.y - o.y, d.x - o.x))) > 2;
    if (atras) { falta(p, d, o, true); return 'falta'; }
    let prob = 0.5 + (d.a.def - o.a.reg) / 150 + (tiene(d, 'muro') ? 0.12 : 0) - (tiene(o, 'regate') ? 0.1 : 0);
    if (!esHumano(d)) prob *= nivelDe(p, d.eq).entradas;
    if (p.rng() < prob) { robar(p, d, o); return 'gana'; }
    d.aturdido = 0.55;
    return 'falla';
  }
  function robar(p, d, o) {
    o.aturdido = 0.35; o.anim = 'cae';
    if (registrarToque(p, d)) darBalon(p, d.i);
    evento(p, 'robo', { eq: d.eq, i: d.i });
  }
  // Barrida (A con sprint): se desliza 0.55 s; toca el balón o, si toca antes al rival, es falta.
  function barrida(p, d) {
    if (d.barrida > 0 || d.aturdido > 0) return;
    d.barrida = 0.55; d.barridaHecha = false;
    d.vx = Math.cos(d.dir) * 7.5; d.vy = Math.sin(d.dir) * 7.5;
  }
  function pasoBarrida(p, d, dt) {
    d.barrida -= dt;
    if (d.barrida <= 0) { d.barrida = 0; d.aturdido = 0.45; return; }
    if (d.barridaHecha) return;
    const pie = { x: d.x + Math.cos(d.dir) * 0.6, y: d.y + Math.sin(d.dir) * 0.6 };
    const o = p.dueno >= 0 ? p.jug[p.dueno] : null;
    if (dist(pie, p.balon) < 1 && p.balon.z < 0.5 && !(o && o.eq === d.eq)) { barridaAlBalon(p, d, o); return; }
    if (o && o.eq !== d.eq && dist(pie, o) < 0.8) { d.barridaHecha = true; falta(p, d, o, Math.abs(difAng(o.dir, d.dir)) < 1.2); }
  }
  function barridaAlBalon(p, d, o) {
    d.barridaHecha = true;
    if (o) { o.aturdido = 0.4; o.anim = 'cae'; }
    soltarBalon(p);
    if (!registrarToque(p, d)) return;
    const a = d.dir + gauss(p.rng) * 0.3;
    Object.assign(p.balon, { vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, vz: 0.5 });
    evento(p, 'robo', { eq: d.eq, i: d.i, barrida: true });
  }
  // Presión: quien presiona de cerca hace que el que lleva el balón lo pierda de vez en cuando.
  function presionSobreDueno(p, dt) {
    const o = p.jug[p.dueno];
    if (o.rol === 'POR' && enSuArea(p, o)) return;
    for (const d of p.jug) {
      if (d.eq === o.eq || d.aturdido > 0 || d.barrida > 0 || dist(d, o) > 1.3) continue;
      let k = 0.35 * (d.a.def / 100) * (1 - o.a.reg / 220) * (tiene(d, 'muro') ? 1.3 : 1) * (tiene(o, 'regate') ? 0.75 : 1);
      if (!esHumano(d)) k *= nivelDe(p, d.eq).presion;
      if (p.rng() < k * dt) { quitarConPresion(p, d, o); return; }
    }
  }
  function quitarConPresion(p, d, o) {
    soltarBalon(p);
    o.sinTocar = 0.3;
    const dx = d.x - o.x, dy = d.y - o.y, m = Math.hypot(dx, dy) || 1;
    Object.assign(p.balon, { vx: dx / m * 3, vy: dy / m * 3, vz: 0 });
    evento(p, 'robo', { eq: d.eq, i: d.i });
  }
  // Falta: tiro libre para el rival o penal si fue dentro del área de quien la cometió.
  function falta(p, infractor, victima, porDetras) {
    p.stats.faltas[infractor.eq]++;
    victima.aturdido = 0.8; victima.anim = 'cae';
    evento(p, 'falta', { eq: infractor.eq, i: infractor.i });
    if (porDetras) evento(p, 'amarilla', { eq: infractor.eq, i: infractor.i });
    const g = porteriaPropia(p, infractor.eq);
    if (Math.abs(victima.x - g.x) < AREA_X && Math.abs(victima.y) < AREA_Y) { iniciarPenal(p, victima.eq, false); return; }
    crearParada(p, 'libre', victima.eq, victima.x, victima.y);
  }

  // ================= Balón: postes, goles y salidas =================
  function revisarBalon(p) {
    const b = p.balon;
    postes(p, b);
    if (Math.abs(b.x) > MX) { finDeCancha(p, b); return; }
    if (Math.abs(b.y) > MY + 0.11) {
      const ut = p.ultimoToque >= 0 ? p.jug[p.ultimoToque].eq : 0;
      evento(p, 'banda', { eq: 1 - ut });
      crearParada(p, 'banda', 1 - ut, clamp(b.x, -MX + 1, MX - 1), Math.sign(b.y) * MY);
    }
  }
  function postes(p, b) {
    if (b.z > TRAVESANO + 0.15 || Math.abs(Math.abs(b.x) - MX) > 0.35) return;
    const s = Math.sign(b.x);
    if (b.vx * s <= 0) return;
    const pegaPoste = Math.abs(Math.abs(b.y) - POSTE) < 0.25 && b.z < TRAVESANO;
    const pegaTravesano = Math.abs(b.y) < POSTE && Math.abs(b.z - TRAVESANO) < 0.15;
    if (!pegaPoste && !pegaTravesano) return;
    b.vx = -b.vx * 0.55; b.x = s * (MX - 0.36);
    if (pegaTravesano) b.vz = -Math.abs(b.vz) * 0.5 - 1;
    if (p.t - p.ultimoPoste > 0.3) evento(p, 'poste', { eq: p.ultimoToque >= 0 ? p.jug[p.ultimoToque].eq : -1 });
    p.ultimoPoste = p.t;
  }
  function finDeCancha(p, b) {
    const s = Math.sign(b.x);
    if (Math.abs(b.y) < POSTE && b.z < TRAVESANO) { gol(p, p.eq[0].lado === s ? 0 : 1); return; }
    const defiende = p.eq[0].lado === -s ? 0 : 1;
    const ut = p.ultimoToque >= 0 ? p.jug[p.ultimoToque].eq : 1 - defiende;
    if (p.tiro) p.tiro = null;
    if (ut === defiende) {
      evento(p, 'esquina', { eq: 1 - defiende });
      crearParada(p, 'esquina', 1 - defiende, s * (MX - 0.3), Math.sign(b.y || 1) * (MY - 0.3));
    } else {
      evento(p, 'meta', { eq: defiende });
      crearParada(p, 'meta', defiende, s * (MX - 5.5), Math.sign(b.y || 1) * 4);
    }
  }
  function gol(p, eq) {
    p.eq[eq].goles++;
    const autor = p.ultimoToque >= 0 ? p.jug[p.ultimoToque] : null;
    p.stats.puerta[eq]++;
    evento(p, 'gol', { eq, i: autor ? autor.i : -1, autogol: !!autor && autor.eq !== eq, marcador: [p.eq[0].goles, p.eq[1].goles] });
    p.estado = 'gol'; p.golT = 0; p.golEq = eq; p.dueno = -1; p.tiro = null; p.pase = null; p.offside = null;
  }

  // ================= Reanudaciones =================
  function saque(p, eq) {
    if (p.mitad === 1 && p.t === 0) p.saqueInicial = eq;
    evento(p, 'saque', { eq });
    crearParada(p, 'saque', eq, 0, 0);
  }
  function crearParada(p, tipo, eq, x, y) {
    p.estado = 'parada'; p.dueno = -1; p.offside = null; p.pase = null; p.tiro = null;
    Object.assign(p.balon, { x, y, z: 0, vx: 0, vy: 0, vz: 0 });
    const tomador = elegirTomador(p, tipo, eq);
    p.parada = { tipo, eq, x, y, t: 0, tomador: tomador.i };
    for (const j of p.jug) { j.pend = null; j.barrida = 0; j.lanza = null; j.obj = objetivoParada(p, j, tomador); }
    p.humanos.forEach((h, k) => { h.carga = null; if (h.eq === eq && tomador.rol !== 'POR' && !p.humanos.some(o => o !== h && o.eq === eq && o.jug === tomador.i)) asignarHumano(p, k, tomador.i); });
  }
  function elegirTomador(p, tipo, eq) {
    if (tipo === 'meta') return portero(p, eq);
    const cand = delEquipo(p, eq).filter(j => j.rol !== 'POR');
    if (tipo === 'saque') return cand.filter(j => j.rol === 'DEL').concat(cand)[0];
    let mejor = cand[0], md = Infinity;
    for (const j of cand) { const d = dist(j, p.balon); if (d < md) { md = d; mejor = j; } }
    return mejor;
  }
  function objetivoParada(p, j, tomador) {
    const b = p.balon, par = p.parada, lado = p.eq[j.eq].lado;
    if (j === tomador) return { x: b.x - lado * 0.45 * (par.tipo === 'banda' ? 0 : 1), y: b.y, dir: Math.atan2(-b.y * 0.3, lado) };
    let o = objetivoFormacion(p, j, j.eq === par.eq);
    if (par.tipo === 'esquina' && j.rol !== 'POR') o = objetivoEsquina(p, j, o);
    if (par.tipo === 'saque') o = { x: lado > 0 ? Math.min(o.x, -0.6) : Math.max(o.x, 0.6), y: o.y };
    if (j.eq !== par.eq) o = lejosDelBalon(o, b, par.tipo === 'banda' ? 2.5 : CIRCULO);
    return { x: o.x, y: o.y, dir: Math.atan2(b.y - o.y, b.x - o.x) };
  }
  function objetivoEsquina(p, j, o) {
    const ataca = j.eq === p.parada.eq, g = ataca ? porteriaRival(p, j.eq) : porteriaPropia(p, j.eq), s = Math.sign(g.x);
    const enArea = ataca ? j.rol !== 'DEF' || j.slot % 2 === 0 : j.rol !== 'DEL';
    if (!enArea) return o;
    const k = j.slot;
    return { x: g.x - s * (4 + (k * 37 % 9)), y: ((k * 53) % 17) - 8 };
  }
  function lejosDelBalon(o, b, r) {
    const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy);
    if (d >= r) return o;
    if (d === 0) return { x: o.x, y: o.y + r };
    return { x: b.x + dx / d * r, y: b.y + dy / d * r };
  }
  function pasoParada(p, entradas, dt) {
    p.t += dt;
    if (reloj(p)) return;
    const par = p.parada;
    par.t += dt;
    actualizarHumanos(p, entradas, dt);
    if (p.estado !== 'parada') return;
    for (const j of p.jug) acomodar(p, j, dt, par.t > 1.6);
    const listo = par.t > 0.9 && dist(p.jug[par.tomador], p.jug[par.tomador].obj) < 0.6;
    const conHumano = p.humanos.some(h => h.eq === par.eq) && !['meta'].includes(par.tipo);
    if (listo && !conHumano && par.t > 1.25) ejecutarParadaIA(p);
    else if (listo && conHumano && par.t > 9) ejecutarParadaIA(p);
  }
  function acomodar(p, j, dt, saltar) {
    const o = j.obj;
    if (!o) return;
    if (saltar) { j.x = o.x; j.y = o.y; }
    const dx = o.x - j.x, dy = o.y - j.y, d = Math.hypot(dx, dy), v = Math.min(10, d * 4);
    if (d > 0.05) { j.vx = dx / d * v; j.vy = dy / d * v; j.x += j.vx * dt; j.y += j.vy * dt; } else { j.vx = 0; j.vy = 0; }
    j.dir += clamp(difAng(j.dir, d > 0.5 ? Math.atan2(dy, dx) : o.dir), -8 * dt, 8 * dt);
    animar(j, dt);
  }
  // La parada empieza: el tomador tiene el balón y patea con el tipo que corresponde.
  function arrancarParada(p) {
    const par = p.parada, j = p.jug[par.tomador];
    Object.assign(j, { x: j.obj.x, y: j.obj.y, vx: 0, vy: 0 });
    p.estado = 'juego'; p.parada = null;
    darBalon(p, j.i);
    return j;
  }
  function ejecutarParadaIA(p) {
    const tipo = p.parada.tipo, j = arrancarParada(p);
    if (tipo === 'libre') { decidirConBalon(p, j, nivelDe(p, j.eq), true); return; }
    const r = receptorParada(p, j, tipo);
    const tipoPatada = { banda: 'banda', esquina: 'elevado', meta: r && dist(j, r) > 25 ? 'elevado' : 'pase' }[tipo] || 'pase';
    j.dir = Math.atan2((r || p.balon).y - j.y, (r || p.balon).x - j.x);
    patear(p, j, tipoPatada, 0.5, null, { receptor: r ? r.i : undefined, forzar: true });
  }
  // En un tiro de esquina conviene buscar a quien está en el área, mejor si cabecea bien.
  function bonoEsquina(p, t, tipo) {
    if (tipo !== 'esquina' || !enAreaRival(p, t)) return 0;
    return tiene(t, 'cabeza') ? 9 : 6;
  }
  function receptorParada(p, j, tipo) {
    const lado = p.eq[j.eq].lado;
    let mejor = null, ms = -Infinity;
    for (const t of delEquipo(p, j.eq)) {
      if (t === j || t.rol === 'POR') continue;
      const d = dist(j, t), libre = Math.min(...delEquipo(p, 1 - j.eq).map(o => dist(o, t)));
      if (tipo === 'banda' && d > 20) continue;
      let s = Math.min(libre, 8) - d / 12 + bonoEsquina(p, t, tipo);
      if (tipo === 'meta') s += uDe(lado, t.x) * 6 + (p.rng() - 0.5) * 3;
      if (s > ms) { ms = s; mejor = t; }
    }
    return mejor;
  }
  // La persona reanuda con los mismos botones (A corto, Y largo o centro, B tiro en tiro libre, X al hueco).
  function humanoParada(p, h, k, ent, fl) {
    const par = p.parada;
    if (par.eq !== h.eq || par.t < 0.8 || h.jug !== par.tomador) return;
    const j = p.jug[par.tomador], s = joystick(ent);
    if (s.m > 0.3) j.dir = Math.atan2(s.y, s.x);
    const c = cargar(h, fl);
    if (!c) return;
    let tipo = c.tipo;
    if (par.tipo === 'banda') tipo = 'banda';
    if (tipo === 'tiro' && par.tipo !== 'libre') tipo = 'elevado';
    arrancarParada(p);
    patear(p, j, tipo, c.potencia, s.m > 0.3 ? s : null, { forzar: true });
  }

  // ================= Penales =================
  // Penal en el partido (falta en el área) o tiro de la tanda. El portero se lanza al lado que eligió.
  function iniciarPenal(p, eq, tanda) {
    const lado = tanda ? 1 : p.eq[eq].lado, gx = lado * MX;
    const tirador = mejorTirador(p, eq, tanda), gk = portero(p, 1 - eq);
    p.estado = tanda ? 'tanda' : 'penal'; p.dueno = -1; p.pase = null; p.offside = null;
    Object.assign(p.balon, { x: gx - lado * PENAL, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    p.penal = { eq, tirador: tirador.i, portero: gk.i, t: 0, fase: 'apuntar', lado, tanda, resultado: null, finT: 0 };
    for (const j of p.jug) { j.pend = null; j.barrida = 0; j.lanza = null; j.vx = 0; j.vy = 0; j.aturdido = 0; colocarPenal(p, j, gx, lado); }
    p.humanos.forEach((h, k) => { h.carga = null; if (h.eq === eq) asignarHumano(p, k, tirador.i); });
    evento(p, 'penal', { eq, i: tirador.i, tanda: !!tanda });
  }
  function mejorTirador(p, eq, tanda) {
    const lista = delEquipo(p, eq).filter(j => j.rol !== 'POR').sort((a, b) => b.a.tir - a.a.tir || a.i - b.i);
    if (!tanda) return lista[0];
    return lista[p.tanda.tiros[eq] % lista.length];
  }
  function colocarPenal(p, j, gx, lado) {
    const pen = p.penal;
    if (j.i === pen.tirador) { j.x = gx - lado * (PENAL + 1.8); j.y = 0; j.dir = lado > 0 ? 0 : Math.PI; return; }
    if (j.i === pen.portero) { j.x = gx - lado * 0.3; j.y = 0; j.dir = lado > 0 ? Math.PI : 0; return; }
    j.x = gx - lado * (AREA_X + 3 + (j.i % 4) * 1.5); j.y = (j.i % 11) * 3.2 - 16; j.dir = lado > 0 ? 0 : Math.PI;
  }
  function pasoPenal(p, entradas, dt) {
    const pen = p.penal;
    pen.t += dt;
    actualizarHumanos(p, entradas, dt);
    if (pen.fase !== 'apuntar') return;
    const conHumano = p.humanos.some(h => h.eq === pen.eq);
    if ((!conHumano && pen.t > 1.4) || pen.t > 10) tirarPenal(p, null, 0.55 + p.rng() * 0.3);
  }
  function humanoPenal(p, h, k, ent, fl) {
    const pen = p.penal;
    if (!pen || pen.fase !== 'apuntar') return;
    const s = joystick(ent);
    if (h.eq !== pen.eq) { h.lanzaY = s.m > 0.3 ? Math.sign(s.y) : 0; h.carga = null; return; }
    const c = cargar(h, fl);
    if (c && pen.t > 0.6) tirarPenal(p, s.m > 0.3 ? s.y : 0, c.potencia);
  }
  // La IA tira al centro de vez en cuando y, si no, a un lado con algo de variación.
  function apunteIA(p) {
    if (p.rng() < 0.18) return 0;
    const lado = p.rng() < 0.5 ? -1 : 1;
    return lado * (0.55 + p.rng() * 0.4);
  }
  function tirarPenal(p, apunte, potencia) {
    const pen = p.penal, j = p.jug[pen.tirador], gk = p.jug[pen.portero];
    let y = apunte;
    if (y === null) y = apunteIA(p);
    Object.assign(j, { x: p.balon.x - pen.lado * 0.4, y: 0, dir: pen.lado > 0 ? 0 : Math.PI });
    darBalon(p, j.i);
    pen.fase = 'vuelo';
    patear(p, j, 'tiro', potencia, { x: pen.lado, y: clamp(y, -1, 1) }, { forzar: true });
    gk.lanza = { x: gk.x, y: diveDelPortero(p, gk, y) * 2.4, t: 0.9 };
    gk.reaccion = p.t;
  }
  function diveDelPortero(p, gk, apunte) {
    const h = p.humanos.find(x => x.eq === gk.eq);
    if (h) return h.lanzaY;
    const atina = 0.33 + (gk.a.por - 70) / 300 + (tiene(gk, 'felino') ? 0.1 : 0);
    if (p.rng() < atina) return Math.sign(apunte);
    return [-1, 0, 1][Math.floor(p.rng() * 3)];
  }
  // Vuelo del penal: física normal; termina en gol, atajada, fuera o balón quieto.
  function vueloPenal(p, dt) {
    const pen = p.penal, b = p.balon;
    moverBalon(b, dt);
    const gk = p.jug[pen.portero];
    if (gk.lanza) { irA(p, gk, gk.lanza, true); gk.deseo.vx *= 1.4; gk.deseo.vy *= 1.6; moverJugador(p, gk, dt); }
    animar(gk, dt);
    if (pen.resultado) return;
    if (gk.sinTocar <= 0 && dist(gk, b) < alcancePortero(gk) + 0.5 && b.z < 2.5) { pen.resultado = 'atajado'; b.vx *= -0.3; b.vy = (p.rng() - 0.5) * 6; gk.sinTocar = 1; evento(p, 'atajada', { eq: gk.eq, i: gk.i, penal: true }); return; }
    if (Math.abs(b.x) > MX) pen.resultado = Math.abs(b.y) < POSTE && b.z < TRAVESANO ? 'gol' : 'fuera';
    else if (Math.hypot(b.vx, b.vy) < 0.5) pen.resultado = 'fuera';
  }
  function pasoPenalPartido(p, entradas, dt) {
    if (p.penal.fase === 'apuntar') { pasoPenal(p, entradas, dt); return; }
    p.estado = 'juego'; p.penal = null;
    pasoJuego(p, entradas, dt);
  }
  function iniciarPenales(p) {
    p.tanda = { goles: [0, 0], tiros: [0, 0], turno: p.saqueInicial, hist: [[], []] };
    evento(p, 'tanda', {});
    iniciarPenal(p, p.tanda.turno, true);
  }
  function pasoTanda(p, entradas, dt) {
    const pen = p.penal;
    if (pen.fase === 'apuntar') { pasoPenal(p, entradas, dt); return; }
    vueloPenal(p, dt);
    if (!pen.resultado) return;
    pen.finT += dt;
    if (pen.finT < 1.3) return;
    anotarTiroTanda(p, pen.eq, pen.resultado === 'gol');
    if (tandaDecidida(p.tanda)) { terminar(p); return; }
    p.tanda.turno = 1 - p.tanda.turno;
    iniciarPenal(p, p.tanda.turno, true);
  }
  function anotarTiroTanda(p, eq, entro) {
    const t = p.tanda;
    t.tiros[eq]++; if (entro) t.goles[eq]++;
    t.hist[eq].push(entro ? 1 : 0);
    evento(p, entro ? 'penal_gol' : 'penal_falla', { eq });
  }
  function tandaDecidida(t) {
    const [a, b] = t.goles, [ta, tb] = t.tiros;
    if (ta <= 5 && tb <= 5) return a + (5 - ta) < b || b + (5 - tb) < a;
    return ta === tb && a !== b;
  }
  function ganador(p) {
    if (p.tanda && tandaDecidida(p.tanda)) return p.tanda.goles[0] > p.tanda.goles[1] ? 0 : 1;
    if (p.eq[0].goles === p.eq[1].goles) return null;
    return p.eq[0].goles > p.eq[1].goles ? 0 : 1;
  }

  // ================= Reloj, medio tiempo y final =================
  // Devuelve true si el estado cambió (medio tiempo o final).
  function reloj(p) {
    p.minuto = Math.min(90, Math.floor(p.t / p.duracion * 90));
    if (!p.ultimos && p.minuto >= 85) { p.ultimos = true; evento(p, 'ultimos', {}); }
    if (p.mitad === 1 && p.t >= p.duracion / 2) { medioTiempo(p); return true; }
    if (p.t >= p.duracion) { terminar(p); return true; }
    return false;
  }
  function medioTiempo(p) {
    p.estado = 'medio'; p.medioT = 0; p.mitad = 2; p.dueno = -1;
    evento(p, 'medio', { marcador: [p.eq[0].goles, p.eq[1].goles] });
  }
  function terminar(p) {
    p.minuto = 90;
    if (p.cfg.eliminatoria && !p.tanda && p.eq[0].goles === p.eq[1].goles) { iniciarPenales(p); return; }
    p.estado = 'fin'; p.dueno = -1;
    evento(p, 'final', { marcador: [p.eq[0].goles, p.eq[1].goles], ganador: ganador(p) });
  }
  function pasoMedio(p, entradas, dt) {
    p.medioT += dt;
    if (p.medioT < 2) return;
    p.eq[0].lado *= -1; p.eq[1].lado *= -1;
    for (const j of p.jug) j.energia = Math.min(1, j.energia + 0.25);
    saque(p, 1 - p.saqueInicial);
  }
  function pasoGol(p, entradas, dt) {
    p.golT += dt;
    const b = p.balon;
    moverBalon(b, dt);
    if (Math.abs(b.x) > MX + 1.6) { b.x = Math.sign(b.x) * (MX + 1.6); b.vx *= -0.2; }
    if (Math.abs(b.y) > POSTE && Math.abs(b.x) > MX) { b.y = Math.sign(b.y) * POSTE; b.vy *= -0.2; }
    if (b.z > TRAVESANO && Math.abs(b.x) > MX) { b.z = TRAVESANO; b.vz = -Math.abs(b.vz) * 0.2; }
    for (const j of p.jug) { j.deseo = { vx: 0, vy: 0, sprint: false }; moverJugador(p, j, dt); animar(j, dt); }
    if (p.golT < 2.6) return;
    if (p.t >= p.duracion) { terminar(p); return; }
    if (p.mitad === 1 && p.t >= p.duracion / 2) { medioTiempo(p); return; }
    saque(p, 1 - p.golEq);
  }

  // ================= IA =================
  // Posición por formación y táctica (design.md §4).
  function objetivoFormacion(p, j, conBalon) {
    const e = p.eq[j.eq], t = e.tactica, slot = FORMACIONES[t.formacion][j.slot], lado = e.lado;
    const bu = uDe(lado, p.balon.x), bv = p.balon.y * lado / MY;
    let u = slot[1] + (bu - 0.5) * (j.rol === 'POR' ? 0.08 : 0.55);
    u += conBalon ? 0.05 + (t.mentalidad - 50) / 50 * 0.08 : -0.03 + (t.linea - 50) / 50 * 0.07;
    if (!conBalon && j.rol === 'DEF') u = Math.min(u, bu + 0.02);
    if (conBalon && j.rol === 'DEL' && j.ia.corre <= 0 && nivelDe(p, j.eq).ruido < 0.3) u = Math.min(u, lineaRival(p, j.eq) - 0.005);
    if (j.ia.corre > 0) u += 0.1;
    u = clamp(u, 0.03, 0.95);
    const ancho = conBalon ? 0.8 + t.ancho / 100 * 0.4 : 0.55 + t.ancho / 100 * 0.25;
    const v = clamp(slot[2] * ancho + (bv - slot[2]) * 0.2, -0.95, 0.95);
    return { x: xDeU(lado, u), y: v * MY * lado };
  }
  // Trayectoria prevista del balón suelto (24 puntos cada 0.1 s) y quién de cada equipo llega primero.
  function predecir(p) {
    const tray = [], b = { ...p.balon };
    for (let k = 1; k <= 24; k++) {
      for (let s = 0; s < 6; s++) moverBalon(b, PASO);
      tray.push({ x: b.x, y: b.y, z: b.z, t: k * 0.1 });
    }
    p.tray = tray;
    p.cache = { chaser: [perseguidor(p, 0), perseguidor(p, 1)] };
  }
  function perseguidor(p, eq) {
    if (p.dueno >= 0) return { i: -1, pt: null };
    let mejor = -1, mt = Infinity, mp = null;
    for (const j of delEquipo(p, eq)) {
      if (j.rol === 'POR' || j.aturdido > 0.3) continue;
      const r = llegada(p, j);
      if (r.t < mt) { mt = r.t; mejor = j.i; mp = r.pt; }
    }
    return { i: mejor, pt: mp, t: mt };
  }
  function llegada(p, j) {
    const v = velocidadTope(p, j, true) * 0.95;
    for (const pt of p.tray) {
      if (pt.z < 2.3 && dist(j, pt) <= v * pt.t + 0.6) return { t: pt.t, pt };
    }
    const u = p.tray[p.tray.length - 1];
    return { t: u.t + dist(j, u) / v, pt: u };
  }
  function iaEquipos(p) {
    for (let e = 0; e < 2; e++) iaEquipo(p, e);
  }
  function iaEquipo(p, e) {
    const dueno = p.dueno >= 0 ? p.jug[p.dueno] : null;
    const fase = faseDe(dueno, e);
    const c = p.cache.chaser[e];
    const presionan = fase === 'defensa' ? presionadores(p, e, dueno) : [];
    const marcas = fase === 'defensa' ? asignarMarcas(p, e) : new Map();
    for (const j of delEquipo(p, e)) {
      if (esHumano(j) || j.aturdido > 0 || j.barrida > 0) continue;
      if (p.iaPausada) { j.deseo = { vx: 0, vy: 0, sprint: false }; continue; }
      if (j.rol === 'POR') { iaPortero(p, j); continue; }
      if (dueno === j) { iaConBalon(p, j); continue; }
      iaSinBalon(p, j, { fase, c, presionan, marcas, dueno });
    }
  }
  const faseDe = (dueno, e) => {
    if (!dueno) return 'suelto';
    return dueno.eq === e ? 'ataque' : 'defensa';
  };
  function iaSinBalon(p, j, ctx) {
    if (ctx.c.i === j.i && ctx.c.pt) { irA(p, j, ctx.c.pt, true); return; }
    if (ctx.presionan.includes(j.i)) { iaPresiona(p, j, ctx.dueno); return; }
    if (ctx.fase === 'defensa' && ctx.marcas.has(j.i)) { irA(p, j, ctx.marcas.get(j.i), false); return; }
    let o = objetivoFormacion(p, j, ctx.fase === 'ataque');
    if (ctx.fase === 'ataque') o = apoyo(p, j, ctx.dueno, o);
    irA(p, j, o, j.ia.corre > 0 || dist(j, o) > 12);
  }
  function presionadores(p, e, dueno) {
    if (dueno.rol === 'POR' && enSuArea(p, dueno)) return [];
    const t = p.eq[e].tactica, humano = p.jug.find(j => j.eq === e && esHumano(j));
    let n = (humano ? 0 : 1) + (t.presion > 60 ? 1 : 0) + (p.eq[e].doble ? 1 : 0);
    if (humano && dist(humano, dueno) > 8) n++;
    return delEquipo(p, e).filter(j => j.rol !== 'POR' && !esHumano(j)).sort((a, b) => dist(a, dueno) - dist(b, dueno)).slice(0, n).map(j => j.i);
  }
  function iaPresiona(p, j, d) {
    const n = nivelDe(p, j.eq), dd = dist(j, d);
    irA(p, j, puntoContencion(p, j, d), dd > 3);
    j.deseo.vx *= 0.8 + n.presion * 0.2; j.deseo.vy *= 0.8 + n.presion * 0.2;
    if (dd < 1.7 && p.rng() < n.entradas * 1.1 * (j.a.def / 100) * PASO) {
      const atras = Math.abs(difAng(d.dir, Math.atan2(j.y - d.y, j.x - d.x))) > 2;
      if (!atras || p.rng() < n.ruido * 0.3) entrada(p, j); // la IA torpe a veces entra por detrás (falta)
      return;
    }
    if (n.ruido < 0.2 && dd > 2 && dd < 3.2 && Math.abs(difAng(j.dir, Math.atan2(d.y - j.y, d.x - j.x))) < 0.3 && p.rng() < 0.12 * PASO) barrida(p, j);
  }
  // Marcaje: cada defensor y medio toma al rival más cercano a su puesto (13 m) y se pone de su lado de la portería.
  function asignarMarcas(p, e) {
    const marcas = new Map(), tomados = new Set(), g = porteriaPropia(p, e);
    const rivales = delEquipo(p, 1 - e).filter(r => r.rol !== 'POR' && r.i !== p.dueno);
    const mios = delEquipo(p, e).filter(j => j.rol === 'DEF' || j.rol === 'MED').sort((a, b) => a.slot - b.slot);
    for (const j of mios) {
      const base = objetivoFormacion(p, j, false);
      let mejor = null, md = 13;
      for (const r of rivales) { const d = dist(r, base); if (!tomados.has(r.i) && d < md) { md = d; mejor = r; } }
      if (!mejor) continue;
      tomados.add(mejor.i);
      const dx = g.x - mejor.x, dy = g.y - mejor.y, m = Math.hypot(dx, dy) || 1;
      marcas.set(j.i, { x: (mejor.x + dx / m * 1.8) * 0.7 + base.x * 0.3, y: (mejor.y + dy / m * 1.8) * 0.7 + base.y * 0.3 });
    }
    return marcas;
  }
  // Apoyo: los dos más cercanos al que lleva el balón buscan una línea de pase libre; los delanteros rompen.
  function apoyo(p, j, d, o) {
    if (j.rol === 'DEL' && p.t > j.ia.sigCorre) {
      j.ia.sigCorre = p.t + 4 + p.rng() * 5;
      if (uDe(p.eq[j.eq].lado, d.x) > 0.4) j.ia.corre = 1.6;
    }
    const cercanos = delEquipo(p, j.eq).filter(t => t !== d && t.rol !== 'POR').sort((a, b) => dist(a, d) - dist(b, d)).slice(0, 2);
    if (!cercanos.includes(j)) return o;
    const bloqueo = delEquipo(p, 1 - j.eq).find(r => distSegmento(r, d, o) < 2);
    if (!bloqueo) return o;
    const dx = o.x - d.x, dy = o.y - d.y, m = Math.hypot(dx, dy) || 1, lado = Math.sign((bloqueo.x - d.x) * -dy / m + (bloqueo.y - d.y) * dx / m) || 1;
    return { x: o.x + dy / m * 4 * lado, y: clamp(o.y - dx / m * 4 * lado, -MY + 1, MY - 1) };
  }

  // ---- Con el balón: decidir entre tirar, pasar, centrar o conducir (design.md §4) ----
  function iaConBalon(p, j) {
    const n = nivelDe(p, j.eq);
    if (j.pend) return;
    if (p.t >= j.ia.decide) decidirConBalon(p, j, n, false);
    if (p.dueno !== j.i) return;
    const plan = j.ia.plan || porteriaRival(p, j.eq);
    irA(p, j, plan, j.ia.sprint);
  }
  function decidirConBalon(p, j, n, parado) {
    j.ia.decide = p.t + n.decide * (0.7 + p.rng() * 0.6);
    const ops = opciones(p, j, n, parado);
    let mejor = ops[0];
    for (const o of ops) { o.s += gauss(p.rng) * n.ruido * 0.25; if (o.s > mejor.s) mejor = o; }
    if (p.debug) evento(p, 'decision', { i: j.i, accion: mejor.tipo, s: Math.round(mejor.s * 100) / 100, x: Math.round(j.x), ops: ops.filter(o => o.s > 0).map(o => o.tipo + ':' + Math.round(o.s * 100) / 100).join(' ') });
    if (mejor.tipo === 'conducir') { j.ia.plan = mejor.punto; j.ia.sprint = mejor.sprint; return; }
    if (parado && mejor.s < 0) mejor = { tipo: 'pase', potencia: 0.4, r: receptorParada(p, j, 'banda') || receptorParada(p, j, 'meta') };
    patear(p, j, mejor.tipo, mejor.potencia, mejor.dir || null, { receptor: mejor.r ? mejor.r.i : undefined, forzar: parado });
  }
  function opciones(p, j, n, parado) {
    const ops = [opcionTiro(p, j, n), opcionCentro(p, j)];
    for (const t of delEquipo(p, j.eq)) {
      if (t === j || t.aturdido > 0.3) continue;
      ops.push(opcionPase(p, j, t), opcionHueco(p, j, t));
    }
    if (!parado) ops.push(opcionConducir(p, j));
    return ops;
  }
  function opcionTiro(p, j, n) {
    const g = porteriaRival(p, j.eq), d = dist(j, g);
    const rango = 24 + j.a.tir * 0.06 + (tiene(j, 'lejano') ? 8 : 0);
    if (d > rango) return { tipo: 'tiro', s: -1 };
    const frente = Math.abs(g.x - j.x) / d;
    const tapan = delEquipo(p, 1 - j.eq).filter(o => o.rol !== 'POR' && distSegmento(o, j, g) < 1.3).length;
    const s = (1.6 * (1 - Math.pow(d / rango, 1.5)) * frente * Math.pow(0.5, tapan) + (d < 12 ? 0.6 : 0)) * n.tira;
    return { tipo: 'tiro', s, potencia: d > 20 ? 0.85 : 0.6, dir: { x: Math.sign(g.x - j.x), y: (p.rng() - 0.5) * 1.6 } };
  }
  function lineaLibre(p, a, b) {
    let m = Infinity;
    for (const o of p.jug) if (o.eq !== a.eq) m = Math.min(m, distSegmento(o, a, b));
    return m;
  }
  function espacioDe(p, t) {
    let m = Infinity;
    for (const o of p.jug) if (o.eq !== t.eq) m = Math.min(m, dist(o, t));
    return m;
  }
  function opcionPase(p, j, t) {
    const d = dist(j, t), lado = p.eq[j.eq].lado;
    if (d > 38 || d < 3) return { tipo: 'pase', s: -1 };
    const avance = uDe(lado, t.x) - uDe(lado, j.x), libre = lineaLibre(p, j, t), espacio = clamp(espacioDe(p, t) / 6, 0, 1);
    if (p.cfg.fueraDeLugar && uDe(lado, t.x) > Math.max(lineaRival(p, j.eq), uDe(lado, j.x)) + 0.004) return { tipo: 'pase', s: -1 };
    if (libre < 1.1) {
      if (d < 18 || avance < 0.05 || t.rol === 'POR') return { tipo: 'pase', s: -1 };
      return { tipo: 'elevado', s: 0.2 + avance * 1.2 + espacio * 0.3, potencia: 0.5, r: t };
    }
    const s = 0.25 + avance * 1.4 + clamp((libre - 1.1) / 4, 0, 1) * 0.3 + espacio * 0.35 - (d > 28 ? 0.3 : 0) - (t.rol === 'POR' ? 0.6 : 0);
    return { tipo: 'pase', s: avance < 0 ? s * 0.6 : s, potencia: 0.35, r: t };
  }
  function opcionHueco(p, j, t) {
    const lado = p.eq[j.eq].lado;
    if (t.rol === 'DEF' || t.rol === 'POR' || (t.ia.corre <= 0 && uDe(lado, t.x) - uDe(lado, j.x) < 0.1)) return { tipo: 'hueco', s: -1 };
    const destino = { x: clamp(t.x + lado * 8, -MX + 3, MX - 3), y: t.y };
    if (lineaLibre(p, j, destino) < 1.5 || espacioDe(p, { ...destino, eq: t.eq }) < 4) return { tipo: 'hueco', s: -1 };
    return { tipo: 'hueco', s: 0.5 + (uDe(lado, destino.x) - uDe(lado, j.x)) * 1.8 + (tiene(j, 'hueco') ? 0.25 : 0), potencia: 0.45, r: t };
  }
  function opcionCentro(p, j) {
    if (!esCentro(p, j)) return { tipo: 'elevado', s: -1 };
    const enArea = delEquipo(p, j.eq).filter(t => t !== j && enAreaRival(p, t)).length;
    return { tipo: 'elevado', s: 0.4 + enArea * 0.15, potencia: 0.55, r: null, dir: { x: -Math.sign(j.x) * 0.2, y: -Math.sign(j.y) } };
  }
  function opcionConducir(p, j) {
    const lado = p.eq[j.eq].lado, adelante = { x: clamp(j.x + lado * 7, -MX + 2, MX - 2), y: j.y * 0.85 };
    let cerca = null, md = Infinity;
    for (const o of p.jug) {
      const d = o.eq === j.eq ? Infinity : distSegmento(o, j, adelante);
      if (d < md) { md = d; cerca = o; }
    }
    if (cerca && md < 3) adelante.y = clamp(adelante.y + (j.y > cerca.y ? 4 : -4), -MY + 2, MY - 2);
    const frenteLibre = !p.jug.some(o => o.eq !== j.eq && dist(o, j) < 2 && Math.abs(difAng(lado > 0 ? 0 : Math.PI, Math.atan2(o.y - j.y, o.x - j.x))) < 1.2);
    const s = 0.3 + clamp(md / 8, 0, 1) * 0.7 + j.a.reg / 500 + (tiene(j, 'regate') ? 0.15 : 0) + (uDe(lado, j.x) > 0.6 ? 0.15 : 0) - (frenteLibre ? 0 : 0.35);
    return { tipo: 'conducir', s, punto: adelante, sprint: md > 8 };
  }

  // ---- Portero ----
  function iaPortero(p, j) {
    if (p.dueno === j.i) { porteroConBalon(p, j); return; }
    if (j.lanza) { irA(p, j, j.lanza, true); j.deseo.vx *= 0.75; j.deseo.vy *= 0.75; return; }
    const t = tiroHacia(p, j);
    if (t) { reaccionar(p, j, t); return; }
    j.reaccion = 0;
    const b = p.balon, g = porteriaPropia(p, j.eq), d = p.dueno >= 0 ? p.jug[p.dueno] : null;
    if (d && d.eq !== j.eq && unoContraUno(p, j, d)) { irA(p, j, d, true); return; }
    const c = p.cache.chaser[j.eq];
    if (!d && Math.abs(b.x - g.x) < AREA_X - 2 && Math.abs(b.y) < AREA_Y - 4 && llegada(p, j).t <= (c.t || Infinity)) { irA(p, j, llegada(p, j).pt, true); return; }
    const db = dist(g, b) || 1, k = clamp(db * 0.09, 0.8, 4.5) / db;
    irA(p, j, { x: g.x + (b.x - g.x) * k, y: clamp(b.y * k, -POSTE - 0.3, POSTE + 0.3) }, false);
  }
  // Tiro que cruzará la línea de su portería: { y, z, t } o null.
  function tiroHacia(p, j) {
    const b = p.balon, g = porteriaPropia(p, j.eq);
    if (p.dueno >= 0 || Math.sign(b.vx) !== Math.sign(g.x) || Math.abs(b.vx) < 6) return null;
    const t = (g.x - b.x) / b.vx;
    if (t < 0 || t > 2.2) return null;
    const y = b.y + b.vy * t, z = b.z + b.vz * t - GRAV * t * t / 2;
    return Math.abs(y) < POSTE + 1.2 && z < 3.2 ? { y, z, t } : null;
  }
  function reaccionar(p, j, t) {
    if (!j.reaccion) j.reaccion = p.t + reaccionPortero(p, j);
    if (p.t < j.reaccion) { j.deseo = { vx: 0, vy: 0, sprint: false }; return; }
    const g = porteriaPropia(p, j.eq);
    j.lanza = { x: g.x - Math.sign(g.x) * 0.5, y: clamp(t.y, -POSTE - 0.4, POSTE + 0.4), t: 0.9 };
    irA(p, j, j.lanza, true);
  }
  function unoContraUno(p, j, d) {
    const g = porteriaPropia(p, j.eq);
    if (dist(d, g) > 16) return false;
    return !delEquipo(p, j.eq).some(t => t !== j && Math.abs(t.x - g.x) < Math.abs(d.x - g.x) && Math.abs(t.y - d.y) < 3);
  }
  function porteroConBalon(p, j) {
    j.deseo = { vx: 0, vy: 0, sprint: false };
    if (p.t - j.ia.conBalonDesde < 1.2) return;
    const r = receptorParada(p, j, 'meta');
    if (!r) return;
    j.dir = Math.atan2(r.y - j.y, r.x - j.x);
    patear(p, j, dist(j, r) > 25 ? 'elevado' : 'pase', 0.45, null, { receptor: r.i, forzar: true });
  }

  // ================= Paso =================
  function pasoJuego(p, entradas, dt) {
    p.t += dt;
    if (reloj(p)) return;
    predecir(p);
    actualizarHumanos(p, entradas, dt);
    if (p.estado !== 'juego') return;
    iaEquipos(p);
    if (p.estado !== 'juego') return;
    patadasPendientes(p, dt);
    if (!moverTodos(p, dt)) return;
    separar(p);
    pasoBalon(p, dt);
    if (p.estado === 'juego') revisarBalon(p);
  }
  // Relojes de cada jugador, barridas y movimiento; false si una barrida paró el juego (falta).
  function moverTodos(p, dt) {
    for (const j of p.jug) {
      j.aturdido = Math.max(0, j.aturdido - dt); j.sinTocar = Math.max(0, j.sinTocar - dt);
      if (j.ia.corre > 0) j.ia.corre -= dt;
      if (j.lanza) { j.lanza.t -= dt; if (j.lanza.t <= 0) j.lanza = null; }
      if (j.barrida > 0) pasoBarrida(p, j, dt);
      if (p.estado !== 'juego') return false;
      moverJugador(p, j, dt);
      animar(j, dt);
    }
    return true;
  }
  function pasoBalon(p, dt) {
    if (p.dueno < 0) { moverBalon(p.balon, dt); contactos(p); return; }
    p.stats.posesion[p.jug[p.dueno].eq] += dt;
    llevarBalon(p, dt);
    if (p.dueno >= 0) presionSobreDueno(p, dt); else contactos(p);
  }
  const PASOS = { juego: pasoJuego, parada: pasoParada, gol: pasoGol, medio: pasoMedio, penal: pasoPenalPartido, tanda: pasoTanda };
  function paso(p, entradas) {
    p.eventos = [];
    const f = PASOS[p.estado];
    if (f) f(p, entradas || [], PASO);
    return p.eventos;
  }
  // IA contra IA hasta el final (o el tope de segundos de juego): para pruebas y partidos simulados.
  function simular(p, segundos) {
    const tope = Math.round((segundos || 600) / PASO);
    for (let k = 0; k < tope && p.estado !== 'fin'; k++) paso(p, []);
    return p;
  }
  function ponerEnJuego(p) { p.estado = 'juego'; p.parada = null; p.penal = null; }

  raiz.FutbolMotor = {
    fnv, mulberry, rngDe, gauss,
    MX, MY, POSTE, TRAVESANO, AREA_X, AREA_Y, PENAL, CIRCULO, PASO, GRAV, NADA,
    CARTAS, CARTA, FORMACIONES, TACTICA_BASE, NIVELES,
    moverBalon, distanciaRodando, velocidadPara,
    equipoGenerico, crearPartido, cambiarTactica, paso, simular, ponerEnJuego, asignarHumano, darBalon, soltarBalon,
    velocidadTope, giro, reaccionPortero, alcancePortero, objetivoFormacion, entrada, barrida, patear,
    iniciarPenales, ganador, uDe, lineaRival,
  };
})(typeof window !== 'undefined' ? window : globalThis);
