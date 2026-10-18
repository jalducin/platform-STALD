/* Ceremonia de premiación de Karts (openspec: karts-control-sala-y-ceremonia). // karts-ceremonia
   Podio de 3 escalones con foco y confeti: los personajes dibujados de 3.º, 2.º y 1.º (con su kart y su nombre) suben
   en ese orden. La usan juegos/karts.html (copa individual) y juegos.html (carrera suelta y copa en sala).

   KartsCeremonia.podioDe(filas, { yo })   3 primeras filas TAL COMO VIENEN (orden del servidor; no calcula lugares):
                                           [{ escalon, lugar, medalla, nombre, personaje, color, puntos, yo }]
   KartsCeremonia.secuencia(n)             momentos [{ t, tipo: 'sube'|'redoble'|'fin', escalon? }] (3.º → 2.º → 1.º)
   KartsCeremonia.estadoEn(ms, n)          { arriba: [escalones ya arriba], terminada }
   KartsCeremonia.inicioSala(cierre)       hora del servidor en que empieza en sala (cierre + COLCHON_SALA)
   KartsCeremonia.transcurridoSala(c, ahoraServidor), debeMostrar(transcurrido)
   KartsCeremonia.mostrar({ contenedor, titulo, sub, podio, transcurrido, reducido, sonido, fija, alTerminar })
                                           pinta la escena y devuelve { cerrar, el }. Sin DOM (Deno) no se usa.
   Sonido con window.Emocion (que respeta el silencio): revelación al 3.º y 2.º, redoble antes del 1.º y victoria. */
(function (g) {
  'use strict';
  const DURACION = 7000;
  const COLCHON_SALA = 2500; // tras el cierre del servidor: da tiempo a que todos los aparatos se enteren
  const MEDALLAS = ['🥇', '🥈', '🥉'];
  const T_SUBE = { 3: 600, 2: 2000, 1: 4700 };
  const T_REDOBLE = 3200;

  const texto = (v, max) => String(v === null || v === undefined ? '' : v).slice(0, max);
  function podioDe(filas, o = {}) {
    if (!Array.isArray(filas)) return [];
    return filas.slice(0, 3).map((f, i) => {
      const lugar = Number.isInteger(f?.lugar) && f.lugar > 0 ? f.lugar : i + 1;
      let puntos = null;
      if (Number.isFinite(f?.total)) puntos = f.total;
      else if (Number.isFinite(f?.pts)) puntos = f.pts;
      return {
        escalon: i + 1, lugar, medalla: MEDALLAS[Math.min(lugar, 3) - 1] || '🏅',
        nombre: texto(f && f.nombre, 24), personaje: f && typeof f.personaje === 'string' ? f.personaje : null,
        color: f && typeof f.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(f.color) ? f.color : null,
        puntos,
        yo: !!(f && (f.yo === true || (o.yo !== undefined && o.yo !== null && f.id === o.yo))),
      };
    });
  }
  function secuencia(n) {
    const m = [];
    for (let e = Math.min(3, Math.max(0, n)); e >= 1; e--) {
      if (e === 1 && n > 1) m.push({ t: T_REDOBLE, tipo: 'redoble' });
      m.push({ t: n === 1 ? T_SUBE[3] : T_SUBE[e], tipo: 'sube', escalon: e });
    }
    m.push({ t: DURACION, tipo: 'fin' });
    return m;
  }
  function estadoEn(ms, n) {
    const s = secuencia(n);
    return { arriba: s.filter(x => x.tipo === 'sube' && x.t <= ms).map(x => x.escalon), terminada: ms >= DURACION };
  }
  const inicioSala = cierre => cierre + COLCHON_SALA;
  const transcurridoSala = (cierre, ahora) => (Number.isFinite(cierre) ? ahora - inicioSala(cierre) : null);
  const debeMostrar = t => t !== null && t < DURACION;

  // ---------- DOM ----------
  const CSS = '.kc-capa{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,3vh,28px);overflow:hidden;' +
    'background:radial-gradient(ellipse at 50% 0%,#3b0764 0%,#1e1b4b 45%,#020617 100%);color:#fff;font-family:inherit;text-align:center;padding:10px 12px 12px;box-sizing:border-box}' +
    '.kc-capa.kc-dentro{position:absolute}' +
    '.kc-cab{position:relative;z-index:3}.kc-cab b{display:block;font-size:clamp(18px,4.6vmin,30px);line-height:1.15;text-shadow:0 2px 8px #000}.kc-cab small{opacity:.85;font-size:clamp(12px,2.6vmin,15px)}' +
    '.kc-escena{position:relative;flex:0 1 auto;height:clamp(200px,60vh,460px);width:100%;max-width:560px;display:flex;align-items:flex-end;justify-content:center;gap:clamp(4px,2vw,14px);min-height:0}' +
    '.kc-col{position:relative;flex:1 1 0;max-width:170px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}' +
    '.kc-luz{position:absolute;left:50%;top:-20%;width:180%;height:120%;transform:translateX(-50%);background:conic-gradient(from 165deg at 50% 0%,transparent 0deg,rgba(253,230,138,.38) 12deg,rgba(253,230,138,.38) 18deg,transparent 30deg);opacity:0;transition:opacity .5s;pointer-events:none;z-index:0}' +
    '.kc-col.arriba .kc-luz{opacity:1}' +
    '.kc-piloto{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;transform:translateY(140%);opacity:0;transition:transform .9s cubic-bezier(.2,1.5,.4,1),opacity .4s}' +
    '.kc-col.arriba .kc-piloto{transform:none;opacity:1}' +
    '.kc-piloto img{width:clamp(48px,15vmin,104px);height:auto;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5));margin-bottom:-12%}' +
    '.kc-piloto svg{width:clamp(56px,17vmin,118px);height:auto}' +
    '.kc-nombre{font-weight:900;font-size:clamp(12px,3vmin,17px);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;text-shadow:0 1px 3px #000}' +
    '.kc-pts{font-size:clamp(11px,2.5vmin,14px);color:#fde68a;font-weight:800}' +
    '.kc-yo .kc-nombre{color:#86efac}' +
    '.kc-bloque{position:relative;z-index:2;width:100%;border-radius:10px 10px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:4px;font-weight:900;font-size:clamp(18px,5vmin,30px);box-shadow:inset 0 -6px 0 rgba(0,0,0,.25),0 0 18px rgba(0,0,0,.4)}' +
    '.kc-bloque span{font-size:clamp(22px,6.5vmin,40px);line-height:1}' +
    '.kc-e1 .kc-bloque{height:clamp(56px,24vh,170px);background:linear-gradient(#fde047,#ca8a04);color:#422006}' +
    '.kc-e2 .kc-bloque{height:clamp(40px,17vh,120px);background:linear-gradient(#e5e7eb,#9ca3af);color:#1f2937}' +
    '.kc-e3 .kc-bloque{height:clamp(28px,12vh,86px);background:linear-gradient(#fdba74,#c2410c);color:#431407}' +
    '.kc-pie{position:relative;z-index:3;display:flex;gap:10px;align-items:center;justify-content:center;width:100%;margin-top:8px}' +
    '.kc-saltar{font:inherit;font-weight:800;font-size:15px;min-height:44px;padding:6px 16px;border-radius:999px;border:2px solid #fff;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}' +
    '.kc-confeti{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}' +
    '.kc-confeti i{position:absolute;top:-12px;width:8px;height:12px;border-radius:2px;animation:kc-cae linear forwards}' +
    '@keyframes kc-cae{to{transform:translateY(110vh) rotate(720deg)}}' +
    '.kc-capa.kc-quieta *{transition:none!important;animation:none!important}';
  function estilo(doc) {
    if (doc.getElementById('kc-estilo')) return;
    const s = doc.createElement('style'); s.id = 'kc-estilo'; s.textContent = CSS; doc.head.appendChild(s);
  }
  const esc = s => String(s).replaceAll(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function datosPersonaje(id) {
    const P = g.Personajes;
    if (!P || !id) return null;
    return P.LISTA.find(p => p.id === id) || null;
  }
  // Kart de lado (SVG) con los colores del personaje (o el color de la fila).
  function kartSvg(per, color) {
    const k = (per && per.kart) || {};
    const cuerpo = k.cuerpo || color || '#3b82f6', acento = k.acento || '#facc15', oscuro = k.oscuro || '#1e293b';
    return '<svg viewBox="0 0 120 50" aria-hidden="true"><path d="M8 34 Q10 20 30 18 L78 16 Q100 16 112 30 L112 36 Q60 40 8 38Z" fill="' + esc(cuerpo) + '" stroke="#0f172a" stroke-width="2"/>' +
      '<rect x="34" y="22" width="44" height="6" rx="3" fill="' + esc(acento) + '"/><path d="M4 18 L20 16 L22 26 L6 28Z" fill="' + esc(oscuro) + '"/>' +
      '<circle cx="28" cy="40" r="9" fill="#111827"/><circle cx="28" cy="40" r="3.5" fill="#9ca3af"/><circle cx="92" cy="40" r="9" fill="#111827"/><circle cx="92" cy="40" r="3.5" fill="#9ca3af"/></svg>';
  }
  function columna(p) {
    const per = datosPersonaje(p.personaje);
    let img = '<div style="font-size:40px">🏎️</div>';
    if (per && g.Personajes.retrato) img = '<img src="' + g.Personajes.retrato(per.id, 'gana') + '" alt="">';
    return '<div class="kc-col kc-e' + p.escalon + (p.yo ? ' kc-yo' : '') + '" data-escalon="' + p.escalon + '" data-personaje="' + esc(p.personaje || '') + '"><div class="kc-luz"></div>' +
      '<div class="kc-piloto">' + img + kartSvg(per, p.color) + '<div class="kc-nombre">' + esc(p.nombre) + '</div>' + (p.puntos === null ? '' : '<div class="kc-pts">⭐ ' + esc(p.puntos) + '</div>') + '</div>' +
      '<div class="kc-bloque"><span>' + p.medalla + '</span>' + p.lugar + '</div></div>';
  }
  function confeti(capa, doc) {
    const caja = doc.createElement('div'); caja.className = 'kc-confeti';
    const colores = ['#facc15', '#ef4444', '#22c55e', '#3b82f6', '#f472b6', '#c084fc', '#fb923c'];
    let html = '';
    for (let i = 0; i < 46; i++) html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colores[i % colores.length] + ';animation-delay:' + (Math.random() * 0.8).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's"></i>'; // NOSONAR: azar visual, no criptográfico
    caja.innerHTML = html; capa.appendChild(caja);
  }
  // Programa los momentos que faltan; los que ya pasaron (quien llega tarde en sala) se muestran sin sonido.
  function programar(sec, transcurrido, x) {
    const desde = Math.max(0, transcurrido), espera = Math.max(0, -transcurrido);
    for (const m of sec) {
      const t = espera + m.t - desde;
      if (m.t <= desde) {
        if (m.tipo === 'sube') x.subir(m.escalon, false);
      } else if (m.tipo === 'sube') x.timers.push(setTimeout(() => x.subir(m.escalon, true), t));
      else if (m.tipo === 'redoble') x.timers.push(setTimeout(x.redoble, t));
      else x.timers.push(setTimeout(x.cerrar, t));
    }
  }
  function mostrar(o) {
    const doc = g.document; if (!doc) return null;
    estilo(doc);
    const podio = Array.isArray(o.podio) ? o.podio : [];
    const n = podio.length, reducido = !!o.reducido, emo = o.sonido === false ? null : g.Emocion;
    const capa = doc.createElement('div');
    capa.className = 'kc-capa' + (o.fija === false ? ' kc-dentro' : '') + (reducido ? ' kc-quieta' : '');
    capa.id = 'kc-ceremonia'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', 'Premiación');
    const orden = [2, 1, 3].map(e => podio.find(p => p.escalon === e)).filter(Boolean); // 2.º, 1.º, 3.º en pantalla
    capa.innerHTML = '<div class="kc-cab"><small>🏆 Premiación</small><b>' + esc(texto(o.titulo, 60)) + '</b>' + (o.sub ? '<small>' + esc(texto(o.sub, 80)) + '</small>' : '') + '</div>' +
      '<div class="kc-escena">' + orden.map(columna).join('') + '</div>' +
      '<div class="kc-pie"><button type="button" class="kc-saltar" data-kc="saltar">⏭ Saltar</button></div>';
    (o.contenedor || doc.body).appendChild(capa);
    const timers = [];
    let cerrada = false;
    const cerrar = () => {
      if (cerrada) return;
      cerrada = true;
      timers.forEach(clearTimeout); capa.remove();
      if (typeof o.alTerminar === 'function') o.alTerminar();
    };
    capa.querySelector('[data-kc="saltar"]').addEventListener('click', cerrar);
    const subir = (e, conSonido) => {
      const col = capa.querySelector('.kc-e' + e);
      if (col) col.classList.add('arriba');
      if (e === 1 && !reducido) confeti(capa, doc);
      if (!conSonido || !emo) return;
      if (e === 1) emo.victoria(); else emo.revelacion();
    };
    if (reducido) { // fija: los 3 arriba desde el principio, sin animación; se quita al terminar o con Saltar
      podio.forEach(p => subir(p.escalon, false));
      timers.push(setTimeout(cerrar, Math.max(0, DURACION - Math.max(0, o.transcurrido || 0))));
      capa.dataset.estado = 'fija';
      return { cerrar, el: capa };
    }
    programar(secuencia(n), o.transcurrido || 0, { subir, cerrar, timers, redoble: () => emo && emo.suspenso(1400) });
    return { cerrar, el: capa };
  }

  g.KartsCeremonia = { DURACION, COLCHON_SALA, MEDALLAS, podioDe, secuencia, estadoEn, inicioSala, transcurridoSala, debeMostrar, mostrar };
})(typeof window !== 'undefined' ? window : globalThis);
