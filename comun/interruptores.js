// Interruptores públicos en el navegador (openspec: rpg-privacidad). Lee `GET /interruptores` del servidor (pública,
// solo booleanos) y muestra u oculta lo que depende de cada interruptor:
// - `[data-interruptor="privacidad"]`: visible solo si está encendido (p. ej. los enlaces al aviso de privacidad).
//   Si es un enlace y la página trae `?api=`, se le agrega para que la página destino lea el mismo servidor.
// - `[data-interruptor-apagado="privacidad"]`: visible solo si está apagado (p. ej. «Próximamente»).
// - `[data-interruptores-cargando]`: se oculta al terminar la lectura.
// Falla cerrada: sin red, error o respuesta rara → todo apagado. Al terminar marca `<html data-interruptores="listo">`.
// Script clásico, sin dependencias: `<script src="comun/interruptores.js?v=1" defer></script>`.
(function () {
  const DEFAULT_API = 'https://stald.jalducin.deno.net';
  const apiParam = new URLSearchParams(location.search).get('api');
  const API = (apiParam || DEFAULT_API).replace(/\/$/, '');
  let lectura = null;

  function leer() {
    if (!lectura) {
      lectura = fetch(API + '/interruptores')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then((d) => ({ privacidad: !!d && d.privacidad === true }));
    }
    return lectura;
  }

  function conApi(a) {
    if (!apiParam || a.dataset.conApi) return;
    const href = a.getAttribute('href');
    a.setAttribute('href', href + (href.includes('?') ? '&' : '?') + 'api=' + encodeURIComponent(apiParam));
    a.dataset.conApi = '1';
  }

  function aplicar() {
    return leer().then((estado) => {
      for (const el of document.querySelectorAll('[data-interruptor]')) {
        const encendido = estado[el.dataset.interruptor] === true;
        if (encendido && el.matches('a[href]')) conApi(el);
        el.hidden = !encendido;
      }
      for (const el of document.querySelectorAll('[data-interruptor-apagado]')) {
        el.hidden = estado[el.dataset.interruptorApagado] === true;
      }
      for (const el of document.querySelectorAll('[data-interruptores-cargando]')) el.hidden = true;
      document.documentElement.dataset.interruptores = 'listo';
      return estado;
    });
  }

  globalThis.StaldInterruptores = { leer, aplicar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();
})();
