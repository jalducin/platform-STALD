// Mando de Arcade (openspec: mando-arcade): mando de consola portátil común para los juegos de 🕹️ Arcade.
// Sin dependencias. Dos capas:
//   - lógica pura (sin DOM; la prueban los tests de Deno en server/mando_test.ts);
//   - Mando.crear(opciones): mando virtual táctil, teclado, controles físicos (Gamepad API) y guía «⌨️ Controles».
// API y reglas de adopción: docs/frontend-standards.md, sección «Mando de Arcade». La API es estable: los juegos
// nuevos la adoptan sin cambiarla.
(function (g) {
  'use strict';

  // ================= Lógica pura =================
  const BOTONES = ['arriba', 'abajo', 'izq', 'der', 'A', 'B', 'X', 'Y', 'L', 'R', 'START', 'SELECT'];
  const DIRECCIONES = ['arriba', 'abajo', 'izq', 'der'];
  const ES_BOTON = new Set(BOTONES);

  // Teclado por omisión (KeyboardEvent.code → botón).
  const TECLAS = {
    ArrowUp: 'arriba', KeyW: 'arriba', ArrowDown: 'abajo', KeyS: 'abajo',
    ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der',
    KeyJ: 'A', KeyK: 'B', KeyU: 'X', KeyI: 'Y', KeyQ: 'L', KeyE: 'R',
    Enter: 'START', NumpadEnter: 'START', ShiftRight: 'SELECT', Backspace: 'SELECT',
  };
  // Control físico, mapeo estándar por POSICIÓN (índice de la Gamepad API → botón).
  const CONTROL_ESTANDAR = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'L', 5: 'R', 6: 'L', 7: 'R', 8: 'SELECT', 9: 'START', 12: 'arriba', 13: 'abajo', 14: 'izq', 15: 'der' };

  // { accion: boton | [botones] } → { accion: [botones] }. Un botón desconocido es un error del juego.
  function normalizarAcciones(acciones) {
    const n = {};
    for (const [accion, v] of Object.entries(acciones || {})) {
      const lista = Array.isArray(v) ? v.slice() : [v];
      if (!lista.length) throw new Error('Mando: la acción «' + accion + '» no tiene botones');
      for (const b of lista) if (!ES_BOTON.has(b)) throw new Error('Mando: botón desconocido «' + b + '» en la acción «' + accion + '»');
      n[accion] = lista;
    }
    return n;
  }
  function botonesUsados(acciones) {
    const s = new Set();
    for (const lista of Object.values(acciones)) for (const b of lista) s.add(b);
    return s;
  }
  // Mapa de teclas por omisión con los cambios del juego ({ Code: boton | null }; null quita la tecla).
  function mapaTeclas(cambios) {
    const m = Object.assign({}, TECLAS);
    for (const [code, b] of Object.entries(cambios || {})) {
      if (b === null) { delete m[code]; continue; }
      if (!ES_BOTON.has(b)) throw new Error('Mando: botón desconocido «' + b + '» para la tecla ' + code);
      m[code] = b;
    }
    return m;
  }
  const teclaABoton = (code, mapa) => (mapa || TECLAS)[code] || null;

  // Cruceta: desplazamiento del dedo desde el centro (y positiva = abajo) → direcciones, en 8 sectores de 45°.
  const SECTORES = [['der'], ['der', 'abajo'], ['abajo'], ['abajo', 'izq'], ['izq'], ['izq', 'arriba'], ['arriba'], ['arriba', 'der']];
  function cruceta(dx, dy, radio, muerta) {
    const m = muerta == null ? 0.25 : muerta;
    if (Math.hypot(dx, dy) < radio * m) return [];
    const s = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    return SECTORES[s].slice();
  }
  // Zona muerta radial: debajo de `muerta` no hay movimiento; arriba se reescala a [0, 1] y se acota al círculo.
  function zonaMuerta(x, y, muerta) {
    const z = muerta == null ? 0.2 : muerta, m = Math.hypot(x, y);
    if (m <= z) return { x: 0, y: 0 };
    const k = (Math.min(m, 1) - z) / (1 - z) / m;
    return { x: x * k, y: y * k };
  }
  // Eje analógico → direcciones de la cruceta (pasado el umbral en cada eje).
  function ejeABotones(x, y, umbral) {
    const u = umbral == null ? 0.5 : umbral, r = [];
    if (y <= -u) r.push('arriba');
    if (y >= u) r.push('abajo');
    if (x <= -u) r.push('izq');
    if (x >= u) r.push('der');
    return r;
  }
  // El candidato más cercano a (x, y) dentro de maxDist ({ id, x, y }[] → id | null).
  function masCercano(x, y, candidatos, maxDist) {
    let mejor = null, d = Infinity;
    for (const c of candidatos || []) {
      const e = Math.hypot(c.x - x, c.y - y);
      if (e < d) { d = e; mejor = c.id; }
    }
    return mejor !== null && d <= maxDist ? mejor : null;
  }
  // Dedos: cada dedo (identifier) presiona una lista de botones; deslizar reemplaza su lista.
  function crearSeguidor() {
    const dedos = new Map();
    return {
      poner(id, botones) { dedos.set(id, (botones || []).slice()); },
      mover(id, botones) { if (dedos.has(id)) dedos.set(id, (botones || []).slice()); },
      quitar(id) { dedos.delete(id); },
      botones() { const s = new Set(); for (const l of dedos.values()) for (const b of l) s.add(b); return s; },
      dedos: () => dedos.size,
      tiene: id => dedos.has(id),
      limpiar() { dedos.clear(); },
    };
  }
  // Control físico (objeto Gamepad o uno simulado) → { botones, eje }.
  function controlABotones(gp, opciones) {
    const o = opciones || {};
    if (!gp || gp.connected === false) return { botones: [], eje: { x: 0, y: 0 } };
    const indices = Object.assign({}, CONTROL_ESTANDAR);
    for (const [i, b] of Object.entries(o.indices || {})) { if (b === null) delete indices[i]; else indices[i] = b; }
    const s = new Set();
    (gp.buttons || []).forEach((bt, i) => {
      const b = indices[i];
      if (!b || !bt) return;
      const v = typeof bt === 'number' ? bt : (bt.pressed ? Math.max(1, bt.value || 0) : bt.value || 0);
      if (v > 0.5) s.add(b);
    });
    const ax = gp.axes || [];
    const eje = zonaMuerta(+ax[0] || 0, +ax[1] || 0, o.muerta);
    for (const d of ejeABotones(eje.x, eje.y)) s.add(d);
    return { botones: BOTONES.filter(b => s.has(b)), eje };
  }
  function flancos(antes, ahora) {
    return { bajan: [...ahora].filter(x => !antes.has(x)), suben: [...antes].filter(x => !ahora.has(x)) };
  }
  // Núcleo: estado de las fuentes (tactil, teclado, control…), acciones activas y eventos por flanco.
  function crearNucleo(o) {
    const op = o || {};
    const acciones = normalizarAcciones(op.acciones);
    const usados = botonesUsados(acciones);
    if (op.analogico) for (const d of DIRECCIONES) usados.add(d);
    const fuentes = new Map(), ejes = new Map(), manejadores = { al: new Map(), suelta: new Map() };
    let activas = new Set(), activo = true;
    const union = () => { const s = new Set(); for (const f of fuentes.values()) for (const b of f) s.add(b); return s; };
    function recalcular() {
      const u = union(), ahora = new Set();
      for (const [a, lista] of Object.entries(acciones)) if (lista.some(b => u.has(b))) ahora.add(a);
      const f = flancos(activas, ahora);
      activas = ahora;
      for (const a of f.suben) for (const fn of (manejadores.suelta.get(a) || []).slice()) fn(a);
      for (const a of f.bajan) for (const fn of (manejadores.al.get(a) || []).slice()) fn(a);
    }
    function suscribir(tipo, accion, fn) {
      if (!(accion in acciones)) throw new Error('Mando: acción desconocida «' + accion + '»');
      const m = manejadores[tipo];
      if (!m.has(accion)) m.set(accion, []);
      m.get(accion).push(fn);
      return () => { const l = m.get(accion), i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
    }
    return {
      acciones, usados,
      ponerFuente(nombre, botones) {
        if (!activo) return;
        fuentes.set(nombre, new Set([...(botones || [])].filter(b => usados.has(b))));
        recalcular();
      },
      ponerEje(nombre, v) { if (activo || !v) ejes.set(nombre, v || null); },
      presionado: accion => activas.has(accion),
      botones() { const u = union(); return BOTONES.filter(b => u.has(b)); },
      activas: () => [...activas],
      eje() {
        for (const n of ['palanca', 'control']) { const v = ejes.get(n); if (v && (v.x || v.y)) return { x: v.x, y: v.y }; }
        const u = union();
        let x = (u.has('der') ? 1 : 0) - (u.has('izq') ? 1 : 0), y = (u.has('abajo') ? 1 : 0) - (u.has('arriba') ? 1 : 0);
        if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
        return { x, y };
      },
      al: (accion, fn) => suscribir('al', accion, fn),
      alSoltar: (accion, fn) => suscribir('suelta', accion, fn),
      soltarTodo() { fuentes.clear(); ejes.clear(); recalcular(); },
      activar(on) { if (!on) { fuentes.clear(); ejes.clear(); recalcular(); } activo = !!on; },
      activo: () => activo,
    };
  }

  // ---------- Guía de controles (textos sin marcas) ----------
  const TEXTO_MANDO = { arriba: 'Cruceta ↑', abajo: 'Cruceta ↓', izq: 'Cruceta ←', der: 'Cruceta →', A: 'A', B: 'B', X: 'X', Y: 'Y', L: 'L', R: 'R', START: 'START', SELECT: 'SELECT' };
  const TEXTO_CONTROL = {
    arriba: 'Cruceta o palanca ↑', abajo: 'Cruceta o palanca ↓', izq: 'Cruceta o palanca ←', der: 'Cruceta o palanca →',
    A: 'Botón de abajo', B: 'Botón derecho', X: 'Botón izquierdo', Y: 'Botón de arriba',
    L: 'Gatillo izquierdo', R: 'Gatillo derecho', START: 'Start / Menú', SELECT: 'Select / Vista',
  };
  const TEXTO_TECLA = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espacio', Enter: 'Enter', NumpadEnter: 'Enter', ShiftRight: 'Shift derecho', ShiftLeft: 'Shift izquierdo', Backspace: 'Retroceso', Escape: 'Esc', Tab: 'Tab' };
  const textoTecla = code => TEXTO_TECLA[code] || (/^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : code);
  const mayuscula = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  function guia(acciones, mapa, nombres) {
    const n = nombres || {}, t = mapa || TECLAS;
    return Object.entries(acciones).map(([accion, lista]) => {
      const teclas = [];
      for (const b of lista) for (const [code, bb] of Object.entries(t)) if (bb === b) { const x = textoTecla(code); if (!teclas.includes(x)) teclas.push(x); }
      const ctl = [];
      for (const b of lista) { const x = TEXTO_CONTROL[b]; if (!ctl.includes(x)) ctl.push(x); }
      return { accion, nombre: mayuscula(n[accion] || accion), botones: lista.slice(), mando: lista.map(b => TEXTO_MANDO[b]).join(' / '), teclas, control: ctl.join(' / ') };
    });
  }

  // ================= Capa de navegador =================
  const CSS = `
.mando{--u:clamp(30px,calc((100vw - 96px) / 6.2),48px);position:relative;flex:0 0 auto;display:flex;justify-content:space-between;align-items:flex-end;gap:8px;
 padding:calc(var(--u) * .62 + 14px) 12px calc(12px + env(safe-area-inset-bottom,0px));margin:0 6px 6px;border-radius:18px 18px 30px 30px;
 background:linear-gradient(180deg,#4b536b 0%,#363c51 45%,#2a2f41 100%);border:1px solid #1b1f2d;
 box-shadow:inset 0 2px 0 rgba(255,255,255,.18),inset 0 -3px 0 rgba(0,0,0,.35),0 6px 18px rgba(0,0,0,.45);
 touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;
 font-family:"Trebuchet MS",system-ui,sans-serif;color:#fff;z-index:4;box-sizing:border-box;line-height:1}
.mando *{box-sizing:border-box}
.mando.mando-escondido{display:none!important}
.mando .mando-oculto{visibility:hidden!important}
.mando .mando-fuera{display:none!important}
.mando.mando-sin-gatillos{padding-top:16px}
.mando.mando-con-nombres{padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
.mando-rombo.mando-parcial::before{display:none}
.mando-lado{display:flex;flex-direction:column;align-items:center;gap:10px}
.mando-gatillo{position:absolute;top:6px;width:calc(var(--u) * 2.6);height:calc(var(--u) * .62);display:flex;align-items:center;justify-content:center;
 font-weight:900;font-size:calc(var(--u) * .36);color:#e8ecf8;text-shadow:0 1px 0 rgba(0,0,0,.5);background:linear-gradient(#717a97,#464d65);
 border:1px solid #1b1f2d;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 2px 0 #181b27}
.mando-izq .mando-gatillo{left:12px;border-radius:16px 8px 8px 6px}
.mando-der .mando-gatillo{right:12px;border-radius:8px 16px 6px 8px}
.mando-gatillo.on{background:linear-gradient(#5a6280,#3a4056);box-shadow:inset 0 2px 3px rgba(0,0,0,.4);color:#ffd166}
.mando-cruceta{position:relative;width:calc(var(--u) * 3);height:calc(var(--u) * 3);filter:drop-shadow(0 3px 0 #151824) drop-shadow(0 4px 6px rgba(0,0,0,.35))}
.mando-cruceta i{position:absolute;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:calc(var(--u) * .34);color:rgba(220,226,245,.6);
 background:linear-gradient(145deg,#3b4157,#1f2333)}
.mando-cruceta .arriba{left:var(--u);top:0;width:var(--u);height:calc(var(--u) + 1px);border-radius:8px 8px 0 0}
.mando-cruceta .abajo{left:var(--u);bottom:0;width:var(--u);height:calc(var(--u) + 1px);border-radius:0 0 8px 8px}
.mando-cruceta .izq{top:var(--u);left:0;height:var(--u);width:calc(var(--u) + 1px);border-radius:8px 0 0 8px}
.mando-cruceta .der{top:var(--u);right:0;height:var(--u);width:calc(var(--u) + 1px);border-radius:0 8px 8px 0}
.mando-cruceta .centro{left:var(--u);top:var(--u);width:var(--u);height:var(--u);background:radial-gradient(circle,#161925 0 26%,#2b3043 30% 100%)}
.mando-cruceta i.on{background:linear-gradient(145deg,#5d6683,#3a4159);color:#ffd166}
.mando-palanca{position:relative;width:calc(var(--u) * 2.5);height:calc(var(--u) * 2.5);border-radius:50%;
 background:radial-gradient(circle,#1a1d29 0 55%,#2b3042 70%,#3d4459 100%);box-shadow:inset 0 3px 6px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.12)}
.mando-perilla{position:absolute;left:50%;top:50%;width:calc(var(--u) * 1.45);height:calc(var(--u) * 1.45);margin:calc(var(--u) * -.725) 0 0 calc(var(--u) * -.725);
 border-radius:50%;background:radial-gradient(circle at 50% 45%,#8e96b0 0 30%,#6d7592 32% 62%,#4e556c 100%);
 box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.25);will-change:transform}
.mando-rombo{position:relative;width:calc(var(--u) * 3.1);height:calc(var(--u) * 3.1)}
.mando-rombo::before{content:"";position:absolute;inset:6%;border-radius:50%;background:rgba(0,0,0,.16);box-shadow:inset 0 2px 5px rgba(0,0,0,.35)}
.mando-boton{position:absolute;width:calc(var(--u) * 1.12);height:calc(var(--u) * 1.12);border-radius:50%;transform:translate(-50%,-50%);
 display:flex;align-items:center;justify-content:center;font-weight:900;font-size:calc(var(--u) * .5);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55);
 background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.55),rgba(255,255,255,0) 46%),var(--c);
 box-shadow:0 3px 0 var(--s),0 5px 8px rgba(0,0,0,.4),inset 0 -2px 3px rgba(0,0,0,.22);transition:transform .05s}
.mando-boton[data-b="X"]{left:50%;top:17%;--c:#3b82f6;--s:#1e4fc0}
.mando-boton[data-b="Y"]{left:17%;top:50%;--c:#22a559;--s:#13703a}
.mando-boton[data-b="A"]{left:83%;top:50%;--c:#e5484d;--s:#a5232a}
.mando-boton[data-b="B"]{left:50%;top:83%;--c:#e9ad00;--s:#a77700}
.mando-boton.on{transform:translate(-50%,-50%) translateY(2px) scale(.94);box-shadow:0 1px 0 var(--s),0 2px 4px rgba(0,0,0,.4);filter:brightness(1.15)}
.mando-boton small,.mando-pildora-caja small{font-size:10px;font-weight:700;white-space:nowrap;color:#d3d9ec;text-shadow:none;letter-spacing:.02em}
.mando-boton small{position:absolute;top:calc(100% + 3px);left:50%;transform:translateX(-50%)}
.mando-centro{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;min-width:56px;align-self:stretch}
.mando-led{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;margin-bottom:auto}
.mando-pildoras{display:flex;flex-direction:column;gap:8px;align-items:center}
.mando-pildora-caja{display:flex;flex-direction:column;align-items:center;gap:3px}
.mando-pildora{width:54px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;letter-spacing:.08em;color:#d8deef;
 background:linear-gradient(#262b3b,#191c28);border:1px solid #0f121b;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 0 #12151f}
.mando-pildora.on{color:#ffd166;transform:translateY(1px);box-shadow:inset 0 1px 2px rgba(0,0,0,.5)}
@media (orientation:landscape) and (max-height:520px){
 .mando{--u:clamp(28px,13vh,44px);position:absolute;inset:0;margin:0;padding:0;display:block;background:none;border:0;box-shadow:none;border-radius:0;pointer-events:none}
 .mando-lado,.mando-centro{position:absolute;pointer-events:auto;bottom:calc(8px + env(safe-area-inset-bottom,0px))}
 .mando-lado{gap:6px;padding:4px;opacity:.88}
 .mando .mando-gatillo.mando-oculto{display:none!important}
 .mando-izq{left:calc(8px + env(safe-area-inset-left,0px))}
 .mando-der{right:calc(8px + env(safe-area-inset-right,0px))}
 .mando-gatillo{position:static;width:100%}
 .mando-centro{left:50%;transform:translateX(-50%);min-width:0;flex-direction:row;bottom:calc(4px + env(safe-area-inset-bottom,0px));opacity:.86}
 .mando-pildoras{flex-direction:row}
 .mando-led,.mando-boton small,.mando-pildora-caja small{display:none}
}
.mando-aviso{position:fixed;left:50%;top:22%;z-index:60;transform:translate(-50%,-24px);opacity:0;max-width:calc(100vw - 24px);padding:9px 16px;border-radius:999px;
 background:rgba(17,24,39,.92);color:#fff;font:700 15px "Trebuchet MS",system-ui,sans-serif;box-shadow:0 6px 16px rgba(0,0,0,.35);pointer-events:none;
 transition:opacity .2s,transform .2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mando-aviso.ver{opacity:1;transform:translate(-50%,0)}
.mando-guia-btn{font:inherit;font-weight:800;font-size:15px;min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);
 background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
.mando-guia{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(8,10,20,.72);
 font-family:"Trebuchet MS",system-ui,sans-serif;color:#fff}
.mando-guia[hidden]{display:none}
.mando-guia-caja{width:100%;max-width:560px;max-height:100%;overflow:auto;background:#1f2435;border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:14px 14px 12px;
 box-shadow:0 12px 32px rgba(0,0,0,.5);text-align:left}
.mando-guia h2{margin:0 0 8px;font-size:20px;color:#ffd166}
.mando-guia table{width:100%;border-collapse:collapse;font-size:13px}
.mando-guia th,.mando-guia td{padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.12);vertical-align:top;text-align:left}
.mando-guia th{font-size:12px;color:#c7cee3}
.mando-guia kbd{display:inline-block;min-width:20px;margin:1px 2px 1px 0;padding:1px 5px;border:1px solid rgba(255,255,255,.3);border-bottom-width:2px;border-radius:5px;
 background:#2c3347;font:700 12px system-ui,sans-serif;text-align:center}
.mando-guia p{font-size:13px;margin:8px 0 0;color:#d6dcee}
.mando-guia-cerrar{margin-top:12px;font:inherit;font-weight:800;font-size:16px;min-height:44px;width:100%;border:0;border-radius:999px;background:#ff8a1f;color:#fff;cursor:pointer}
.mando-guia button:focus-visible,.mando-guia-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.mando *,.mando-aviso{transition:none!important}}
`;

  function inyectarCss(doc) {
    if (doc.getElementById('mando-css')) return;
    const s = doc.createElement('style');
    s.id = 'mando-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }
  const esInteractivo = el => !!(el && el.closest && el.closest('button, a[href], input, select, textarea, [contenteditable="true"], [role="button"]'));

  function crear(opciones) {
    const op = opciones || {};
    const doc = g.document, win = g;
    const nucleo = crearNucleo({ acciones: op.acciones, analogico: !!op.analogico });
    const { acciones, usados } = nucleo;
    const teclas = mapaTeclas(op.teclas);
    const muerta = op.zonaMuerta == null ? 0.2 : op.zonaMuerta;
    const nombres = op.nombres || null;
    const contenedor = op.contenedor || doc.body;
    inyectarCss(doc);

    // ---------- DOM ----------
    const etiqueta = b => {
      if (!nombres) return '';
      const l = Object.keys(acciones).filter(a => acciones[a].includes(b)).map(a => nombres[a] || a);
      return l.length ? '<small>' + l.join(' / ').replace(/[&<>"']/g, '') + '</small>' : '';
    };
    const vis = b => usados.has(b) ? '' : ' mando-oculto';
    const hayDir = DIRECCIONES.some(d => usados.has(d)) && !(op.analogico && !DIRECCIONES.some(d => Object.values(acciones).some(l => l.includes(d))));
    const flecha = { arriba: '▲', abajo: '▼', izq: '◀', der: '▶' };
    const izqVacio = !usados.has('L') && !hayDir && !op.analogico;
    const derVacio = !['R', 'A', 'B', 'X', 'Y'].some(b => usados.has(b));
    const raiz = doc.createElement('div');
    raiz.className = 'mando' + (usados.has('L') || usados.has('R') ? '' : ' mando-sin-gatillos') + (nombres ? ' mando-con-nombres' : '');
    raiz.setAttribute('aria-hidden', 'true'); // el teclado y la guía son la vía accesible
    raiz.innerHTML =
      '<div class="mando-lado mando-izq' + (izqVacio ? ' mando-oculto' : '') + '">' +
        '<div class="mando-gatillo' + vis('L') + '" data-b="L" data-zona="b">L</div>' +
        (op.analogico ? '<div class="mando-palanca" data-zona="palanca"><div class="mando-perilla"></div></div>' : '') +
        (hayDir ? '<div class="mando-cruceta" data-zona="cruceta">' + DIRECCIONES.map(d => '<i class="' + d + vis(d) + '" data-dir="' + d + '">' + flecha[d] + '</i>').join('') + '<i class="centro"></i></div>' : '') +
      '</div>' +
      '<div class="mando-centro"><div class="mando-led"></div><div class="mando-pildoras">' +
        ['SELECT', 'START'].map(b => '<div class="mando-pildora-caja' + (usados.has(b) ? '' : ' mando-fuera') + '"><div class="mando-pildora" data-b="' + b + '" data-zona="b">' + b + '</div>' + etiqueta(b) + '</div>').join('') +
      '</div></div>' +
      '<div class="mando-lado mando-der' + (derVacio ? ' mando-oculto' : '') + '">' +
        '<div class="mando-gatillo' + vis('R') + '" data-b="R" data-zona="b">R</div>' +
        '<div class="mando-rombo' + (['A', 'B', 'X', 'Y'].every(b => usados.has(b)) ? '' : ' mando-parcial') + '" data-zona="rombo">' + ['X', 'Y', 'A', 'B'].map(b => '<div class="mando-boton' + vis(b) + '" data-b="' + b + '">' + b + etiqueta(b) + '</div>').join('') + '</div>' +
      '</div>';
    contenedor.appendChild(raiz);
    const perilla = raiz.querySelector('.mando-perilla');

    // ---------- Visibilidad y alto ocupado ----------
    let pedido = true, destruido = false;
    const forzado = op.visible == null ? 'auto' : op.visible;
    const tactil = () => 'ontouchstart' in win || (win.matchMedia && win.matchMedia('(any-pointer: coarse)').matches);
    const visible = () => pedido && (forzado === true || (forzado !== false && (tactil() || win.innerWidth < 700)));
    function publicarAlto() {
      const encimado = win.getComputedStyle(raiz).position === 'absolute';
      const h = !encimado && raiz.offsetHeight ? raiz.offsetHeight + 6 : 0;
      doc.documentElement.style.setProperty('--mando-alto', h + 'px');
    }
    function aplicarVisible() { raiz.classList.toggle('mando-escondido', !visible()); publicarAlto(); }
    const alCambiarTam = () => aplicarVisible();
    win.addEventListener('resize', alCambiarTam);
    let ro = null;
    if (win.ResizeObserver) { ro = new win.ResizeObserver(publicarAlto); ro.observe(raiz); }

    // ---------- Pintar lo presionado ----------
    let pintado = '';
    function pintar() {
      const b = new Set(nucleo.botones()), clave = [...b].join(',');
      if (clave === pintado) return;
      pintado = clave;
      raiz.querySelectorAll('[data-b]').forEach(el => el.classList.toggle('on', b.has(el.dataset.b)));
      raiz.querySelectorAll('[data-dir]').forEach(el => el.classList.toggle('on', b.has(el.dataset.dir)));
    }

    // ---------- Toques ----------
    const seguidor = crearSeguidor(), dedos = new Map();
    let palancaDe = null, previosTactil = new Set();
    function zonaEn(x, y) {
      const el = doc.elementFromPoint(x, y);
      if (!el || !raiz.contains(el)) return null;
      const z = el.closest('[data-zona]');
      return z && raiz.contains(z) && !z.classList.contains('mando-oculto') ? z : null;
    }
    const centroDe = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; };
    function botonesEn(z, x, y) {
      if (!z) return [];
      const tipo = z.dataset.zona;
      if (tipo === 'cruceta') { const c = centroDe(z); return cruceta(x - c.x, y - c.y, c.r); }
      if (tipo === 'rombo') {
        const cand = [...z.querySelectorAll('[data-b]:not(.mando-oculto)')].map(b => { const c = centroDe(b); return { id: b.dataset.b, x: c.x, y: c.y }; });
        const id = masCercano(x, y, cand, centroDe(z).r * 0.9);
        return id ? [id] : [];
      }
      if (tipo === 'b') return [z.dataset.b];
      return [];
    }
    function moverPalanca(x, y) {
      const c = centroDe(raiz.querySelector('.mando-palanca'));
      const rp = perilla.getBoundingClientRect().width / 2, R = Math.max(1, c.r - rp * 0.55);
      let dx = (x - c.x) / R, dy = (y - c.y) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      perilla.style.transform = 'translate(' + (dx * R).toFixed(1) + 'px,' + (dy * R).toFixed(1) + 'px)';
      const v = zonaMuerta(dx, dy, muerta);
      nucleo.ponerEje('palanca', v);
      return ejeABotones(v.x, v.y);
    }
    function soltarPalanca() {
      palancaDe = null;
      if (perilla) { perilla.style.transform = ''; }
      nucleo.ponerEje('palanca', null);
    }
    function resolver(id, x, y, empieza) {
      const d = dedos.get(id);
      if (d.tipo === 'palanca') return moverPalanca(x, y);
      if (!empieza && d.tipo === 'cruceta' && d.el) {
        const c = centroDe(d.el);
        if (Math.hypot(x - c.x, y - c.y) <= c.r * 1.8) return cruceta(x - c.x, y - c.y, c.r);
      }
      const z = zonaEn(x, y);
      if (z && z.dataset.zona === 'palanca') {
        if (empieza && palancaDe === null) { palancaDe = id; d.tipo = 'palanca'; d.el = z; return moverPalanca(x, y); }
        return [];
      }
      d.tipo = z ? z.dataset.zona : null; d.el = z;
      return botonesEn(z, x, y);
    }
    function actualizarTactil() {
      const ahora = seguidor.botones();
      const nuevo = [...ahora].some(b => !previosTactil.has(b) && usados.has(b));
      previosTactil = ahora;
      nucleo.ponerFuente('tactil', ahora);
      pintar();
      if (nuevo && op.vibrar !== false && win.navigator && typeof win.navigator.vibrate === 'function') { try { win.navigator.vibrate(12); } catch { /* sin vibración */ } }
    }
    function inicio(id, x, y) {
      if (!nucleo.activo()) return;
      dedos.set(id, { tipo: null, el: null });
      seguidor.poner(id, resolver(id, x, y, true));
      actualizarTactil();
    }
    function mover(id, x, y) {
      if (!dedos.has(id)) return;
      seguidor.mover(id, resolver(id, x, y, false));
      actualizarTactil();
    }
    function fin(id) {
      if (!dedos.has(id)) return;
      if (palancaDe === id) soltarPalanca();
      dedos.delete(id); seguidor.quitar(id);
      actualizarTactil();
    }
    const alTocar = tipo => e => {
      if (e.cancelable) e.preventDefault();
      for (const t of e.changedTouches) {
        if (tipo === 'start') inicio('t' + t.identifier, t.clientX, t.clientY);
        else if (tipo === 'move') mover('t' + t.identifier, t.clientX, t.clientY);
        else fin('t' + t.identifier);
      }
    };
    const escuchas = [];
    const escuchar = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); escuchas.push([el, ev, fn, o]); };
    const conTouch = 'ontouchstart' in win;
    escuchar(raiz, 'touchstart', alTocar('start'), { passive: false });
    escuchar(raiz, 'touchmove', alTocar('move'), { passive: false });
    escuchar(raiz, 'touchend', alTocar('end'), { passive: false });
    escuchar(raiz, 'touchcancel', alTocar('end'), { passive: false }); // el sistema interrumpió: sí suelta
    // Pointer events solo para mouse y pluma (o toques si el navegador no tiene touch events). Nunca se suelta por
    // lostpointercapture (lección de Karts).
    const usarPuntero = e => e.pointerType !== 'touch' || !conTouch;
    escuchar(raiz, 'pointerdown', e => {
      if (!usarPuntero(e)) return;
      e.preventDefault();
      try { raiz.setPointerCapture(e.pointerId); } catch { /* nada */ }
      inicio('p' + e.pointerId, e.clientX, e.clientY);
    });
    escuchar(raiz, 'pointermove', e => { if (usarPuntero(e)) mover('p' + e.pointerId, e.clientX, e.clientY); });
    escuchar(raiz, 'pointerup', e => { if (usarPuntero(e)) fin('p' + e.pointerId); });
    escuchar(raiz, 'pointercancel', e => { if (usarPuntero(e)) fin('p' + e.pointerId); });
    escuchar(raiz, 'contextmenu', e => e.preventDefault());

    // ---------- Teclado ----------
    const abajo = new Set();
    const fuenteTeclado = () => { nucleo.ponerFuente('teclado', [...abajo].map(c => teclas[c])); pintar(); };
    escuchar(win, 'keydown', e => {
      if (!nucleo.activo() || guiaAbierta()) return;
      const b = teclas[e.code];
      if (!b || !usados.has(b)) return;
      if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && esInteractivo(e.target)) return;
      e.preventDefault();
      if (e.repeat || abajo.has(e.code)) return;
      abajo.add(e.code); fuenteTeclado();
    });
    escuchar(win, 'keyup', e => { if (abajo.delete(e.code)) fuenteTeclado(); });
    // Perder el foco suelta solo el teclado (los dedos siguen en la pantalla).
    escuchar(win, 'blur', () => { if (abajo.size) { abajo.clear(); fuenteTeclado(); } });
    escuchar(doc, 'visibilitychange', () => { if (doc.hidden) soltarTodo(); });

    // ---------- Controles físicos (Gamepad API) ----------
    let conocidos = new Set(), avisoT = null, raf = 0, previoControl = '';
    let aviso = doc.querySelector('.mando-aviso');
    if (!aviso) { aviso = doc.createElement('div'); aviso.className = 'mando-aviso'; aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite'); doc.body.appendChild(aviso); }
    function avisar(txt) {
      aviso.textContent = txt; aviso.classList.add('ver');
      clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('ver'), 2400);
    }
    const leerPads = () => { try { return [...(win.navigator.getGamepads ? win.navigator.getGamepads() : [])].filter(p => p && p.connected !== false); } catch { return []; } };
    function sondear() {
      if (destruido) return;
      raf = win.requestAnimationFrame(sondear);
      const pads = leerPads();
      const ids = new Set(pads.map(p => p.index + ':' + p.id));
      for (const id of ids) if (!conocidos.has(id)) avisar('🎮 Control conectado');
      for (const id of conocidos) if (!ids.has(id)) avisar('🎮 Control desconectado');
      conocidos = ids;
      const s = new Set(); let eje = null;
      for (const p of pads) {
        const r = controlABotones(p, { indices: op.botonesControl, muerta });
        r.botones.forEach(b => s.add(b));
        if (!eje && (r.eje.x || r.eje.y)) eje = r.eje;
      }
      const clave = [...s].join(',') + '|' + (eje ? eje.x.toFixed(3) + ',' + eje.y.toFixed(3) : '');
      if (clave === previoControl) return;
      previoControl = clave;
      nucleo.ponerEje('control', eje);
      nucleo.ponerFuente('control', s);
      pintar();
    }
    if (win.navigator && typeof win.navigator.getGamepads === 'function') {
      escuchar(win, 'gamepadconnected', () => { /* el sondeo lo detecta y avisa */ });
      raf = win.requestAnimationFrame(sondear);
    }

    // ---------- Guía «⌨️ Controles» ----------
    let guiaEl = null, abridor = null;
    const guiaAbierta = () => !!(guiaEl && !guiaEl.hidden);
    function mostrarGuia() {
      if (!guiaEl) {
        guiaEl = doc.createElement('div');
        guiaEl.className = 'mando-guia'; guiaEl.setAttribute('role', 'dialog'); guiaEl.setAttribute('aria-modal', 'true'); guiaEl.setAttribute('aria-labelledby', 'mando-guia-t');
        const caja = doc.createElement('div'); caja.className = 'mando-guia-caja';
        const h = doc.createElement('h2'); h.id = 'mando-guia-t'; h.textContent = '⌨️ Controles';
        const tabla = doc.createElement('table');
        tabla.innerHTML = '<thead><tr><th>Acción</th><th>Mando</th><th>Teclado</th><th>Control</th></tr></thead><tbody></tbody>';
        const cuerpo = tabla.querySelector('tbody');
        for (const f of guia(acciones, teclas, nombres)) {
          const tr = doc.createElement('tr');
          const td = txt => { const c = doc.createElement('td'); c.textContent = txt; tr.appendChild(c); return c; };
          td(f.nombre); td(f.mando);
          const ct = td('');
          f.teclas.forEach(k => { const kb = doc.createElement('kbd'); kb.textContent = k; ct.appendChild(kb); });
          td(f.control);
          cuerpo.appendChild(tr);
        }
        const p = doc.createElement('p');
        p.textContent = '🎮 Mando clásico en la pantalla del celular. Con un control conectado, el botón de abajo es A.';
        const cerrar = doc.createElement('button'); cerrar.type = 'button'; cerrar.className = 'mando-guia-cerrar'; cerrar.textContent = 'Cerrar';
        cerrar.addEventListener('click', ocultarGuia);
        caja.append(h, tabla, p, cerrar); guiaEl.appendChild(caja);
        guiaEl.addEventListener('click', e => { if (e.target === guiaEl) ocultarGuia(); });
        guiaEl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ocultarGuia(); } });
        doc.body.appendChild(guiaEl);
      }
      abridor = doc.activeElement;
      guiaEl.hidden = false;
      soltarTodo();
      guiaEl.querySelector('.mando-guia-cerrar').focus();
    }
    function ocultarGuia() {
      if (!guiaEl || guiaEl.hidden) return;
      guiaEl.hidden = true;
      if (abridor && abridor.focus && doc.contains(abridor)) abridor.focus();
    }
    function botonGuia() {
      const b = doc.createElement('button');
      b.type = 'button'; b.className = 'mando-guia-btn'; b.textContent = '⌨️ Controles';
      b.addEventListener('click', mostrarGuia);
      return b;
    }

    // ---------- Instancia ----------
    function soltarTodo() {
      abajo.clear(); dedos.clear(); seguidor.limpiar(); soltarPalanca(); previosTactil = new Set();
      nucleo.soltarTodo(); pintar();
    }
    aplicarVisible();
    return {
      elemento: raiz,
      presionado: accion => nucleo.presionado(accion),
      eje: () => nucleo.eje(),
      al: (accion, fn) => nucleo.al(accion, fn),
      alSoltar: (accion, fn) => nucleo.alSoltar(accion, fn),
      mostrar(on) { pedido = !!on; aplicarVisible(); },
      activar(on) {
        if (!on) { abajo.clear(); dedos.clear(); seguidor.limpiar(); soltarPalanca(); previosTactil = new Set(); }
        nucleo.activar(on); previoControl = ''; pintar();
      },
      visible: () => !raiz.classList.contains('mando-escondido'),
      botonGuia, mostrarGuia, ocultarGuia, soltarTodo,
      estado: () => ({ visible: !raiz.classList.contains('mando-escondido'), activo: nucleo.activo(), botones: nucleo.botones(), acciones: nucleo.activas(), eje: nucleo.eje(), dedos: seguidor.dedos(), controles: conocidos.size }),
      destruir() {
        destruido = true;
        if (raf) win.cancelAnimationFrame(raf);
        for (const [el, ev, fn, o] of escuchas) el.removeEventListener(ev, fn, o);
        win.removeEventListener('resize', alCambiarTam);
        if (ro) ro.disconnect();
        nucleo.activar(false);
        raiz.remove(); if (guiaEl) guiaEl.remove();
        doc.documentElement.style.setProperty('--mando-alto', '0px');
      },
    };
  }

  // Preferencia por juego en localStorage (con try/catch: modo privado o almacenamiento bloqueado).
  function preferencia(clave, valor) {
    try {
      if (valor === undefined) return g.localStorage.getItem(clave);
      g.localStorage.setItem(clave, valor);
    } catch { /* sin almacenamiento */ }
    return valor === undefined ? null : valor;
  }

  g.Mando = {
    BOTONES, DIRECCIONES, TECLAS, CONTROL_ESTANDAR,
    normalizarAcciones, botonesUsados, mapaTeclas, teclaABoton, cruceta, zonaMuerta, ejeABotones, masCercano,
    crearSeguidor, controlABotones, flancos, crearNucleo, guia,
    crear, preferencia,
  };
})(typeof window !== 'undefined' ? window : globalThis);
