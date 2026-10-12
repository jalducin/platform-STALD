/* Motor de «Billar bola 8» (openspec: futbolito-billar). Sin DOM; requiere juegos/fisica.js. Determinista: solo
   + − * / y Math.sqrt en la simulación, paso fijo de 1/240 s y estado redondeado tras cada tiro, para que la sala
   1 vs 1 se reproduzca igual en todos los aparatos. Lo usan juegos/billar.html y server/fisica_test.ts. */
(function (raiz) {
  'use strict';
  const F = raiz.Fisica;
  const ANCHO = 1000, ALTO = 500, R = 11, D = 2 * R;
  const SUB = 4, DT = 1 / 240, DECEL = 500, PARA = 4, E_BOLA = 0.95, E_BANDA = 0.75, MAX_PASOS = 240 * 40;
  // Troneras: centro (un poco fuera de la mesa) y radio de captura.
  const TRONERAS = [
    { x: -4, y: -4, r: 28 }, { x: 500, y: -8, r: 24 }, { x: 1004, y: -4, r: 28 },
    { x: -4, y: 504, r: 28 }, { x: 500, y: 508, r: 24 }, { x: 1004, y: 504, r: 28 },
  ];
  const SALIDA = { x: 250, y: 250 }, PIE = { x: 750, y: 250 };
  const tipo = n => {
    if (n === 0) return 'blanca';
    if (n === 8) return 'ocho';
    return n < 8 ? 'lisas' : 'rayadas';
  };
  const velocidad = fuerza => 300 + 15 * fuerza;

  // Triángulo con la 8 en medio y una lisa y una rayada en las esquinas de atrás; el resto al azar con la semilla.
  function inicial(seed) {
    const r = F.rng(seed, 'billar-triangulo');
    const barajar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const lisas = barajar([1, 2, 3, 4, 5, 6, 7]), rayadas = barajar([9, 10, 11, 12, 13, 14, 15]);
    const esquinas = r() < 0.5 ? [lisas.pop(), rayadas.pop()] : [rayadas.pop(), lisas.pop()];
    const resto = barajar(lisas.concat(rayadas));
    const bolas = [{ n: 0, x: SALIDA.x, y: SALIDA.y, fuera: false }];
    for (let k = 0; k < 5; k++) for (let j = 0; j <= k; j++) {
      // `resto.pop()` solo se evalúa cuando el lugar no es fijo (mismo orden de bolas que antes).
      let n;
      if (k === 2 && j === 1) n = 8;
      else if (k === 4 && j === 0) n = esquinas[0];
      else n = k === 4 && j === 4 ? esquinas[1] : resto.pop();
      bolas.push({ n, x: F.q(PIE.x + k * (D * 0.8660254 + 0.05)), y: F.q(PIE.y + (j - k / 2) * (D + 0.05)), fuera: false });
    }
    bolas.sort((a, b) => a.n - b.n);
    return { bolas, turno: 0, grupos: [null, null], fin: null, tiros: 0, ultimo: null };
  }

  const vivas = st => st.bolas.filter(o => !o.fuera);
  const quedan = (st, grupo) => st.bolas.filter(o => !o.fuera && tipo(o.n) === grupo).length;
  // ¿Ya le toca la 8? (grupo asignado y sin bolas de su grupo en la mesa)
  const enLaOcho = (st, idx) => st.grupos[idx] !== null && quedan(st, st.grupos[idx]) === 0;

  // Simulación de un tiro. `paso()` avanza un subpaso; la página llama SUB por cuadro para animar y la reproducción
  // instantánea corre hasta `termino`: el resultado es el mismo.
  function crearSim(st0, tiro) {
    const b = st0.bolas.map(o => ({ n: o.n, x: o.x, y: o.y, vx: 0, vy: 0, fuera: o.fuera }));
    const [sn, cs] = F.senCos(tiro.angulo);
    const v0 = velocidad(tiro.fuerza), efecto = (tiro.efecto || 0) / 100;
    b[0].vx = cs * v0; b[0].vy = sn * v0;
    const sim = { bolas: b, metidas: [], primer: null, pasos: 0, termino: false, choques: 0, bandas: 0 };
    // Partes de un subpaso, en el orden en que las corre `paso()`.
    const avanzar = () => {
      for (const o of b) if (!o.fuera && (o.vx !== 0 || o.vy !== 0)) { o.x += o.vx * DT; o.y += o.vy * DT; }
    };
    const entronerar = () => {
      for (const o of b) {
        if (o.fuera || (o.vx === 0 && o.vy === 0)) continue;
        for (const t of TRONERAS) {
          const dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy < t.r * t.r) { o.fuera = true; o.vx = 0; o.vy = 0; o.x = t.x; o.y = t.y; sim.metidas.push(o.n); break; }
        }
      }
    };
    const chocar = () => {
      for (let i = 0; i < b.length; i++) {
        const p = b[i]; if (p.fuera) continue;
        for (let j = i + 1; j < b.length; j++) {
          const o = b[j]; if (o.fuera) continue;
          const dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
          if (d2 >= D * D || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, sep = (D - d) / 2;
          p.x -= nx * sep; p.y -= ny * sep; o.x += nx * sep; o.y += ny * sep;
          const vr = (p.vx - o.vx) * nx + (p.vy - o.vy) * ny;
          if (vr <= 0) continue;
          const pvx = p.vx, pvy = p.vy, imp = vr * (1 + E_BOLA) / 2;
          p.vx -= imp * nx; p.vy -= imp * ny; o.vx += imp * nx; o.vy += imp * ny;
          sim.choques++;
          if (i === 0 && sim.primer === null) {
            sim.primer = o.n;
            // Efecto: al primer choque la blanca sigue (positivo) o regresa (negativo) en la dirección del tiro.
            if (efecto) { p.vx += pvx * efecto * 0.5; p.vy += pvy * efecto * 0.5; }
          }
        }
      }
    };
    const rebotar = () => {
      for (const o of b) {
        if (o.fuera) continue;
        if (o.x < R) { o.x = R + (R - o.x); o.vx = -o.vx * E_BANDA; o.vy *= 0.97; sim.bandas++; }
        else if (o.x > ANCHO - R) { o.x = (ANCHO - R) - (o.x - (ANCHO - R)); o.vx = -o.vx * E_BANDA; o.vy *= 0.97; sim.bandas++; }
        if (o.y < R) { o.y = R + (R - o.y); o.vy = -o.vy * E_BANDA; o.vx *= 0.97; sim.bandas++; }
        else if (o.y > ALTO - R) { o.y = (ALTO - R) - (o.y - (ALTO - R)); o.vy = -o.vy * E_BANDA; o.vx *= 0.97; sim.bandas++; }
      }
    };
    // Fricción; devuelve si alguna bola sigue en movimiento.
    const frenar = () => {
      let mueve = false;
      for (const o of b) {
        if (o.fuera || (o.vx === 0 && o.vy === 0)) continue;
        const v = Math.sqrt(o.vx * o.vx + o.vy * o.vy), nv = v - DECEL * DT;
        if (nv <= PARA) { o.vx = 0; o.vy = 0; } else { const f = nv / v; o.vx *= f; o.vy *= f; mueve = true; }
      }
      return mueve;
    };
    sim.paso = () => {
      if (sim.termino) return;
      avanzar();
      entronerar();
      chocar();
      rebotar();
      const mueve = frenar();
      sim.pasos++;
      if (!mueve || sim.pasos >= MAX_PASOS) sim.termino = true;
    };
    sim.resultado = () => reglas(st0, b, sim.metidas, sim.primer, Math.round(sim.pasos * 1000 / 240));
    return sim;
  }

  // ¿La primera bola que tocó la blanca era válida para quien tiró?
  function primerValido(primer, mio, ocho) {
    if (primer === null) return false;
    if (mio === null) return primer !== 8;
    return ocho ? primer === 8 : tipo(primer) === mio;
  }
  // Falta del tiro (o null si no hubo).
  function faltaDelTiro(blancaDentro, primer, primerOk) {
    if (blancaDentro) return 'blanca';
    if (primer === null) return 'sin-toque';
    return primerOk ? null : 'primera';
  }

  // Reglas básicas de la bola 8 (design.md §8) → { st, ms }.
  function reglas(st0, b, metidas, primer, ms) {
    const idx = st0.turno, otro = 1 - idx, mio = st0.grupos[idx];
    const ocho = enLaOcho(st0, idx);
    const blancaDentro = metidas.includes(0);
    const primerOk = primerValido(primer, mio, ocho);
    const falta = faltaDelTiro(blancaDentro, primer, primerOk);
    const grupos = st0.grupos.slice();
    let fin = null;
    if (metidas.includes(8)) fin = ocho && !falta ? { gana: idx, motivo: 'ocho' } : { gana: otro, motivo: falta ? 'ocho-falta' : 'ocho-antes' };
    if (!fin && mio === null && !falta) {
      const prim = metidas.find(n => n !== 0 && n !== 8);
      if (prim !== undefined) { grupos[idx] = tipo(prim); grupos[otro] = tipo(prim) === 'lisas' ? 'rayadas' : 'lisas'; }
    }
    const metioMia = grupos[idx] !== null && metidas.some(n => tipo(n) === grupos[idx]);
    const bolas = b.map(o => ({ n: o.n, x: F.q(o.x), y: F.q(o.y), fuera: o.fuera }));
    if (blancaDentro && !fin) colocarBlanca(bolas);
    return {
      st: { bolas, turno: !fin && !falta && metioMia ? idx : otro, grupos, fin, tiros: st0.tiros + 1, ultimo: { quien: idx, metidas: metidas.slice(), falta, primer } },
      ms,
    };
  }
  // La blanca vuelve a su punto de salida o al lugar libre más cercano sobre la misma línea.
  function colocarBlanca(bolas) {
    const blanca = bolas[0], otras = bolas.filter(o => o.n !== 0 && !o.fuera);
    const libre = (x, y) => otras.every(o => (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) > (D + 1) * (D + 1));
    for (let k = 0; k < 40; k++) {
      const x = SALIDA.x + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (D + 1);
      for (const y of [SALIDA.y, SALIDA.y - 2 * D, SALIDA.y + 2 * D]) {
        if (x > R && x < ANCHO - R && libre(x, y)) { Object.assign(blanca, { x, y, fuera: false }); return; }
      }
    }
    Object.assign(blanca, { x: SALIDA.x, y: SALIDA.y, fuera: false });
  }

  function aplicar(st, tiro) {
    const sim = crearSim(st, tiro);
    while (!sim.termino) sim.paso();
    return sim.resultado();
  }
  const rendir = (st, idx) => Object.assign(F.clonar(st), { fin: { gana: 1 - idx, motivo: 'rendicion' } });
  const tiroDe = j => ({ angulo: j.angulo, fuerza: j.fuerza, efecto: j.efecto || 0 });

  // Bot: tiro de «bola fantasma» con camino libre y menor corte para cada bola válida y tronera; error por nivel.
  const ERROR = { facil: 45, medio: 12, dificil: 5, auto: 70 };
  function tiroBot(st, nivel, rnd) {
    const idx = st.turno, mio = st.grupos[idx], bl = st.bolas[0], v = vivas(st);
    const err = ERROR[nivel] === undefined ? ERROR.medio : ERROR[nivel];
    const ajuste = (angulo, fuerza, efecto) => {
      let a = Math.round(angulo + (rnd() * 2 - 1) * err) % 3600; if (a < 0) a += 3600;
      return { angulo: a, fuerza: F.acotar(Math.round(fuerza + (rnd() * 2 - 1) * 5), 1, 100), efecto };
    };
    if (st.tiros === 0) { // rompe: a la bola del frente, fuerte
      const frente = v.filter(o => o.n !== 0).reduce((a, o) => (o.x < a.x ? o : a));
      return ajuste(F.atan2Dec(frente.y - bl.y, frente.x - bl.x), 94, 0);
    }
    const propias = mio ? v.filter(o => tipo(o.n) === mio) : v.filter(o => o.n !== 0 && o.n !== 8);
    const objetivos = propias.length ? propias : v.filter(o => o.n === 8);
    const libre = (ax, ay, bx, by, sin) => v.every(o => sin.includes(o.n) || F.distSeg(o.x, o.y, ax, ay, bx, by) >= D - 0.5);
    let mejor = null;
    for (const ob of objetivos) for (const t of TRONERAS) {
      const px = F.acotar(t.x, R, ANCHO - R), py = F.acotar(t.y, R, ALTO - R);
      let ux = px - ob.x, uy = py - ob.y; const dl = Math.sqrt(ux * ux + uy * uy); if (dl < 1) continue;
      ux /= dl; uy /= dl;
      if (t.x === 500 && Math.abs(uy) < 0.6) continue; // a media banda solo entra de frente
      const gx = ob.x - ux * D, gy = ob.y - uy * D;
      if (gx < R || gx > ANCHO - R || gy < R || gy > ALTO - R) continue;
      const ax = gx - bl.x, ay = gy - bl.y, da = Math.sqrt(ax * ax + ay * ay); if (da < 1) continue;
      const cos = (ax * ux + ay * uy) / da; if (cos < 0.3) continue;
      if (!libre(bl.x, bl.y, gx, gy, [0, ob.n]) || !libre(ob.x, ob.y, px, py, [0, ob.n])) continue;
      const valor = cos * 900 - da * 0.25 - dl * 0.35;
      if (!mejor || valor > mejor.valor) mejor = { valor, ax, ay, da, dl, cos };
    }
    if (mejor) {
      // Rapidez para que la bola llegue a la tronera con margen y la blanca llegue al choque con esa rapidez.
      const vImpacto = Math.sqrt(2 * DECEL * mejor.dl * 1.5) / (mejor.cos * 0.975) + 60;
      const v0 = Math.sqrt(vImpacto * vImpacto + 2 * DECEL * mejor.da);
      const efecto = nivel === 'dificil' ? Math.round((rnd() * 2 - 1) * 30) : 0;
      return ajuste(F.atan2Dec(mejor.ay, mejor.ax), (v0 - 300) / 15, efecto);
    }
    // Sin tiro limpio: a la bola válida más cercana, con fuerza media.
    const d2 = o => (o.x - bl.x) * (o.x - bl.x) + (o.y - bl.y) * (o.y - bl.y); // sin potencias (determinista)
    const cerca = objetivos.reduce((a, o) => (d2(o) < d2(a) ? o : a));
    return ajuste(F.atan2Dec(cerca.y - bl.y, cerca.x - bl.x), 48, 0);
  }

  // Puntos (individual y sala): 30 por bola propia metida; al ganar 500 + 10 por bola del rival que quedó.
  function puntos(st, idx, extra = 0) {
    const g = st.grupos[idx], gr = st.grupos[1 - idx];
    const mias = g ? 7 - quedan(st, g) : 0, rival = gr ? quedan(st, gr) : 7;
    const gana = st.fin && st.fin.gana === idx;
    return Math.min(1000, 30 * mias + (gana ? 500 + 10 * rival + extra : 0));
  }
  const NOMBRE_FALTA = { blanca: 'metiste la blanca', 'sin-toque': 'la blanca no tocó ninguna bola', primera: 'tocaste primero una bola que no es tuya' };
  const MOTIVO = { ocho: 'metió la 8', 'ocho-falta': 'la 8 entró con falta', 'ocho-antes': 'la 8 entró antes de tiempo', rendicion: 'rendición' };

  raiz.Billar = {
    ANCHO, ALTO, R, D, SUB, TRONERAS, SALIDA, PIE, tipo, velocidad, inicial, crearSim, aplicar, rendir, tiroDe, tiroBot, puntos,
    quedan, enLaOcho, vivas, NOMBRE_FALTA, MOTIVO,
    turno: st => st.turno, fin: st => st.fin,
  };
})(typeof window !== 'undefined' ? window : globalThis);
