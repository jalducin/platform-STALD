// Juego en vivo entre navegadores (openspec: juegos-en-vivo). Mensajes de navegador a navegador por el canal secreto
// de la sala (evento de broadcast `vivo`, distinto del `estado` que publica el servidor), sin pasar por el servidor.
// Script clásico sin DOM obligatorio: lo cargan juegos.html, karts.html, futbol.html y las pruebas de Deno
// (server/en_vivo_test.ts).
//
// PASO 0: funciona sin cambios en Supabase, latencia medida 163 ms de ida y vuelta (mediana; ≈ 80 ms de un sentido),
// con la llave publicable en un canal público (`private: false`), 2026-10-12. No hace falta política ni ajuste.
//
// Contrato (lo usan Karts y Fútbol):
//   const canal = await EnVivo.conectar({ topic, url, llave, yo: { id, nombre }, participantes: [ids], hz: 15 });
//     → se rechaza en ≤ 5 s si no conecta (quien llama usa su respaldo). Opcional: `transporte` (en vez de
//       topic/url/llave; p. ej. EnVivo.transporteMarco(juego) dentro del iframe) y `espera` (ms, 5000).
//   canal.enviar(evento, datos)     // ritmo máximo `hz` por evento (guarda el último); agrega seq y t
//   canal.enviarYa(evento, datos)   // sin esperar el ritmo (p. ej. el último estado antes de cerrar)
//   canal.al(evento, fn)            // fn(datos, { de, seq, t, latencia, tLocal }); ignora seq viejos y a quien no
//                                   //   es participante. tLocal = hora del emisor llevada al reloj local (interpolar)
//   canal.presencia()               // → [ids conectados], incluye el propio
//   canal.alCambiarPresencia(fn)    // fn([ids])
//   canal.latencia(id?)             // ms estimados de un sentido (de ese id o la mediana de todos); null sin datos
//   canal.alDesconectar(fn)         // fn(id) cuando un participante pasa 3 s sin mandar nada
//   canal.estado(); canal.alEstado(fn)  // 'vivo' | 'reconectando' (se reconecta solo: 1, 2, 4, 8, 10 s)
//   canal.ritmo(evento, hz); canal.estadisticas(); canal.cerrar()
//   EnVivo.simulado({ latencia, perdida, desorden, relevo?, noConecta? })  // doble de prueba: { conectar(o) } con la
//     misma API; sin `relevo` une a los canales del mismo topic en esta página; con `relevo` (URL de
//     tests/e2e/lib/vivo-relevo.js) cruza contextos del navegador. La latencia y la pérdida se inyectan aquí.
//   EnVivo.interpolador({ retraso: 100, extrapolar: 250, angulos: [2], discretos: [4] })
//
// Sobre de cada mensaje: { i: id del jugador en la sala, s: secuencia del emisor, t: hora del emisor, e: evento, d: datos }.
// Transporte: { estado, enviar(m), alRecibir(fn) → quitar, alEstado(fn) → quitar, reconectar(), cerrar?() } con estado
// 'conectando' | 'listo' | 'caido'.
// Nunca viajan correos ni otros datos personales: solo el id de la sala (el mismo que ya publica `estado`) y números.
(function (g) {
  'use strict';
  const MAX_SOBRE = 2048; // bytes de JSON por mensaje
  const LATIDO = 1000; // presencia: un latido por segundo si no se mandó nada más
  const PING = 2000; // latencia: un ping cada 2 s a un compañero por turno
  const DERIVA = 0.02; // el desfase de reloj por compañero puede crecer 0.02 ms por ms (reloj que se atrasa)
  const VENTANA_REPETIDOS = 64;
  const INTERNOS = new Set(['_h', '_p', '_q', '_x']);
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  const esSobre = m => !!m && typeof m === 'object' && typeof m.i === 'string' && m.i.length <= 64 &&
    Number.isInteger(m.s) && typeof m.t === 'number' && Number.isFinite(m.t) && typeof m.e === 'string' && m.e.length <= 24;
  const porTexto = (a, b) => a.localeCompare(b);
  const leerJson = txt => { try { return JSON.parse(txt); } catch { return null; } }; // null: el motor lo descarta
  const mediana = xs => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };

  // Lista de oyentes con «quitar».
  function oyentesDe() {
    const fs = new Set();
    return { agregar: f => { fs.add(f); return () => fs.delete(f); }, emitir: x => [...fs].forEach(f => f(x)) };
  }

  // ---------- Motor: sobre, orden, ritmo, presencia, latencia, reconexión y respaldo ----------
  function crear(o) {
    const reloj = o.reloj || (() => Date.now());
    const t0 = reloj();
    const yo = String(o.yo);
    const espera = o.espera ?? 5000, silencio = o.silencio ?? 3000;
    const tr = o.transporte;
    const ritmos = { ...(o.ritmos || {}) };
    const hzDe = e => (ritmos[e] !== undefined ? ritmos[e] : o.hz);
    let miembros = o.miembros ? new Set(o.miembros) : null;
    let seq = 0, estado = 'conectando', huboVivo = false, respaldoAvisado = false, cerrado = false;
    let intento = 0, proximoIntento = 0, ultimoEnvio = 0, proximoPing = t0 + PING / 2, turnoPing = 0, nPing = 0;
    const oyentes = new Map(), oyPresencia = oyentesDe(), oyEstado = oyentesDe();
    const pendiente = new Map(), enviadoEn = new Map();
    const pares = new Map(); // id → { ultimo, presente, desfase, llegadaPrev, ult: Map(evento → seq), vistos: [], rtts: [] }
    const pingsAbiertos = new Map(); // n → { a, t }
    const est = { enviados: 0, recibidos: 0, descartados: 0, pings: 0 };

    const cambiarEstado = nuevo => {
      if (estado === nuevo) return;
      estado = nuevo; oyEstado.emitir(nuevo);
    };
    const mandar = (e, d) => {
      if (cerrado || tr.estado !== 'listo') return false;
      const ahora = reloj();
      tr.enviar({ i: yo, s: ++seq, t: ahora, e, d });
      ultimoEnvio = ahora; est.enviados++;
      if (e === '_p') est.pings++;
      return true;
    };
    const par = id => {
      let p = pares.get(id);
      if (!p) { p = { ultimo: 0, presente: false, desfase: null, llegadaPrev: 0, ult: new Map(), vistos: [], rtts: [] }; pares.set(id, p); }
      return p;
    };
    const presencia = (id, presente) => {
      const p = par(id);
      if (p.presente === presente) return;
      p.presente = presente; oyPresencia.emitir({ id, presente });
    };
    // Hora del emisor traducida a la local: el menor (llegada − t) visto, que puede crecer despacio.
    const ajustarReloj = (p, m, llegada) => {
      const d = llegada - m.t;
      p.desfase = p.desfase === null ? d : Math.min(p.desfase + DERIVA * (llegada - p.llegadaPrev), d);
      p.llegadaPrev = llegada;
      return m.t + p.desfase;
    };
    // Continuos (con ritmo): se descarta lo que no sea más nuevo. Sueltos: solo los repetidos.
    const esViejo = (p, m) => {
      if (hzDe(m.e) || INTERNOS.has(m.e)) {
        const ult = p.ult.get(m.e);
        if (ult !== undefined && m.s <= ult) return true;
        p.ult.set(m.e, m.s);
        return false;
      }
      if (p.vistos.includes(m.s)) return true;
      p.vistos.push(m.s); if (p.vistos.length > VENTANA_REPETIDOS) p.vistos.shift();
      return false;
    };
    const interno = (m, llegada) => {
      if (m.e === '_x') { presencia(m.i, false); return; }
      const d = m.d || {};
      if (m.e === '_p' && d.a === yo) mandar('_q', { a: m.i, n: d.n });
      else if (m.e === '_q' && d.a === yo && pingsAbiertos.has(d.n)) {
        const pa = pingsAbiertos.get(d.n), rt = par(pa.a).rtts;
        rt.push(llegada - pa.t); pingsAbiertos.delete(d.n);
        if (rt.length > 9) rt.shift();
      }
    };
    const latenciaDe = id => {
      const xs = id === undefined ? [...pares.values()].flatMap(p => p.rtts) : (pares.get(id) || { rtts: [] }).rtts;
      const m = mediana(xs);
      return m === null ? null : Math.round(m / 2);
    };
    const recibir = m => {
      if (cerrado) return;
      if (!esSobre(m) || m.i === yo || (miembros && !miembros.has(m.i))) { est.descartados++; return; }
      let tam = 0;
      try { tam = JSON.stringify(m).length; } catch { tam = Infinity; }
      if (tam > MAX_SOBRE) { est.descartados++; return; }
      const llegada = reloj(), p = par(m.i);
      if (esViejo(p, m)) { est.descartados++; return; }
      p.ultimo = llegada;
      const tLocal = ajustarReloj(p, m, llegada);
      if (m.e !== '_x') presencia(m.i, true);
      if (INTERNOS.has(m.e)) { interno(m, llegada); return; }
      est.recibidos++;
      const fs = oyentes.get(m.e);
      if (fs) for (const f of fs) f(m.d, m.i, { de: m.i, seq: m.s, t: m.t, llegada, tLocal, edad: llegada - tLocal, latencia: latenciaDe(m.i) });
    };
    const alTransporte = st => {
      if (st === 'listo') { huboVivo = true; intento = 0; cambiarEstado('vivo'); }
      else if (st === 'caido' && estado === 'vivo') { intento = 0; proximoIntento = reloj() + 1000; cambiarEstado('reconectando'); }
    };
    const quitarRx = tr.alRecibir(recibir), quitarEst = tr.alEstado(alTransporte);
    if (tr.estado === 'listo') alTransporte('listo');

    // Ritmo sin deriva: el siguiente hueco cuenta desde el hueco anterior (no desde la llamada), así llamar cada
    // cuadro de 16 ms da en promedio exactamente `hz` envíos por segundo.
    const vaciarPendientes = ahora => {
      for (const [e, d] of pendiente) {
        const periodo = 1000 / (hzDe(e) || Infinity), prev = enviadoEn.get(e);
        if (prev !== undefined && ahora < prev + periodo) continue;
        pendiente.delete(e);
        enviadoEn.set(e, prev !== undefined && ahora - prev < 2 * periodo ? prev + periodo : ahora);
        mandar(e, d);
      }
    };
    const pingTurno = ahora => {
      if (ahora < proximoPing) return;
      proximoPing = ahora + PING;
      const vivos = [...pares].filter(([, p]) => p.presente).map(([id]) => id).sort(porTexto);
      if (!vivos.length) return;
      const a = vivos[turnoPing++ % vivos.length], n = ++nPing;
      if (mandar('_p', { a, n })) pingsAbiertos.set(n, { a, t: ahora });
      for (const [k, x] of pingsAbiertos) if (ahora - x.t > 10000) pingsAbiertos.delete(k);
    };
    const reconectarSiToca = ahora => {
      if (estado !== 'reconectando' || ahora < proximoIntento) return;
      intento++;
      proximoIntento = ahora + Math.min(10000, 1000 * Math.pow(2, intento));
      try { tr.reconectar(); } catch { /* el siguiente intento lo vuelve a pedir */ }
    };
    function tic() {
      if (cerrado) return;
      const ahora = reloj();
      if (!huboVivo && !respaldoAvisado && ahora - t0 >= espera) { respaldoAvisado = true; cambiarEstado('respaldo'); }
      reconectarSiToca(ahora);
      if (estado !== 'vivo') return;
      vaciarPendientes(ahora);
      if (ahora - ultimoEnvio >= LATIDO) mandar('_h', 0);
      pingTurno(ahora);
      for (const [id, p] of pares) if (p.presente && ahora - p.ultimo > silencio) presencia(id, false);
    }
    const intervalo = o.manual ? null : setInterval(tic, 20);
    return {
      enviar(e, d) {
        if (hzDe(e)) { pendiente.set(e, d); vaciarPendientes(reloj()); return; }
        mandar(e, d);
      },
      enviarYa(e, d) { pendiente.delete(e); enviadoEn.set(e, reloj()); mandar(e, d); },
      al(e, f) {
        if (!oyentes.has(e)) oyentes.set(e, []);
        oyentes.get(e).push(f);
        return () => oyentes.set(e, oyentes.get(e).filter(x => x !== f));
      },
      alPresencia: oyPresencia.agregar,
      alEstado: oyEstado.agregar,
      estado: () => estado,
      presentes: () => [...pares].filter(([, p]) => p.presente).map(([id]) => id).sort(porTexto),
      latencia: latenciaDe,
      miembros(ids) { miembros = ids ? new Set(ids) : null; },
      ritmo(e, hz) { ritmos[e] = hz; },
      estadisticas: () => ({ ...est }),
      tic,
      cerrar() {
        if (cerrado) return;
        mandar('_x', 0);
        cerrado = true;
        if (intervalo) clearInterval(intervalo);
        quitarRx(); quitarEst();
        if (tr.cerrar) tr.cerrar();
      },
    };
  }

  // ---------- Contrato: EnVivo.conectar ----------
  function fachada(m, yo) {
    const conYo = () => [yo, ...m.presentes()].sort(porTexto);
    return {
      enviar: m.enviar, enviarYa: m.enviarYa, ritmo: m.ritmo, estadisticas: m.estadisticas, estado: m.estado, alEstado: m.alEstado, cerrar: m.cerrar,
      al: (e, fn) => m.al(e, (d, _de, meta) => fn(d, meta)),
      presencia: conYo,
      alCambiarPresencia: fn => m.alPresencia(() => fn(conYo())),
      alDesconectar: fn => m.alPresencia(p => { if (!p.presente) fn(p.id); }),
      latencia: id => m.latencia(id),
    };
  }
  function conectar(o) {
    const yo = String(o.yo && typeof o.yo === 'object' ? o.yo.id : o.yo);
    let tr;
    try { tr = o.transporte || transporteSupabase(o); } catch (e) { return Promise.reject(e); }
    const m = crear({ transporte: tr, yo, miembros: o.participantes, hz: o.hz ?? 15, ritmos: o.ritmos, espera: o.espera ?? 5000, silencio: o.silencio, reloj: o.reloj, manual: o.manual });
    return new Promise((ok, mal) => {
      if (m.estado() === 'vivo') { ok(fachada(m, yo)); return; }
      const quitar = m.alEstado(st => {
        if (st === 'vivo') { quitar(); ok(fachada(m, yo)); }
        else if (st === 'respaldo') { quitar(); m.cerrar(); mal(new Error('sin_canal')); }
      });
    });
  }

  // ---------- Transportes ----------
  let supabaseLib = null;
  function cargarSupabase() {
    if (g.supabase) return Promise.resolve(g.supabase);
    if (supabaseLib) return supabaseLib;
    supabaseLib = new Promise((ok, mal) => {
      const s = g.document.createElement('script');
      s.src = SUPABASE_JS;
      s.onload = () => ok(g.supabase); s.onerror = () => { supabaseLib = null; mal(new Error('supabase')); };
      g.document.head.appendChild(s);
    });
    return supabaseLib;
  }
  // Canal propio de Supabase en el topic de la sala (otro socket). La página de Juegos usa el suyo (juegos/app/salas.js).
  function transporteSupabase(o) {
    if (!o.topic || !o.url || !o.llave) throw new Error('sin_realtime');
    const rx = oyentesDe(), st = oyentesDe();
    let estado = 'conectando', cliente = null, canal = null, cerrado = false;
    const fijar = e => { if (estado !== e) { estado = e; st.emitir(e); } };
    const ESTADOS = { SUBSCRIBED: 'listo', CLOSED: 'caido', CHANNEL_ERROR: 'caido', TIMED_OUT: 'caido' };
    const unir = async () => {
      try {
        const lib = o.lib || await cargarSupabase();
        if (cerrado) return;
        if (!cliente) cliente = lib.createClient(o.url, o.llave, { auth: { persistSession: false, autoRefreshToken: false } });
        if (canal) cliente.removeChannel(canal);
        canal = cliente.channel(o.topic, { config: { broadcast: { self: false, ack: false } } });
        canal.on('broadcast', { event: 'vivo' }, ({ payload }) => rx.emitir(payload));
        canal.subscribe(s => { if (!cerrado && ESTADOS[s]) fijar(ESTADOS[s]); });
      } catch { fijar('caido'); }
    };
    void unir();
    return {
      get estado() { return estado; },
      enviar(m) { if (canal && estado === 'listo') canal.send({ type: 'broadcast', event: 'vivo', payload: m }); },
      alRecibir: rx.agregar, alEstado: st.agregar, reconectar: unir,
      cerrar() { cerrado = true; if (cliente && canal) cliente.removeChannel(canal); },
    };
  }

  // Iframe del juego → página de Juegos (mismo origen). La página manda 'vivo-rx' (mensajes ya filtrados por
  // participantes) y 'vivo-estado'; el iframe manda 'vivo-tx' y 'vivo-reconectar'.
  function transporteMarco(juego, padre, origen) {
    const destino = padre || g.parent, org = origen || g.location.origin;
    const rx = oyentesDe(), st = oyentesDe();
    let estado = 'conectando';
    const alMensaje = ev => {
      const d = ev.data || {};
      if (ev.origin !== org || ev.source !== destino || d.juego !== juego) return;
      if (d.tipo === 'vivo-rx') rx.emitir(d.m);
      else if (d.tipo === 'vivo-estado' && typeof d.st === 'string') { estado = d.st; st.emitir(d.st); }
    };
    g.addEventListener('message', alMensaje);
    const post = m => { try { destino.postMessage({ juego, ...m }, org); } catch { /* página cerrada */ } };
    post({ tipo: 'vivo-hola' }); // la página responde con el estado actual del canal
    return {
      get estado() { return estado; },
      enviar: m => post({ tipo: 'vivo-tx', m }),
      alRecibir: rx.agregar, alEstado: st.agregar,
      reconectar: () => post({ tipo: 'vivo-reconectar' }),
      cerrar: () => g.removeEventListener('message', alMensaje),
    };
  }

  // Página de Juegos: conecta el iframe con el transporte de la sala. `permitido(id)` decide si un mensaje es de
  // alguien de la sala (se revisa en cada mensaje). Devuelve { cerrar }.
  function puente(o) {
    const { marco, juego, transporte: tr, permitido } = o;
    const org = o.origen || g.location.origin;
    const aMarco = m => { try { marco.contentWindow.postMessage({ juego, ...m }, org); } catch { /* iframe cerrado */ } };
    const alMensaje = ev => {
      const d = ev.data || {};
      if (ev.origin !== org || !marco.contentWindow || ev.source !== marco.contentWindow || d.juego !== juego) return;
      if (d.tipo === 'vivo-tx' && esSobre(d.m)) tr.enviar(d.m);
      else if (d.tipo === 'vivo-reconectar') tr.reconectar();
      else if (d.tipo === 'vivo-hola') aMarco({ tipo: 'vivo-estado', st: tr.estado });
    };
    g.addEventListener('message', alMensaje);
    const quitarRx = tr.alRecibir(m => { if (esSobre(m) && permitido(m.i)) aMarco({ tipo: 'vivo-rx', m }); });
    const quitarSt = tr.alEstado(st => aMarco({ tipo: 'vivo-estado', st }));
    return { cerrar() { g.removeEventListener('message', alMensaje); quitarRx(); quitarSt(); } };
  }

  // ---------- Dobles de prueba ----------
  // EnVivo.simulado: { conectar(o) } con la misma API. La latencia (+ variación de ±20 %), la pérdida y el desorden
  // (probabilidad de un retraso extra de hasta 2× la latencia) se aplican al enviar, en esta página.
  // cortar(id)/reanudar(id) silencian a alguien sin avisar (se le acabó la batería).
  const buses = new Map(); // topic → Set(nodo) (canales simulados de esta página)
  function simulado(op = {}) {
    const lat = op.latencia ?? 50, perdida = op.perdida ?? 0, desorden = op.desorden ?? 0, azar = op.azar || Math.random;
    const cortados = new Set();
    const retraso = () => lat * (0.8 + 0.4 * azar()) + (azar() < desorden ? azar() * 2 * lat : 0);
    function transporteLocal(topic, id) {
      const rx = oyentesDe(), st = oyentesDe();
      const nodo = { id, rx, estado: 'conectando' };
      if (!buses.has(topic)) buses.set(topic, new Set());
      const bus = buses.get(topic);
      setTimeout(() => {
        if (op.noConecta) return;
        bus.add(nodo); nodo.estado = 'listo'; st.emitir('listo');
      }, 30);
      return {
        get estado() { return nodo.estado; },
        enviar(m) {
          if (cortados.has(id)) return;
          const txt = JSON.stringify(m);
          for (const otro of bus) if (otro !== nodo && azar() >= perdida) setTimeout(() => { if (!cortados.has(otro.id) && bus.has(otro)) otro.rx.emitir(JSON.parse(txt)); }, retraso());
        },
        alRecibir: rx.agregar, alEstado: st.agregar,
        reconectar() { /* siempre conectado */ },
        cerrar() { bus.delete(nodo); },
      };
    }
    // Relevo HTTP + SSE (tests/e2e/lib/vivo-relevo.js) para cruzar contextos del navegador.
    function transporteRelevo(topic, id) {
      const rx = oyentesDe(), st = oyentesDe();
      let estado = 'conectando';
      const q = 'topic=' + encodeURIComponent(topic) + '&id=' + encodeURIComponent(id);
      const fuente = op.noConecta ? null : new g.EventSource(op.relevo + '/rx?' + q);
      if (fuente) {
        fuente.onopen = () => { estado = 'listo'; st.emitir('listo'); };
        fuente.onmessage = ev => { if (!cortados.has(id)) rx.emitir(leerJson(ev.data)); };
      }
      return {
        get estado() { return estado; },
        enviar(m) {
          if (cortados.has(id) || azar() < perdida) return;
          const body = JSON.stringify(m);
          setTimeout(() => g.fetch(op.relevo + '/tx?' + q, { method: 'POST', body, keepalive: true }).catch(() => {}), retraso());
        },
        alRecibir: rx.agregar, alEstado: st.agregar,
        reconectar() { /* EventSource reconecta solo */ },
        cerrar() { if (fuente) fuente.close(); },
      };
    }
    return {
      conectar(o) {
        const id = String(o.yo && typeof o.yo === 'object' ? o.yo.id : o.yo);
        const transporte = op.relevo ? transporteRelevo(o.topic, id) : transporteLocal(o.topic, id);
        return conectar({ ...o, transporte });
      },
      cortar(id) { cortados.add(id); },
      reanudar(id) { cortados.delete(id); },
    };
  }

  // Interpolador de estados (arreglos): muestra(ahora) devuelve el estado de `retraso` ms atrás, interpolado entre
  // las dos muestras que lo rodean; si ya no hay muestra nueva, extrapola con la última velocidad hasta `extrapolar`
  // ms y se queda quieto. Los índices de `angulos` van por el camino corto; los de `discretos` y los que no son
  // números toman el valor de la muestra más nueva de las dos.
  function interpolador(o = {}) {
    const retraso = o.retraso ?? 100, extrapolar = o.extrapolar ?? 250, max = o.max ?? 30;
    const angulos = new Set(o.angulos || []), discretos = new Set(o.discretos || []);
    const ms = []; // [{ t, v }] ordenadas por t
    const difAng = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
    const mezclar = (a, b, f) => b.v.map((vb, k) => {
      const va = a.v[k];
      if (discretos.has(k) || typeof vb !== 'number' || typeof va !== 'number') return vb;
      return angulos.has(k) ? va + difAng(va, vb) * f : va + (vb - va) * f;
    });
    return {
      agregar(t, v) {
        let k = ms.length;
        while (k > 0 && ms[k - 1].t > t) k--;
        ms.splice(k, 0, { t, v });
        if (ms.length > max) ms.shift();
      },
      muestra(ahora) {
        if (!ms.length) return null;
        const obj = ahora - retraso;
        if (obj <= ms[0].t) return ms[0].v.slice();
        if (ms.length === 1) return ms[0].v.slice();
        for (let k = ms.length - 1; k > 0; k--) {
          const a = ms[k - 1], b = ms[k];
          if (obj >= a.t && obj <= b.t) return mezclar(a, b, b.t === a.t ? 1 : (obj - a.t) / (b.t - a.t));
        }
        const a = ms.at(-2), b = ms.at(-1);
        const extra = Math.min(extrapolar, obj - b.t);
        return b.t === a.t ? b.v.slice() : mezclar(a, b, 1 + extra / (b.t - a.t));
      },
      edad: ahora => (ms.length ? ahora - ms.at(-1).t : Infinity),
      vaciar() { ms.length = 0; },
    };
  }

  // Red simulada determinista para las pruebas de Deno (reloj inyectado, entrega con `entregar()`): latencia,
  // variación, pérdida, desorden, cortes, caídas y mensajes inyectados.
  function redSimulada(o = {}) {
    const reloj = o.reloj || (() => Date.now()), azar = o.azar || Math.random;
    const lat = o.latencia ?? 50, vari = o.variacion ?? 0, perdida = o.perdida ?? 0;
    const nodos = new Map(), cola = [];
    let retrasoSig = 0, duplicarSig = false;
    const programar = (destino, txt, extra) => cola.push({ destino, txt, en: reloj() + lat + vari * azar() + extra });
    const difundir = (desde, txt) => {
      const extra = retrasoSig; retrasoSig = 0;
      const veces = duplicarSig ? 2 : 1; duplicarSig = false;
      for (const [id, n] of nodos) {
        if (id === desde || n.cortado || n.estado !== 'listo') continue;
        for (let k = 0; k < veces; k++) if (azar() >= perdida) programar(id, txt, extra);
      }
    };
    function transporte(id) {
      const rx = oyentesDe(), st = oyentesDe();
      const n = { estado: o.conectar === false ? 'conectando' : 'listo', cortado: false, rx, st, puedeReconectar: true, reconexiones: 0 };
      nodos.set(id, n);
      return {
        get estado() { return n.estado; },
        enviar(m) { if (n.estado === 'listo' && !n.cortado) difundir(id, JSON.stringify(m)); },
        alRecibir: rx.agregar, alEstado: st.agregar,
        reconectar() { n.reconexiones++; if (n.puedeReconectar) { n.estado = 'listo'; st.emitir('listo'); } },
      };
    }
    const nodo = id => nodos.get(id);
    return {
      transporte,
      entregar() {
        const ahora = reloj();
        for (let k = 0; k < cola.length;) {
          const c = cola[k];
          if (c.en > ahora) { k++; continue; }
          cola.splice(k, 1);
          const n = nodos.get(c.destino);
          if (n && !n.cortado && n.estado === 'listo') n.rx.emitir(JSON.parse(c.txt));
        }
      },
      conectar(id) { const n = nodo(id); n.estado = 'listo'; n.st.emitir('listo'); },
      cortar(id) { nodo(id).cortado = true; },
      reanudar(id) { nodo(id).cortado = false; },
      caer(id) { const n = nodo(id); n.estado = 'caido'; n.puedeReconectar = false; n.st.emitir('caido'); },
      permitirReconectar(id) { nodo(id).puedeReconectar = true; },
      reconexiones: id => nodo(id).reconexiones,
      retrasarSiguiente(ms) { retrasoSig = ms; },
      duplicarSiguiente() { duplicarSig = true; },
      inyectar(m) { const txt = JSON.stringify(m); for (const id of nodos.keys()) programar(id, txt, 0); },
    };
  }

  g.EnVivo = { conectar, simulado, interpolador, transporteMarco, puente, transporteSupabase, crear, redSimulada, oyentesDe, esSobre };
})(typeof globalThis !== 'undefined' ? globalThis : this);
