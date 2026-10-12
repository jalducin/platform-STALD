## Context

El profe vio 371 avisos de SonarQube for IDE en VS Code. Casi todos venían de copias viejas de worktrees de agentes
(`.claude/worktrees/*`, sobre todo un `juegos.html` anterior a `organizar-codigo`), pero las mismas reglas aplican al
código vivo. No había forma de medirlas desde la terminal. En paralelo, otro agente termina el sprint 22
(`feature/juegos-categorias`), que toca `juegos.html`, siete módulos de `juegos/app/`, `juegos/blackjack.js`,
`juegos/salas-grandes.js`, `juegos/tablero-ui.js`, `tests/e2e/*` y `docs/frontend-standards.md`.

El profe pidió terminar sin preguntar: las decisiones de este documento las tomó el agente y aquí se justifican.

## Goals / Non-Goals

**Goals:** medición reproducible con las mismas reglas; limpiar por orden de riesgo y valor sin cambiar
comportamiento; dejar documentado qué se revisó y por qué se dejó lo que se dejó.

**Non-Goals:** llegar a cero avisos a toda costa; reescribir motores o renderizadores; compuerta de calidad en CI;
tocar los archivos del sprint 22 mientras su PR no esté en `main`.

## Decisions

### 1. Medición: ESLint + Stylelint + dos revisiones propias, en `tests/calidad/`
- `eslint-plugin-sonarjs` es el mismo código de reglas que usa SonarLint (las claves `Sxxxx` salen de sus metadatos);
  las reglas de modernización de Sonar (S77xx) vienen de `eslint-plugin-unicorn` y algunas del núcleo de ESLint
  (`prefer-object-spread` = S6661, `prefer-object-has-own` = S6653, `default-param-last` = S1788,
  `no-await-in-loop` = S9382). Solo se activan las reglas que el profe vio, cada una con su clave.
- Se comprobó la equivalencia con los diagnósticos reales de SonarLint que expone VS Code (mismos mensajes y mismas
  líneas en los archivos abiertos).
- CSS: Stylelint (`no-duplicate-selectors` = css:S4666, `declaration-property-value-keyword-no-deprecated` =
  css:S1874) sobre `.css` y `<style>` (con `postcss-html`).
- css:S7924 (contraste) y Web:S6819 (roles ARIA) no tienen equivalente en ESLint/Stylelint: `calidad.mjs` los revisa
  con una aproximación documentada (reglas con `color` y fondo literales; roles en el marcado fuera de `<script>`).
- Paquete propio con versiones exactas, igual que `tests/e2e`; la raíz sigue sin `package.json`.
- `NOSONAR` en la línea excluye el aviso del total, como SonarLint, y se cuenta aparte por regla para que no se
  esconda nada: el reporte muestra cuántos avisos quedaron marcados y de qué regla.
- *Alternativa descartada:* SonarScanner CLI con un servidor SonarQube. Necesita Java, un servidor o token de
  SonarCloud, y el repo de datos es privado: más piezas que mantener para el mismo resultado.
- *Alternativa descartada:* que el análisis falle con avisos (compuerta). Todavía hay cientos de avisos de estilo
  heredados; una compuerta hoy solo estorbaría. Queda como medición.

### 2. Dos fases por el sprint 22
Fase 1: todo lo que el sprint 22 no toca. Fase 2: sus archivos, solo si su PR ya está en `origin/main` al llegar a
ese punto (se revisa con `git fetch` y `gh pr list --state merged`); si no, quedan pendientes y se anota en el
reporte. Así no hay conflictos con un trabajo que aún no se integra.

### 3. `?v=` de los scripts
Los cambios son refactorizaciones equivalentes y sin cambios de interfaz entre archivos (los ayudantes nuevos viven
dentro del archivo que los usa), así que una mezcla de versión vieja y nueva en la caché del navegador se comporta
igual. Por eso **no se sube `?v=` en `juegos.html`** (archivo del sprint 22) durante la fase 1; GitHub Pages además
sirve con `max-age=600`. Si la fase 2 ocurre, se suben ahí los `?v=` de lo que haya cambiado.

### 4. Bloque a — posibles errores reales
- **S2681 (171 avisos, 145 en la fase 1):** todos eran del tipo «adyacente» (`if (x) a(); b();` en la misma línea);
  ninguno del tipo con sangría engañosa entre líneas. Se revisó cada diff: en todos la instrucción siguiente debía
  ejecutarse siempre (p. ej. `if (terminado) return; terminado = true;`). **No hubo errores reales.** Se envolvió en
  llaves el cuerpo del `if`/`for`/`while` (cambio puramente sintáctico, con un corrector automático sobre el AST); en
  las cadenas `if … else if … else break; resto` de los bucles de Billar, Futbolito y Golf se partió en líneas, porque
  con llaves la regla sigue viendo un `else if` sin bloque.
- **S1854:** `dijoUna` en ¡Una! (clásicos) se asignaba y nunca se leía (el resultado ya viaja como parámetro
  `presiono`); `s = e.sala` en Dibuja no se usaba. Se quitaron.
- **S3923:** en Basta, `idioma === 'en' ? 'no empieza con ' : 'no empieza con '` y en ¡Una! `', '` en ambas ramas; en
  Serpientes `(pos ? 0 : 0)`. Toda la tabla de resultados de Basta está en español en ambos idiomas, así que no es un
  error de traducción: se quitó el ternario muerto.
- **S1788:** `tono(f, d, tipo = 'square', v = 0.05, hasta, retraso = 0)` en Karts, Plataformas, `mesa-ui.js` y Dragon
  Run: `hasta = 0` (sin barrido de frecuencia). El código solo pregunta `if (hasta)`, así que 0 y `undefined` se
  comportan igual.
- **S2486:** `catch { /* motivo */ }` sin variable (ES2019, ya soportado por la base de navegadores del proyecto) y
  con el motivo escrito: sin almacenamiento, sin audio, sin conexión, borrador ilegible.
- **S9382 (await en bucles, 143 en `server/`):** se revisaron todos y **se dejan**: son reintentos de escritura con
  `sha` (concurrencia optimista sobre el repo de datos: leer → escribir → si chocó, releer), la paginación de Notion
  por cursor, validaciones en orden de `server/semana.ts` y pruebas que deben ir en secuencia. Volverlos paralelos
  cambiaría el comportamiento (y la carga sobre la API de GitHub).

### 5. Bloque b — CSS
- Contraste: los botones naranjas de Dragon Run (`#ff8a1f` con texto blanco, 2.36:1) pasan a texto `#2a1300`
  (7.47:1): se conserva el color del botón y el estilo del juego; `#mute` y `#bPausa` (fondo oscuro) quedan con texto
  blanco explícito. En Secundaria, «completada» pasa de `#16a34a` a `#15803d` (5.02:1 con blanco) y, en el tema
  oscuro, el texto de acento (`.badge.upcoming`, chips, enlaces) sobre `--chip` daba 1.82:1: se agrega
  `--accent-texto` (`#a5b4fc` en oscuro, 5.7:1) y el fondo de botones sigue usando `--accent`.
- `word-break: break-word` y los selectores duplicados `.tab` y `.adm-tabla td` están en `juegos/app/juegos.css`,
  que es del sprint 22: fase 2.

### 6. Bloque c — accesibilidad (Web:S6819)
- `role="status"` → `<output>` (mismo rol implícito y `aria-live="polite"`); `role="group"` → `<fieldset>` con
  `aria-label`. Para no cambiar el aspecto: `fieldset{margin:0;padding:0;border:0;min-width:0}` en cada página (las
  clases siguen poniendo su borde, p. ej. `.ctl-caja` de Golf) y `display:block` donde el `<div>` no era absoluto
  (`.ok-msg` del portal, `#ctl-estado` de Karts). `[hidden]` sigue ganando por su `!important`.
- Se quedan: el control de fuerza de Billar (`role="slider"` en un `<div>` con relleno dibujado; un
  `<input type="range">` cambia aspecto y manejo táctil) y el minimapa de Golf (`<canvas role="button">`, porque
  envolverlo en `<button>` cambia el diseño del lienzo). Anotados como pendientes.

### 7. Bloque d — modernizaciones mecánicas
- Con el corrector de ESLint (equivalencia garantizada por la regla): S6661 (spread), S7723 (`new Array`), S7781
  (`replaceAll`), S6653 (`Object.hasOwn`), S7773 (`Number.parseInt`). Después se normalizó el espaciado de los
  objetos (`{ a, ...b }`) y las comillas dobles de `server/`.
- A mano: `isNaN(fecha)` → `Number.isNaN(d.getTime())` (con `Number.isNaN(fecha)` un `Date` nunca sería NaN),
  `void el.offsetWidth` → `el.getBoundingClientRect()` (también fuerza el reflujo para reiniciar la animación), el
  `void sem` / `void t` de Plataformas (se conserva la llamada a `rnd()` para no mover la secuencia del azar).
- **S7767 (`| 0` → `Math.trunc`):** solo donde el valor es un número chico y positivo (índices al azar, `40 / n`).
  Se dejan con `NOSONAR` y su motivo: el generador mulberry32 (aritmética entera de 32 bits: con `Math.trunc` deja de
  desbordar y cambia toda la secuencia; está copiado en 6 archivos, ver Riesgos), el hash de Plataformas
  (`Math.imul`) y el índice del bucle por píxel del piso de Karts.
- **S7784 (`structuredClone`):** en copias de datos que vienen de JSON (avance que se guarda, ganchos de prueba).
  Se deja `JSON.parse(JSON.stringify())` con `NOSONAR` en `fisica.js` (la copia normaliza `-0`, `NaN` e `Infinity`
  igual que la red, y la simulación es determinista entre aparatos) y en la validación local de Conquián.
- `comun/auth.js` es un script clásico en ES5 a propósito (lo cargan todas las páginas, también el portal): se deja
  `Object.assign`, `replace` y la copia JSON con `NOSONAR`. El resto del código ya usa `.at()`, `?.` y `??`, así que
  `structuredClone`, `Object.hasOwn` y `replaceAll` no suben la base de navegadores.
- **S1135:** el único «TODO» era la palabra «Todo» (apostar todas las fichas) en un comentario de Póker: se reescribió.

### 8. Bloques e y f — ternarios anidados y complejidad cognitiva
Se trabajaron por grupos de archivos, solo en la fase 1, con estas reglas: comportamiento idéntico (mismo HTML
carácter por carácter, mismo orden de llamadas al azar con semilla, misma evaluación perezosa), ayudantes dentro del
archivo o de la función que los usa (los scripts de `juegos/app/` e `ingles/` comparten el ámbito global), sin
`NOSONAR`. S3776 solo en funciones con complejidad > 40; el resto (15–40) se deja: partir funciones medianas de
juegos en canvas no mejora la lectura y arriesga el comportamiento. Ver la sección «Resultado de e y f».

### 9. Bloque g — `Math.random` (S2245)
Son juegos: el azar no protege nada (no hay tokens, contraseñas ni códigos de sala que dependan de él; los códigos de
sala del servidor usan `crypto.getRandomValues`). Se marca cada línea revisada con
`// NOSONAR: azar de juego, no criptográfico` en lugar de apagar la regla en la configuración: así SonarLint en VS Code
también deja de mostrarlos y un `Math.random` nuevo sí aparece para revisarse.

## Risks / Trade-offs

- [Refactor sin cambio de comportamiento que sí lo cambia] → corrector sobre AST para lo mecánico, revisión de cada
  diff, pruebas de Deno y E2E completas por bloque; lo que no cubren las E2E no se toca.
- [`<fieldset>` en navegadores viejos con `display:grid`] → soportado desde Chrome 86 y Safari 15; la base ya exige
  Safari 15.4 (`.at()`).
- [Código repetido] → el generador mulberry32 está copiado en `arcade.js`, `bingo.js`, `clasicos-rapidos.js`,
  `fisica.js`, `tablero.js`, `juegos/app/salas.js` y `server/salas_grandes.ts`. Unificarlo cambia el orden de carga de
  scripts y la caché: se deja anotado para un cambio propio.
- [Avisos que quedan] → se documentan en el reporte con su motivo; el análisis permite seguirlos.
