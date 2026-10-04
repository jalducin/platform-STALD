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

  g.Cartas = { PALOS, RANGOS, rango, palo, nombreCarta, esRoja, barajar, valor5, mejorMano, NOMBRES_MANO, CIEGAS,
    pokerNueva, pokerMano, pokerActuar, pokerBot, opciones, bote };
})(typeof window !== 'undefined' ? window : globalThis);
