## Contexto
Variantes encontradas en las aperturas repetidas (todas se conservan tal cual):

| Variante | Valores que aparecen |
|---|---|
| Viewport | 390×844 (la mayoría), 390×900, 390×860, 900×900, 1280×900, sin viewport (1280×720 de Playwright) |
| `localStorage` | solo `stald_sesion_prueba`; además `stald_email`; además `ingles_email`; ambos |
| Relojes | `window.__TIEMPO_JUEGOS` (0.03 a 1); `__REENVIO_SEGUNDOS`, voz simulada, reloj fijo, `profe_tab` borrado |
| Errores JS | `FAIL error JS (<correo>): …`, `FAIL error JS: …`, `FAIL error JS (juegos|invitada): …`, o a un arreglo propio |
| Diálogos | aceptar, rechazar, registrar el texto y aceptar, o sin manejador (Playwright los descarta) |
| Navegación | `/juegos.html`, `/ingles.html…`, `/`, con query y `#hash`; con o sin `waitForSelector` de 60 s |

## Decisiones
- **Módulo propio `lib/navegador.js`**, no dentro de `lib/entorno.js`: `entorno` se carga en la primera línea y
  configura el proceso (variables, carpeta, `fetch`); `navegador` es una función que se llama cuando se necesita y
  no tiene efectos al cargarse. Lee `BASE` y `API` de `process.env` al usarse, así que depende de que `entorno` ya
  se haya cargado (lo hace toda prueba).
- **Una sola función con opciones con nombre** (`abrirPagina(b, opciones)`) en vez de varias funciones por tipo de
  página: las variantes se combinan entre sí (p. ej. `ingles` + `tiempo` + `dialogos`), y con nombres la llamada
  se lee sola. Los ayudantes locales que hacen algo más (p. ej. entrar a la pestaña Partidas) quedan como envoltorios
  de una o dos líneas en su prueba.
- **Opciones** (todas opcionales):
  - `email`: sesión de prueba (`stald_sesion_prueba`). Sin `email` abre sin sesión (invitado, login).
  - `viejo` / `ingles`: correo para `stald_email` / `ingles_email`; `true` = el mismo `email`.
  - `tiempo`: `window.__TIEMPO_JUEGOS`. `init: [fn, arg]`: script extra de `addInitScript`, después del de sesión.
  - `viewport` (por omisión 390×844) y `contexto` (opciones extra de `newContext`, p. ej. `permissions`).
  - `out` + `etiqueta`: cada `pageerror` agrega `FAIL error JS (<etiqueta>): <mensaje>`; la etiqueta por omisión es
    el `email`, y con `''` no lleva paréntesis. Sin `out` no se registra (la prueba puede registrar el suyo).
  - `dialogos`: `'aceptar'`, `'rechazar'`, `'registrar'` (`p.alertas`) o nada (comportamiento de Playwright).
  - `ruta` + `esperar`: abre `urlDe(ruta)` y espera el selector (60 s; o `[selector, opciones]`). Sin `ruta` la
    página queda en blanco para agregar rutas (`p.context().route`) o escuchas antes de navegar.
- **Equivalencias que no cambian el comportamiento**:
  - `newContext()` sin viewport ⇒ `viewport: { width: 1280, height: 720 }`, el mismo valor por omisión de Playwright.
  - El script de sesión y el extra van en dos `addInitScript` en el mismo orden en que estaban en uno.
  - `ctx.route(...)` se registra después de `newPage()` pero antes del primer `goto`, como antes respecto a la red.
  - `addInitScript` sobre la página (en `enlace-sala`) pasa al contexto: con una sola página es lo mismo.
- **Sin cambios en lo que se prueba**: mismos correos, rutas, selectores y tiempos; las aserciones (`ok(...)`) no se
  tocan. La verificación es correr la suite completa antes y después y comparar los conteos de `PASS` por prueba.

## Riesgos
- Una opción mal traducida cambiaría el estado inicial de la página (p. ej. olvidar `stald_email`). Mitigación: la
  migración se hizo por rangos de línea verificados y se compara la suite completa contra la línea base.
- `e2e-grupos.js` y `e2e-ingles-pro.js` no se migran (requieren `--pg`); quedan como pendiente documentado.

## Pruebas
- Línea base: `correr.sh` completo (sin `--pg`) antes de tocar las pruebas; conteos de `PASS` por prueba.
- Después: la misma corrida; mismos conteos y todo en verde. Las intermitencias conocidas (`una-sala`, `portal`) se
  repiten solas y se reportan.
- `deno test -A server/` y `deno lint server/` para confirmar que el servidor no cambió.
