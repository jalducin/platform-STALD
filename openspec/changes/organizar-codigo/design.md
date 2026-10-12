## Context

`juegos.html` (main en `eae63e5`) tenía 4,283 líneas: ~520 de CSS en un `<style>` y ~3,700 de JS en un solo `<script>`
que va después de los scripts de `juegos/` y de `comun/auth.js`. Los scripts de `juegos/` (`salas-grandes.js`,
`tablero-ui.js`, `clasicos-rapidos-ui.js`, …) usan en tiempo de llamada los ayudantes globales de ese `<script>`
(`sala`, `post`, `pintarFinalSala`, `marco`, `terminar`…), y las E2E leen globales como `JUEGOS` y `CATEGORIAS` con
`page.evaluate`. Es un refactor **sin cambio de comportamiento**; el profe lo autorizó para hacerse de noche, sin
preguntas, así que las decisiones quedan aquí justificadas.

## Goals / Non-Goals

**Goals:**
- `juegos.html` solo con estructura; CSS y JS en `juegos/app/`, partidos por responsabilidad, para que dos agentes que
  tocan juegos distintos ya no choquen en el mismo archivo.
- Quitar la duplicación obvia y de bajo riesgo (avance de Arcade, conteo del menú en las E2E).
- Documentación al día y 0 enlaces rotos.

**Non-Goals:**
- Cambiar textos, estilos, reglas, rutas del servidor o datos guardados.
- Pasar a módulos ES, a un bundler o a otra estructura de estado (eso sí cambiaría cómo se comparten los globales).
- Reorganizar los motores de `juegos/*.js` ni el servidor.

## Decisions

### D1. Scripts clásicos que comparten el ámbito global (no módulos ES)
Los `const`/`let`/`class` de nivel superior de un script clásico viven en el registro léxico global, que comparten
todos los scripts clásicos de la página; las `function` de nivel superior quedan en `window`. Por eso partir un solo
`<script>` en varios scripts clásicos **conserva los mismos nombres globales** sin tocar una sola referencia, y los
scripts de `juegos/` y las E2E siguen encontrándolos. Con módulos ES habría que exportar e importar cada nombre (y los
scripts clásicos de `juegos/` dejarían de verlos): descartado por riesgo y porque el repo no usa build.

Lo único que cambia al partir es el *hoisting*: una `function` solo existe cuando su script ya se ejecutó, y un
`const` leído antes de declararse lanza `ReferenceError`. Se revisó cada sentencia de nivel superior que **se ejecuta**
al cargar (no las declaraciones): `JUEGOS.push(...)`, `JUEGOS_PARTIDA.push(...)`, `TIEMPO_REAL.add(...)`, el IIFE de
`UNA_CARTAS`, los `addEventListener`, el arranque de la música y `iniciar()`. Todas dependen solo de lo que va antes
en el mismo orden de carga (o de los scripts de `juegos/`, que cargan antes), así que el orden se respeta:

`nucleo` → `menu` → `ranking` → `admin` → `individuales` → `arcade` → `mente` → `clasicos` → `naipes` → `salas` →
`salas-mesa` → `musica` → `arranque` (este al último: llama a `iniciar()`).

Los oyentes `click` de `document` (póker en `naipes.js`, cierre del menú de música en `musica.js`, ayuda en
`arranque.js`) se registran en el mismo orden relativo que antes.

### D2. Partición por responsabilidad
| Archivo | Contenido | Líneas aprox. |
|---|---|---|
| `juegos.css` | todo el `<style>` (mismo orden de cascada: entre `tablero.css` y `clasicos-rapidos.css`) | 520 |
| `nucleo.js` | backend (`API_BASE`, `?api=`, `?sala=`), `state`, recarga, utilidades, `api`/`post`/`datos`, sonido y voz | 130 |
| `menu.js` | `CATEGORIAS`, `JUEGOS`, avatar, sesión/registro (`iniciar`), hub | 265 |
| `ranking.js` | 🏆 Ranking | 50 |
| `admin.js` | 🛡️ Admin | 170 |
| `individuales.js` | `marco`, `reloj`, `terminar`, quiz y juegos de Inglés, Español, Cultura y Mente ágil | 460 |
| `arcade.js` | Dragon Run, Axo, Karts, Futbolito y Billar (individual y carreras/tiros en sala) | 210 |
| `mente.js` | Sudoku y Ajedrez contra la computadora | 250 |
| `clasicos.js` | Basta, ¡Una! y Lotería contra bots | 360 |
| `naipes.js` | Póker y baraja española (Brisca, Conquián) contra bots; HTML de cartas y fichas | 390 |
| `salas.js` | partidas multijugador: semilla, sala, Realtime, espera, preguntas, Basta por rondas, podio, revancha, crear/unirse/reanudar, compartir | 600 |
| `salas-mesa.js` | Lotería, ¡Una!, Póker, Brisca/Conquián y Ajedrez jugados en sala | 590 |
| `musica.js` | música de fondo (WebAudio), su menú y el botón del avatar | 120 |
| `arranque.js` | `AYUDA` (📖 Cómo se juega), eventos delegados e `iniciar()` | 140 |

Las partes que estaban lejos en el archivo pero son de la misma familia se juntaron (las carreras de Arcade en sala van
en `arcade.js`; crear/unirse/reanudar van en `salas.js`). Solo se movieron **declaraciones** (funciones y `const` con
funciones flecha u objetos literales sin efectos), que no dependen del orden.

`juegos/app/arcade.js` es la interfaz de Arcade de la página; no se confunde con `juegos/arcade.js` (reglas sin DOM que
también cargan los juegos del iframe). Se conservó el nombre sugerido y cada archivo lo aclara en su encabezado.

### D3. Mover sin reescribir
El corte se hizo con un script (fuera del repo) que copia rangos de líneas del `juegos.html` original, quita la sangría
de 2 espacios del `<script>` y agrega un encabezado por archivo. Se revisó antes que no hubiera plantillas literales
(\`…\`) ni cadenas de varias líneas, así que quitar la sangría no cambia ningún texto. Cada archivo pasa
`node --check`. Se hizo en pasos: primero el CSS, luego un módulo a la vez, con un commit por paso y la E2E `juegos`
(más las de la familia movida) tras cada uno.

### D4. Caché
Cada archivo nuevo se pide con `?v=1`, como los demás scripts de `juegos/`. Quien cambie un archivo de `juegos/app/`
sube su `?v=` en `juegos.html` (regla documentada en `docs/frontend-standards.md`).

### D5. Avance de Arcade con una sola implementación (`canalProgreso`)
Antes, `jugarArcade` (Axo, Karts, Futbolito, Billar) y `jugarDragonRun` tenían dos copias del mismo `PUT` encadenado
con versión `v` y reintento ante `version_vieja`; el propio código tenía un `TODO: unificar`. Diferencias que había:
- `canalProgreso` guarda la cola **por juego a nivel de página** (`colasProgreso`): al volver a abrir el juego, la
  lectura espera al último guardado. `jugarArcade` tenía una cola por partida.
- `canalProgreso` toma `v` al terminar la lectura; `jugarArcade` lo tomaba al recibir `listo`.

`jugarArcade` ahora usa `canalProgreso` (con la opción `sinAvance` para Futbolito y Billar, que no piden avance: la
lectura es `{ ok: true, v: 0, datos: null }` sin ir al servidor, igual que antes). En el uso normal (el juego manda
`listo` y luego `guardar`) el resultado es idéntico: misma ruta, mismo cuerpo, mismos mensajes `inicio` y `guardado`.
La cola por página solo cambia el caso de cerrar y volver a abrir el juego mientras un guardado sigue en vuelo: antes
la lectura nueva podía traer una versión vieja y el primer guardado gastaba un 409 + reintento; ahora espera. Es el
comportamiento que ya tenía Dragon Run, así que se acepta como la regla única. Lo cubren `e2e-dragon-run`,
`e2e-plataformas`, `e2e-karts`, `e2e-futbolito` y `e2e-billar`.

También se unificó el envío al iframe (`mensajeA(frame)`) que Dragon Run y Arcade repetían.

### D6. Conteo del menú en las E2E
Siete pruebas (`juegos`, `fusion`, `futbolito`, `karts`, `juegos-tablero`, `clasicos`, `clasicos-rapidos`) repetían
`p.evaluate(() => JUEGOS.length)` (y `karts`, `CATEGORIAS.length`). Ahora usan `tests/e2e/lib/menu.js`
(`contarMenu(p)` → `{ ids, tarjetas, juegos, secciones, categorias }`), junto a `lib/navegador.js` y `lib/entorno.js`.
Los textos de cada `ok(...)` no cambian.

### D7. Documentación
- `docs/backend-standards.md` hablaba de `CUPO = { ajedrez: 2, brisca: 4 }` y `BOTS_FIJOS`, que desde
  `mesas-con-bots` son renglones de `MESAS`. Se reemplaza por la referencia a la tabla.
- `docs/frontend-standards.md`: sección «Estructura de juegos/app/» con la tabla de archivos, el orden de carga y la
  regla de `?v=`. La excepción de `juegos.html` en «Forma de las páginas» se actualiza (ya no es autocontenido).
- Enlaces rotos: había 8 en `ai-specs/skills/writing-skills/anthropic-best-practices.md` (rutas absolutas `/en/docs/…`
  del sitio de origen); se cambian por la URL completa `https://docs.claude.com/en/docs/…`.

## Risks / Trade-offs

- [Un script de `juegos/app/` no carga (404, caché vieja)] → la página quedaría sin parte del código. Mitigación:
  `?v=1` en cada uno, revisión con `curl` en producción de todos los archivos y de la consola sin errores en Playwright.
- [Orden de carga] → alguien agrega en un archivo temprano una sentencia de nivel superior que usa algo de uno
  posterior. Mitigación: la regla queda en `docs/frontend-standards.md` (solo declaraciones fuera de `arranque.js`, y
  los efectos al cargar dependen solo de lo anterior).
- [Más peticiones HTTP: 14 archivos en vez de 1] → en HTTP/2 de GitHub Pages es un costo menor y se cachean; a cambio,
  cambiar un juego invalida solo su archivo.

## Pendiente (trabajo futuro, no se toca en este cambio)

- `fnv`/`mulberry`/`rngDe` están copiados en 7 lugares (`juegos/app/salas.js`, `juegos/arcade.js`, `bingo.js`,
  `clasicos-rapidos.js`, `fisica.js`, `tablero.js` y `server/salas_grandes.ts`). Cada motor se carga solo (Deno, iframes),
  así que unificarlos pide un `juegos/azar.js` que carguen todos: riesgo medio, fuera de esta fase.
- Lecturas y escrituras de `localStorage` con su propio `try/catch` (`registroPendiente`, `aceptoGuardado`,
  `leerSubAdmin`, `leerPrefMusica`, `mesa-ui.js`) podrían usar `leerLocal`/`escribirLocal`; no todas guardan JSON, así
  que cambiar el formato rompería lo que ya está guardado en los navegadores.
- El `aFrame` de las carreras/tiros en sala busca el iframe en cada mensaje (puede cambiar al repintar); no se unió
  con `mensajeA` para no cambiar ese comportamiento.
- `salas.js` y `salas-mesa.js` siguen cerca de 600 líneas; se pueden partir por juego cuando se toque cada uno.
- Los estilos de `juegos.css` podrían partirse por familia como los scripts; se dejó en un archivo para no alterar el
  orden de la cascada.
