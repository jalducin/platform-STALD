// Motor de cartas compartido (openspec: poker). Sin DOM: lo usan juegos.html y las pruebas de Deno
// (server/cartas_test.ts). Las fichas son solo de juego: no tienen valor real.
(function (g) {
  'use strict';

  // ---------- Baraja francesa: ids 0..51, rango id % 13 (2…A), palo ⌊id/13⌋ ----------
  const PALOS = ['♠', '♥', '♦', '♣'];
  const RANGOS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const rango = id => id % 13;
  const palo = id => Math.floor(id / 13);
  const nombreCarta = id => RANGOS[rango(id)] + PALOS[palo(id)];
  const esRoja = id => palo(id) === 1 || palo(id) === 2;

  function barajar(a, rng) {
    const r = rng || Math.random; const m = a.slice();
    for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = m[i]; m[i] = m[j]; m[j] = t; }
    return m;
  }

  // ---------- Evaluador: valor = categoría × 13⁵ + desempates ----------
  const NOMBRES_MANO = ['Carta alta', 'Par', 'Doble par', 'Tercia', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'];
  const B5 = 13 ** 5;

  function valor5(ids) {
    const r = ids.map(rango).sort((a, b) => b - a);
    const color = ids.every(id => palo(id) === palo(ids[0]));
    let alta = -1;
    if (new Set(r).size === 5) {
      if (r[0] - r[4] === 4) alta = r[0];
      else if (r[0] === 12 && r[1] === 3) alta = 3; // A-2-3-4-5: el 5 es la carta alta
    }
    const cuenta = new Map(); r.forEach(x => cuenta.set(x, (cuenta.get(x) || 0) + 1));
    const grupos = [...cuenta].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    let cat;
    if (alta >= 0 && color) cat = 8;
    else if (grupos[0][1] === 4) cat = 7;
    else if (grupos[0][1] === 3 && grupos[1][1] === 2) cat = 6;
    else if (color) cat = 5;
    else if (alta >= 0) cat = 4;
    else if (grupos[0][1] === 3) cat = 3;
    else if (grupos[0][1] === 2 && grupos[1][1] === 2) cat = 2;
    else if (grupos[0][1] === 2) cat = 1;
    else cat = 0;
    const des = cat === 8 || cat === 4 ? [alta] : cat === 5 || cat === 0 ? r : grupos.map(x => x[0]);
    let v = cat;
    for (let i = 0; i < 5; i++) v = v * 13 + (des[i] || 0);
    return v;
  }

  function mejorMano(ids) {
    let mejor = -1, cartas = null;
    const n = ids.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const m = [ids[a], ids[b], ids[c], ids[d], ids[e]]; const v = valor5(m);
      if (v > mejor) { mejor = v; cartas = m; }
    }
    const categoria = Math.floor(mejor / B5);
    const nombre = categoria === 8 && Math.floor(mejor / 13 ** 4) % 13 === 12 ? 'Escalera real' : NOMBRES_MANO[categoria];
    return { valor: mejor, categoria, nombre, cartas };
  }

  // ---------- Texas Hold'em sin límite ----------
  const CIEGAS = [[10, 20], [20, 40], [40, 80], [75, 150]];

  function pokerNueva(jugadores, op) {
    const o = op || {};
    return { jugadores: jugadores.map(j => Object.assign({}, j, { fichas: o.fichas || 1000 })), manos: o.manos || 10, mano: -1, boton: -1, fase: 'espera', terminada: false, aportado: jugadores.map(() => 0), apuesta: jugadores.map(() => 0), resultado: null, ultima: null };
  }

  function sigIdx(st, desde, cond) {
    const n = st.jugadores.length;
    for (let k = 1; k <= n; k++) { const i = ((desde + k) % n + n) % n; if (cond(i)) return i; }
    return -1;
  }
  const puedeActuar = (st, i) => !st.fuera[i] && st.jugadores[i].fichas > 0;
  const bote = st => st.aportado.reduce((a, x) => a + x, 0);
  function poner(st, i, monto) {
    const m = Math.max(0, Math.min(monto, st.jugadores[i].fichas));
    st.jugadores[i].fichas -= m; st.apuesta[i] += m; st.aportado[i] += m;
    return m;
  }

  function pokerMano(st, rng) {
    const vivos = st.jugadores.map((_, i) => i).filter(i => st.jugadores[i].fichas > 0);
    if (vivos.length < 2 || st.mano + 1 >= st.manos) { st.terminada = true; st.fase = 'terminada'; return st; }
    const n = st.jugadores.length;
    st.mano++;
    st.boton = sigIdx(st, st.boton < 0 ? n - 1 : st.boton, i => st.jugadores[i].fichas > 0);
    st.ciegas = CIEGAS[Math.min(CIEGAS.length - 1, Math.floor(st.mano / 4))].slice();
    st.mazo = barajar([...Array(52).keys()], rng);
    st.comunes = []; st.cartas = st.jugadores.map(() => []);
    st.apuesta = Array(n).fill(0); st.aportado = Array(n).fill(0);
    st.fuera = st.jugadores.map(j => j.fichas <= 0);
    st.resultado = null; st.ultima = null; st.fase = 'preflop';
    for (let r = 0; r < 2; r++) for (let k = 1; k <= n; k++) { const i = (st.boton + k) % n; if (!st.fuera[i]) st.cartas[i].push(st.mazo.pop()); }
    const sb = vivos.length === 2 ? st.boton : sigIdx(st, st.boton, i => !st.fuera[i]);
    const bb = sigIdx(st, sb, i => !st.fuera[i]);
    st.ciegaChica = sb; st.ciegaGrande = bb;
    poner(st, sb, st.ciegas[0]); poner(st, bb, st.ciegas[1]);
    st.apuestaMax = Math.max(st.apuesta[sb], st.apuesta[bb]); st.minSubida = st.ciegas[1];
    st.pendientes = st.jugadores.map((_, i) => i).filter(i => puedeActuar(st, i));
    st.turno = bb;
    avanzar(st);
    return st;
  }

  function opciones(st) {
    const i = st.turno, f = st.jugadores[i].fichas;
    const igualar = Math.min(st.apuestaMax - st.apuesta[i], f);
    const maxSubir = st.apuesta[i] + f;
    return { jugador: i, pasar: st.apuestaMax === st.apuesta[i], igualar, minSubir: Math.min(st.apuestaMax + st.minSubida, maxSubir), maxSubir, puedeSubir: maxSubir > st.apuestaMax };
  }

  function subirA(st, i, total) {
    poner(st, i, total - st.apuesta[i]);
    if (st.apuesta[i] > st.apuestaMax) {
      const sube = st.apuesta[i] - st.apuestaMax;
      if (sube >= st.minSubida) st.minSubida = sube;
      st.apuestaMax = st.apuesta[i];
      st.pendientes = st.jugadores.map((_, k) => k).filter(k => k !== i && puedeActuar(st, k)); // se reabre la ronda
    }
  }

  function pokerActuar(st, mv) {
    if (!mv || !['preflop', 'flop', 'turn', 'river'].includes(st.fase)) return false;
    const i = st.turno, o = opciones(st), a = mv.accion;
    if (a === 'retirarse') st.fuera[i] = true;
    else if (a === 'pasar') { if (!o.pasar) return false; }
    else if (a === 'igualar') { if (o.pasar) return false; poner(st, i, o.igualar); }
    else if (a === 'subir') {
      const m = Math.round(Number(mv.monto));
      if (!o.puedeSubir || !Number.isFinite(m) || m < o.minSubir || m > o.maxSubir) return false;
      subirA(st, i, m);
    } else if (a === 'todo') { if (st.jugadores[i].fichas <= 0) return false; subirA(st, i, o.maxSubir); }
    else return false;
    st.pendientes = st.pendientes.filter(k => k !== i);
    st.ultima = { j: i, accion: a, apuesta: st.apuesta[i] };
    avanzar(st);
    return true;
  }

  // Siguiente turno, siguiente calle o muestra de cartas.
  function avanzar(st) {
    const enMano = st.jugadores.map((_, i) => i).filter(i => !st.fuera[i]);
    if (enMano.length === 1) return ganaSolo(st, enMano[0]);
    st.pendientes = st.pendientes.filter(i => puedeActuar(st, i));
    // Si todos los demás están all-in o retirados y ya igualó, no hay nada que decidir.
    const conFichas = enMano.filter(i => st.jugadores[i].fichas > 0);
    if (st.pendientes.length && !(conFichas.length === 1 && st.pendientes.length === 1 && st.apuesta[conFichas[0]] >= st.apuestaMax)) {
      st.turno = sigIdx(st, st.turno, i => st.pendientes.includes(i));
      return;
    }
    st.apuesta = st.apuesta.map(() => 0); st.apuestaMax = 0; st.minSubida = st.ciegas[1];
    if (st.fase === 'river' || conFichas.length <= 1) {
      while (st.comunes.length < 5) st.comunes.push(st.mazo.pop());
      return mostrar(st);
    }
    if (st.fase === 'preflop') { st.comunes.push(st.mazo.pop(), st.mazo.pop(), st.mazo.pop()); st.fase = 'flop'; }
    else { st.comunes.push(st.mazo.pop()); st.fase = st.fase === 'flop' ? 'turn' : 'river'; }
    st.pendientes = conFichas.slice();
    st.turno = sigIdx(st, st.boton, i => st.pendientes.includes(i));
  }

  function cerrar(st, premios, mostrar, manos) {
    st.jugadores.forEach((j, i) => { j.fichas += premios[i]; });
    st.resultado = { premios, mostrar, bote: bote(st), ganadores: premios.map((p, i) => p > 0 ? i : -1).filter(i => i >= 0), manos: manos || null };
    st.aportado = st.aportado.map(() => 0); st.apuesta = st.apuesta.map(() => 0);
    st.fase = 'fin';
  }

  function ganaSolo(st, i) {
    const premios = st.jugadores.map(() => 0); premios[i] = bote(st);
    cerrar(st, premios, false);
  }

  // Botes por niveles de aportación; empate: partes iguales y lo que sobra al primero después del botón.
  function mostrar(st) {
    const n = st.jugadores.length;
    const manos = st.jugadores.map((_, i) => st.fuera[i] ? null : mejorMano(st.cartas[i].concat(st.comunes)));
    const premios = Array(n).fill(0);
    const niveles = [...new Set(st.aportado.filter((a, i) => a > 0 && !st.fuera[i]))].sort((a, b) => a - b);
    const ordenBoton = [...Array(n).keys()].map(k => (st.boton + 1 + k) % n);
    let previo = 0, repartido = 0;
    for (const nivel of niveles) {
      let monto = 0;
      for (let i = 0; i < n; i++) monto += Math.max(0, Math.min(st.aportado[i], nivel) - previo);
      const elegibles = ordenBoton.filter(i => !st.fuera[i] && st.aportado[i] >= nivel);
      const mejor = Math.max(...elegibles.map(i => manos[i].valor));
      const gan = elegibles.filter(i => manos[i].valor === mejor);
      const parte = Math.floor(monto / gan.length);
      let resto = monto - parte * gan.length;
      gan.forEach(i => { premios[i] += parte + (resto > 0 ? 1 : 0); if (resto > 0) resto--; });
      repartido += monto; previo = nivel;
    }
    const sobra = bote(st) - repartido; // aportes de retirados por encima del último nivel
    if (sobra > 0) { const top = ordenBoton.filter(i => !st.fuera[i]).sort((a, b) => manos[b].valor - manos[a].valor)[0]; premios[top] += sobra; }
    cerrar(st, premios, true, manos.map(m => m && { nombre: m.nombre, valor: m.valor, cartas: m.cartas }));
  }

  // ---------- Bots ----------
  function fuerzaPreflop(c) {
    const [a, b] = c.map(rango).sort((x, y) => y - x);
    let f = (a + b) / 48;
    if (a === b) f = 0.55 + a / 12 * 0.4;
    if (palo(c[0]) === palo(c[1])) f += 0.06;
    if (a - b === 1) f += 0.04;
    if (a >= 9 && b >= 9) f += 0.12;
    return Math.min(1, f);
  }
  function fuerzaPost(st, i) {
    const m = mejorMano(st.cartas[i].concat(st.comunes));
    let f = [0.12, 0.42, 0.62, 0.74, 0.8, 0.85, 0.92, 0.97, 0.99][m.categoria];
    if (m.categoria <= 1) f += (Math.floor(m.valor / 13 ** 4) % 13) / 12 * 0.12;
    if (st.comunes.length >= 5 && mejorMano(st.comunes).valor === m.valor) f -= 0.25; // juega la mesa
    return f;
  }
  function pokerBot(st, rng) {
    const r = rng || Math.random;
    const i = st.turno, o = opciones(st);
    const f = st.fase === 'preflop' ? fuerzaPreflop(st.cartas[i]) : fuerzaPost(st, i);
    const b = bote(st), costo = o.igualar;
    const odds = costo / (b + costo || 1);
    const x = r();
    const sube = frac => {
      const t = Math.max(o.minSubir, Math.min(o.maxSubir, st.apuestaMax + Math.max(st.minSubida, Math.round(b * frac / 10) * 10)));
      return t >= o.maxSubir ? { accion: 'todo' } : { accion: 'subir', monto: t };
    };
    if (o.puedeSubir) {
      if (f > 0.85 && x < 0.7) return sube(0.75 + x * 0.5);
      if (f > 0.65 && x < 0.3) return sube(0.5);
      if (o.pasar && x > 0.93) return sube(0.5); // farol
    }
    if (o.pasar) return { accion: 'pasar' };
    if (f >= odds + 0.08 || (costo <= st.ciegas[1] && f > 0.25)) return { accion: 'igualar' };
    return { accion: 'retirarse' };
  }

  // ---------- Baraja española (openspec: cartas-espanolas): ids 0..39; palo ⌊id/10⌋, orden id % 10 ----------
  const ESP_PALOS = ['oros', 'copas', 'espadas', 'bastos'];
  const ESP_EMOJI = ['🪙', '🏆', '⚔️', '🪵'];
  const ESP_VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  const ESP_FIGURA = { 1: 'As', 10: 'Sota', 11: 'Caballo', 12: 'Rey' };
  const espPalo = id => Math.floor(id / 10);
  const espOrden = id => id % 10; // secuencia: el 7 y la sota van seguidos
  const espValor = id => ESP_VALORES[id % 10];
  const nombreEsp = id => (ESP_FIGURA[espValor(id)] || String(espValor(id))) + ' de ' + ESP_PALOS[espPalo(id)];

  // ---------- Brisca ----------
  const BR_PUNTOS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
  const BR_ORDEN = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2]; // de mayor a menor fuerza
  const briscaPuntos = id => BR_PUNTOS[espValor(id)] || 0;
  const briscaFuerza = id => 10 - BR_ORDEN.indexOf(espValor(id));

  function briscaNueva(jugadores, rng) {
    const n = jugadores.length;
    let mazo = barajar([...Array(40).keys()].filter(id => n !== 3 || id !== 1), rng); // con 3 se quita el 2 de oros
    const manos = jugadores.map(() => []);
    for (let r = 0; r < 3; r++) for (let j = 0; j < n; j++) manos[j].push(mazo.pop());
    const triunfo = mazo.pop();
    mazo = [triunfo].concat(mazo); // al fondo: se roba al final
    return { jugadores, n, manos, mazo, triunfo, paloTriunfo: espPalo(triunfo), baza: [], lider: 0, turno: 0, puntos: Array(n).fill(0),
      ganadas: jugadores.map(() => []), equipos: n === 4 ? [0, 1, 0, 1] : null, ultimaBaza: null, terminada: false };
  }

  function briscaGanador(baza, paloTriunfo) {
    const triunfos = baza.filter(b => espPalo(b.carta) === paloTriunfo);
    const pool = triunfos.length ? triunfos : baza.filter(b => espPalo(b.carta) === espPalo(baza[0].carta));
    return pool.reduce((m, b) => briscaFuerza(b.carta) > briscaFuerza(m.carta) ? b : m).j;
  }

  function briscaJugar(st, carta) {
    if (st.terminada) return false;
    const j = st.turno, mano = st.manos[j], k = mano.indexOf(carta);
    if (k < 0) return false;
    mano.splice(k, 1);
    st.baza.push({ j, carta });
    if (st.baza.length < st.n) { st.turno = (j + 1) % st.n; return true; }
    const gan = briscaGanador(st.baza, st.paloTriunfo);
    const pts = st.baza.reduce((a, b) => a + briscaPuntos(b.carta), 0);
    st.puntos[gan] += pts; st.ganadas[gan].push(...st.baza.map(b => b.carta));
    st.ultimaBaza = { cartas: st.baza.slice(), ganador: gan, puntos: pts };
    st.baza = [];
    for (let k2 = 0; k2 < st.n && st.mazo.length; k2++) st.manos[(gan + k2) % st.n].push(st.mazo.pop());
    st.lider = st.turno = gan;
    if (st.manos.every(m => !m.length)) st.terminada = true;
    return true;
  }

  function briscaResultado(st) {
    const totales = st.equipos ? [0, 1].map(e => st.puntos.reduce((a, p, j) => a + (st.equipos[j] === e ? p : 0), 0)) : st.puntos.slice();
    const max = Math.max(...totales);
    const ganador = totales.filter(t => t === max).length > 1 ? -1 : totales.indexOf(max);
    return { totales, ganador, equipos: st.equipos };
  }

  function briscaBot(st, rng) {
    const r = rng || Math.random;
    const j = st.turno, mano = st.manos[j].slice();
    const barata = cs => cs.slice().sort((a, b) => briscaPuntos(a) - briscaPuntos(b) || (espPalo(a) === st.paloTriunfo) - (espPalo(b) === st.paloTriunfo) || briscaFuerza(a) - briscaFuerza(b))[0];
    if (!st.baza.length) return barata(mano);
    const enMesa = st.baza.reduce((a, b) => a + briscaPuntos(b.carta), 0);
    const va = briscaGanador(st.baza, st.paloTriunfo);
    const companero = st.equipos && st.equipos[va] === st.equipos[j];
    if (companero) { // cargarle puntos a la pareja si no es triunfo valioso
      const carga = mano.filter(c => espPalo(c) !== st.paloTriunfo).sort((a, b) => briscaPuntos(b) - briscaPuntos(a))[0];
      return carga !== undefined && r() < 0.85 ? carga : barata(mano);
    }
    const ganan = mano.filter(c => briscaGanador(st.baza.concat({ j, carta: c }), st.paloTriunfo) === j);
    if (ganan.length && (enMesa >= 10 || ganan.some(c => espPalo(c) !== st.paloTriunfo && briscaPuntos(c) > 0) || r() < 0.25)) return barata(ganan);
    return barata(mano);
  }

  // ---------- Conquián (2 jugadores) ----------
  function esJuego(ids) {
    if (!ids || ids.length < 3 || new Set(ids).size !== ids.length) return false;
    if (ids.every(id => espValor(id) === espValor(ids[0]))) return ids.length <= 4 && new Set(ids.map(espPalo)).size === ids.length;
    if (!ids.every(id => espPalo(id) === espPalo(ids[0]))) return false;
    const o = ids.map(espOrden).sort((a, b) => a - b);
    return o.every((x, i) => i === 0 || x === o[i - 1] + 1);
  }

  function conquianNueva(jugadores, rng) {
    const mazo = barajar([...Array(40).keys()], rng);
    const manos = [[], []];
    for (let r = 0; r < 8; r++) for (let j = 0; j < 2; j++) manos[j].push(mazo.pop());
    return { jugadores, manos, bajados: [[], []], mazo, muertas: [], oferta: { carta: mazo.pop(), para: 0, origen: 'mazo', segunda: false },
      fase: 'oferta', turno: 0, terminada: false, ganador: null, ultima: null };
  }
  const bajadas = (st, j) => st.bajados[j].reduce((a, m) => a + m.length, 0);
  function voltear(st, j) {
    if (!st.mazo.length) { st.oferta = null; st.terminada = true; st.ganador = -1; return; }
    st.oferta = { carta: st.mazo.pop(), para: j, origen: 'mazo', segunda: false }; st.turno = j; st.fase = 'oferta';
  }
  // Cartas `con` (de la mano) + extra forman un juego nuevo o extienden el juego `a`.
  function armar(st, j, con, extra, a) {
    if (!Array.isArray(con) || !con.every(id => st.manos[j].includes(id)) || new Set(con).size !== con.length) return null;
    const base = a === undefined || a === null ? [] : st.bajados[j][a];
    if (!base) return null;
    const juego = base.concat(extra, con);
    return esJuego(juego) ? juego : null;
  }
  function aplicarJuego(st, j, con, juego, a) {
    st.manos[j] = st.manos[j].filter(id => !con.includes(id));
    if (a === undefined || a === null) st.bajados[j].push(juego); else st.bajados[j][a] = juego;
    if (bajadas(st, j) >= 9) { st.terminada = true; st.ganador = j; }
  }

  function conquianActuar(st, mv) {
    if (st.terminada || !mv) return false;
    const j = st.turno, otro = 1 - j, acc = mv.accion;
    if (st.fase === 'oferta') {
      if (acc === 'pasar') {
        const o = st.oferta;
        st.ultima = { j, accion: 'pasar', carta: o.carta };
        if (o.origen === 'mazo' && !o.segunda) { st.oferta = Object.assign({}, o, { para: otro, segunda: true }); st.turno = otro; return true; }
        st.muertas.push(o.carta); voltear(st, j); return true;
      }
      if (acc === 'tomar') {
        const con = mv.con || [];
        const juego = armar(st, j, con, [st.oferta.carta], mv.a);
        if (!juego) return false;
        st.ultima = { j, accion: 'tomar', carta: st.oferta.carta };
        st.oferta = null; st.fase = 'bajar';
        aplicarJuego(st, j, con, juego, mv.a);
        return true;
      }
      return false;
    }
    if (acc === 'bajar') {
      const con = mv.con || [];
      if (!con.length) return false;
      const juego = armar(st, j, con, [], mv.a);
      if (!juego) return false;
      st.ultima = { j, accion: 'bajar' };
      aplicarJuego(st, j, con, juego, mv.a);
      return true;
    }
    if (acc === 'descartar') {
      const k = st.manos[j].indexOf(mv.carta);
      if (k < 0) return false;
      st.manos[j].splice(k, 1);
      st.ultima = { j, accion: 'descartar', carta: mv.carta };
      st.oferta = { carta: mv.carta, para: otro, origen: 'descarte', segunda: false }; st.fase = 'oferta'; st.turno = otro;
      return true;
    }
    return false;
  }

  // Opciones para bajar con una carta extra (o solo de la mano): extender un juego propio o formar uno nuevo.
  function opcionesJuego(st, j, extra) {
    const mano = st.manos[j], ops = [];
    st.bajados[j].forEach((m, a) => {
      if (extra.length && esJuego(m.concat(extra))) ops.push({ con: [], a });
      mano.forEach(c => { if (esJuego(m.concat(extra, [c]))) ops.push({ con: [c], a }); });
    });
    const n = mano.length;
    for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
      if (extra.length && esJuego(extra.concat([mano[x], mano[y]]))) ops.push({ con: [mano[x], mano[y]] });
      for (let z = y + 1; z < n; z++) if (esJuego(extra.concat([mano[x], mano[y], mano[z]]))) ops.push({ con: [mano[x], mano[y], mano[z]] });
    }
    return ops.filter(o => extra.length || o.con.length).sort((p, q) => q.con.length - p.con.length);
  }
  function conquianBot(st, rng) {
    const r = rng || Math.random;
    const j = st.turno;
    if (st.fase === 'oferta') {
      const ops = opcionesJuego(st, j, [st.oferta.carta]);
      if (!ops.length) return { accion: 'pasar' };
      const mejor = ops.filter(o => o.con.length === ops[0].con.length);
      return Object.assign({ accion: 'tomar' }, mejor[Math.floor(r() * mejor.length)]);
    }
    const bajar = opcionesJuego(st, j, []);
    if (bajar.length) return Object.assign({ accion: 'bajar' }, bajar[0]);
    const mano = st.manos[j];
    const liga = c => mano.filter(x => x !== c && (espValor(x) === espValor(c) || (espPalo(x) === espPalo(c) && Math.abs(espOrden(x) - espOrden(c)) <= 2))).length;
    const carta = mano.slice().sort((a, b) => liga(a) - liga(b) || espOrden(b) - espOrden(a))[0];
    return { accion: 'descartar', carta };
  }

  g.Cartas = { PALOS, RANGOS, rango, palo, nombreCarta, esRoja, barajar, valor5, mejorMano, NOMBRES_MANO, CIEGAS,
    pokerNueva, pokerMano, pokerActuar, pokerBot, opciones, bote,
    ESP_PALOS, ESP_EMOJI, espPalo, espOrden, espValor, nombreEsp,
    briscaNueva, briscaJugar, briscaGanador, briscaPuntos, briscaResultado, briscaBot,
    esJuego, conquianNueva, conquianActuar, conquianBot, opcionesJuego, bajadas };
})(typeof window !== 'undefined' ? window : globalThis);
