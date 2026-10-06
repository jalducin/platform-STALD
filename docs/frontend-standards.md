# Estándares de frontend (páginas estáticas)

Aplica a `index.html` (portal), `ingles.html`, `secundaria.html` y cualquier página nueva que se publique con GitHub Pages.

## 1. Forma de las páginas

- Cada página es **un solo archivo HTML autocontenido** en la raíz del repo: CSS en `<style>`, JS en
  `<script>`. Sin build, sin frameworks y sin dependencias de CDN salvo que un cambio lo justifique en su `design.md`.
  - **Excepción (`ingles.html`, cambio `ingles-pro`):** es un shell que enlaza `estilos/stald.css` (sistema de diseño
    compartido), `ingles/ingles.css` y scripts en `ingles/*.js`. Ver "Inglés pro" al final.
- Una página = una ruta del backend. La URL del backend va en una constante al inicio del script
  (`DATA_URL_BASE`); no repetirla en varios lugares.
- `index.html` es el **portal** (lo que Pages sirve en `/`):
  - pide el correo, consulta `/perfil` y muestra una tarjeta por espacio;
  - el tablero de Secundaria vive en `secundaria.html` desde el cambio `portal-acceso`.
- Cada página de espacio lleva "← Inicio" al portal y "🎮 Juegos"; ambos conservan `?api=` para probar contra un servidor local.
- **Excepción (`juegos.html`):**
  - El contenido de los juegos se carga de `juegos/datos/*.json` en el mismo sitio (vocabulario, trivia,
    etc.). Crece con el tiempo y se edita sin tocar el código.
  - No lleva datos personales ni respuestas de evaluaciones.
  - Los relojes aceptan `window.__TIEMPO_JUEGOS` (solo en pruebas E2E) para acelerarlos.

## 2. Seguridad en el DOM

- Todo texto que venga de Notion se inserta con `escapeHtml()` o con `textContent`. Nunca concatenar
  datos crudos en `innerHTML`.
- Los enlaces externos llevan `target="_blank" rel="noopener"`.
- **Sesión (cambio `plataforma-login`):** todas las páginas incluyen `<script src="comun/auth.js?v=2">` y usan
  `window.StaldAuth`:
  - al arrancar, `await StaldAuth.iniciar(API_BASE)`; el correo es `StaldAuth.email()` (sesión) o, solo durante la
    transición, `StaldAuth.correoViejo()`;
  - toda petición al backend va con `StaldAuth.fetchConSesion(url, opts)` (`Authorization: Bearer`). Con sesión no
    se manda `?email=`; sin sesión (transición) sí;
  - si `StaldAuth.esSesionVencida(res, body)` (401 `inicia_sesion` o `sesion_invalida`), `StaldAuth.salir()` y la
    pantalla de entrada (`StaldAuth.pintarEntrada(el, { titulo, texto, correo, aviso, alEntrar })`, o la propia del
    portal), nunca un error crudo;
  - 🚪 Cerrar sesión llama a `StaldAuth.salir()`.
  - supabase-js guarda la sesión en `localStorage` (clave `stald-auth`); en pruebas locales, `stald_sesion_prueba`.
- `localStorage` guarda además el correo de antes: `stald_email` (portal), `ingles_email` y `secundaria_email`.
  - El portal las sigue escribiendo para las páginas que aún no usan la sesión; dejan de servir para entrar después
    de `LOGIN_TRANSICION_HASTA`.
  - "Cerrar sesión" en cualquier página borra las tres (y la sesión), y también las claves de Juegos
    `juegos_sala_activa` y `juegos_partida_individual` (`StaldAuth.salir()`).
  - Además del correo, se permiten preferencias de interfaz sin datos personales, como
    `juegos_pref = { musica, volumen }` (música de fondo de `juegos.html`).
  - Estado de juego para no perderlo al recargar (`juegos.html`, openspec: juegos-recarga), con el id opaco del
    jugador (`quien`), nunca el correo, y caducidad de 3 h: `juegos_sala_activa = { codigo, quien, t, marcas? }`
    (sala en curso) y `juegos_partida_individual = { juego, quien, t, … }` (instantánea del juego individual).
  - No guardar filas ni otros datos personales.
- La página **no decide permisos**: muestra lo que devuelve el backend. Ocultar algo en el cliente no
  cuenta como control de acceso.

## 3. Estados obligatorios de UI

Cada página debe manejar y mostrar de forma explícita:

1. Sin sesión → pantalla de entrada (correo → «📧 Enviarme el enlace» → «Revisa tu correo ✉️» con código de 6
   dígitos). Un 401 de sesión lleva aquí.
2. Cargando.
3. Correo sin filas asignadas → mensaje claro y vuelta al login.
4. Error de red o backend (4xx/5xx) → mensaje con el error, sin romper la página.
5. Datos vacíos pero válidos (p. ej. "no hay tareas pendientes").
6. Vista de administrador (etiqueta "Admin" + a quién pertenece cada fila).

## 4. Diseño y accesibilidad

- Diseño primero para móvil (ancho máximo 720px, gutter de 16px, `safe-area-inset`).
- Colores en variables CSS en `:root`, con variante `prefers-color-scheme: dark`.
- Inputs con `<label for>`; los botones son `<button>`, no `div`.
- Fechas en `es-MX` y comparadas como `AAAA-MM-DD` en hora local.
- Tarjetas de resumen que filtran (`ingles.html`): cada tarjeta es un `<button data-action="filtrar" data-grupo aria-pressed>`
  y cada sección del tablero lleva `data-grupo`. El filtro se aplica en el DOM al `.board` más cercano (en
  admin, por alumno o alumna), no se guarda y se quita con la misma tarjeta o con "Ver todo".
- Vista de admin de `ingles.html`: tarjeta "📊 Últimas calificaciones" (`#ultimas`), con las 5 más recientes
  por alumno o alumna. Junta las de en línea (mejor intento, fecha del último envío) y las de Notion
  (fecha de edición). El color va por nivel: ≥ 80, 60–79 y < 60; una calificación de Notion ≤ 10 se
  escala × 10.
- Voz en `ingles.html` (cambio `pronunciacion`):
  - 🔊 / 🐢 con `speechSynthesis` (en-US) en ejercicios con `audio` y `pronunciar`;
  - 🎙️ con `SpeechRecognition` / `webkitSpeechRecognition`: muestra «Te escuché…» y la coincidencia (misma regla que
    el servidor); sin reconocimiento, autoevaluación;
  - privacidad: el reconocimiento de Chrome/Edge manda el audio a su proveedor para transcribirlo; la plataforma no
    guarda audio, solo el texto reconocido como respuesta.
- Vista de admin de `ingles.html`: tarjeta "🎮 Juegos de la semana" (`#juegos-admin`), con el ranking
  completo y las partidas con su podio, desde `/juegos/admin/resumen`. En el bloque de cada alumno o alumna
  va su línea de juegos.
- `juegos.html`:
  - **avatar:** personaje y color de las listas que envía `/juegos/yo`, o foto propia (`avatar-foto`): se recorta y reduce a 128×128 JPEG en el navegador, exige la casilla de permiso de mamá, papá o tutor y, si la foto ya no existe, se muestra el personaje (`onerror`);
  - **Sudoku** (`sudoku-niveles`): el tablero se genera en el navegador con solución única (`generarSudoku`,
    `contarSoluciones`); niveles Fácil 40, Medio 32, Difícil 27 y Experto ~24 pistas; 3 vidas; puntos con
    `puntosSudoku` (base por nivel + rapidez − errores);
  - **Dragon Run** (`dragon-run`): juego del profe en `juegos/dragon-run.html`, embebido con un iframe del mismo
    origen. Al terminar avisa con `postMessage` (solo a `location.origin`) y `juegos.html` lo acepta solo si viene de
    su iframe y de su origen, y luego llama a `terminar`. Conserva su propia música; la de Juegos se pausa mientras se
    juega. `?auto=1` es solo para pruebas;
  - **música de fondo:** generada con WebAudio (Alegre, Relajante, Fiesta); empieza solo tras un gesto y
    baja mientras suena una voz.
- `juegos.html?sala=<código>`: entra (o registra al invitado) y se une solo. La sala de espera muestra el
  enlace, "📤 Compartir" y un QR (qrcodejs de cdnjs, cargado solo en esa pantalla).
- **Recargar no pierde la partida** (openspec: juegos-recarga; detalle y tabla de juegos en su `design.md`):
  - en una sala, la URL queda con `?sala=<código>` (`history.replaceState`, conserva `?api=`) y recargar vuelve a
    ella; si se abre Juegos sin el código, reconecta con `juegos_sala_activa` solo si el servidor confirma que la
    persona sigue dentro. Salir o terminar limpia la URL y la clave;
  - los juegos de preguntas individuales (motor `quiz`) y el Sudoku se reanudan («¿Continuar tu partida de X?»);
    los demás individuales piden confirmar con `beforeunload`. Las pantallas de elegir nivel o modo usan
    `marco(id, { menu: true })` y no cuentan como partida;
  - durante una partida, `html.jugando` aplica `overscroll-behavior-y: contain` (sin «jalar para recargar»).

## 5. Código compartido

`secundaria.html` e `ingles.html` (y el portal) repiten lógica de login, `escapeHtml` y estilos. Mientras sean archivos separados,
**un cambio en la lógica común debe aplicarse a ambos en el mismo cambio** y la tarea de verificación
debe cubrir ambas páginas. Extraer a un `shared.js` solo mediante un cambio OpenSpec propio.

- `estilos/stald.css` (cambio `ingles-pro`) es la fuente única de tokens y componentes base. Hoy lo usa
  `ingles.html`; el portal y las demás páginas lo adoptan poco a poco, cada una en su propio cambio.

## 6. Verificación

- Local: servir la raíz (`npx serve .`) y recorrer los estados del §3.
- Publicada: tras el merge, abrir la URL de Pages (ver `openspec/project.md`) y repetir login admin y
  login de alumna. Pages tarda de 1 a 2 minutos en publicar.

## Ritmo de los juegos de cartas (ajuste del profe, sprint final)

| Juego | Individual | Sala |
|---|---|---|
| Póker | resultado de la mano 10 s; bots 2 s | `PK_PAUSA_MS` 9 s; `PK_BOT_MS` 2.5 s |
| Brisca | baza completa 5.3 s; bots 1.5 s | `CS_PAUSA_BAZA_MS` 4 s tras cada baza (sumado a `T0`, determinista; durante la pausa aún no es tu turno); `botMs` 2.5 s |
| Conquián | bot 2.5 s por acción | `botMs` 2.5 s |
| ¡Una! | bots 2.5 s | `U_BOT_MS` 3 s |

- ¡Una!: `robar` devuelve cuántas cartas llegaron.
  - Sin mazo ni pila no hay carta «robada» y el turno pasa con el aviso «No quedan cartas para robar».
  - Si alguien se queda sin cartas que sirvan y sin nada que robar, puede **Pasar**.
  - La carta robada se marca con 🆕 y el mensaje muestra su nombre.

## Juegos fusionados (cambio `juegos-fusion`)

- 🧩 **Completa y responde** (`en-frases`): alterna `preguntaFrase` y `preguntaEn`.
- ✍️ **Ortografía** (`es-ortografia`): mezcla `ortografia`, `acentos` y `poolSinonimos` con `preguntaOrto` y
  `preguntaSinonimo`.
- 🧮 **Cálculo y secuencias** (`mente-calculo`): dura 75 s. Una de cada tres preguntas es de `genSecuencia`.
- En partida, `preguntasPartida` reparte las 10 preguntas así:
  - Completa y responde: 5 y 5;
  - Ortografía: 4, 3 y 3, en orden barajado con semilla;
  - Cálculo y secuencias: 1 de cada 3 es secuencia.
- El Maratón de cultura suma las categorías `ia` y `tecnologia`, cada una con 6, 6 y 4 preguntas.

## Ajedrez (cambio `ajedrez`)

- `juegos/ajedrez.js` es el motor sin DOM y expone `globalThis.Ajedrez`.
  - Tablero 0x88; cada jugada devuelve un estado nuevo: `aplicar(st, m, sinClave)`.
  - Funciones: `legales`, `resultado` (mate, ahogado, 50 jugadas, repetición, material), `san` (notación en español
    R/D/T/A/C), `buscarJugada` y `bot(st, nivel)`.
  - El bot es negamax con poda alfa-beta: el nivel 1 incluye azar y el nivel 3 busca a profundidad 3 más capturas
    en quietud.
  - Lo prueba `server/ajedrez_test.ts` con perft de 5 posiciones conocidas.
- `ajTableroHtml(st, { abajo, sel, destinos, ultima })` dibuja el tablero y lo comparten el modo individual y la
  sala.
  - Las piezas son glifos sólidos con `U+FE0E`, para que no se vean como emoji.
  - `ajClic` resuelve la selección: destino, coronación o cambio de pieza.
- `participantes()` arma la lista de jugadores según el juego:
  - ajedrez: solo personas (las 2 primeras);
  - Brisca: hasta 4 personas, y si faltan se completa con BOT-VACHIRA, BOT-ISAGII y `BOT_EXTRA` (BOT-CHONITA);
  - en esos dos juegos la casilla de bots se oculta y en su lugar aparece `#p-bots-nota` con la regla.
- Niveles del bot de ajedrez: 🐣 Básico, 🦊 Intermedio y 🦉 Avanzado. Solo existen en el modo individual.
- `estadoAjedrez()` reproduce la sala:
  - el participante 0 juega con blancas;
  - el reloj de cada jugador es `opciones.reloj` minutos;
  - una jugada ilegal se ignora y el turno sigue;
  - el bot de respaldo es de nivel 2, con su jugada en caché por FEN.

## Vista del profe en Inglés (cambio `profe-diseno`)

- `ingles.html?modo=profe` agrega `body.profe` y dibuja `renderProfe(act)` (`ingles/profe.js`), no el tablero de
  alumnos. Desde `ingles-pro` va dentro del mismo marco del admin (menú lateral con «🎓 Mi ruta» marcada, hasta
  1,280 px):
  - encabezado `.pf-hero`: semana actual, siguiente entrega, barra de la ruta del mes y 4 contadores. Los contadores
    salen de `buildGroups`;
  - `#pf-urgente`: lo atrasado y lo de hoy, de la ruta (🎓) y del grupo (👥), con el `accionItem` de siempre;
  - pestañas: Esta semana, Plan del mes, Mi grupo y Hechas.
    - Son `role="tab"` y `role="tabpanel"` con `hidden`.
    - Cambiar de pestaña no redibuja la página.
    - La pestaña se guarda en `localStorage.profe_tab`.
  - `#ruta-plan`: acordeón de `details.ruta-sem`. Solo la semana actual va abierta, y cada una muestra su avance en
    `.pf-avance`.
  - `.pf-side`: horas por semana, rutina y reglas, y las próximas 3 entregas. Es pegajosa en escritorio y va al final
    en celular.
- `.pf-grid` usa una columna. Desde 960 px pasa a `minmax(0,1fr) 300px`.
- Los E2E deben abrir la pestaña antes de hacer clic en su contenido. Por ejemplo,
  `click('[data-pf-tab="grupo"]')`.

## Juegos de cartas (cambio `poker`)

- `juegos/cartas.js` es el motor sin DOM. Define `globalThis.Cartas` y lo usan `juegos.html` y
  `server/cartas_test.ts`.
  - Incluye la baraja, `valor5` y `mejorMano`, y el Texas Hold'em: `pokerNueva`, `pokerMano`, `pokerActuar`,
    `opciones` y `pokerBot`. Los botes laterales se calculan por niveles.
  - Toda regla nueva va aquí con su prueba. La página solo pinta y envía jugadas.
- Para cambiar el motor, sube `?v=` en `<script src="juegos/cartas.js?v=…">`; así se evita la caché de GitHub Pages.
- La mesa compartida es `pkMesaHtml(st, { yo, nombre, avatar, equipos, miTurno, pie })`. La usan el modo individual
  (`jugarPoker`) y la sala (`pintarPokerSala`).
- `estadoPoker()` reproduce la sala igual que `estadoUna()`:
  - semilla `poker-mano-k` y bots con `pbot<paso>`;
  - turnos de 30 s y pausa de 5 s entre manos.
- Baraja española (cambio `cartas-espanolas`):
  - ids 0..39 con `espPalo`, `espValor`, `espOrden` (el 7 y la sota van seguidos) y `nombreEsp`;
  - Brisca: `briscaNueva`, `briscaJugar`, `briscaGanador`, `briscaResultado` y `briscaBot`;
  - Conquián: `esJuego`, `conquianNueva`, `conquianActuar` (pasar, tomar, bajar y descartar) y `conquianBot`;
  - en la página, `briscaHtml` y `conquianHtml` se comparten entre el modo individual y la sala;
  - `estadoCartasSala(juego)` reproduce la sala con `CFG_CARTAS`: bots a 1.5 s y turnos de 30 s. Si se vence el
    turno, el bot hace la jugada;
  - Brisca usa hasta 4 jugadores (con 4 se juega en parejas `[0,1,0,1]`) y Conquián usa a los 2 primeros.
- 📖 Cómo se juega: `AYUDA[id]` (HTML) más `ayuda(id)`, que abre un `<dialog>` que se cierra con Esc o con el botón.
  Cualquier botón con `data-ayuda="<id>"` lo abre.

## Peticiones al servidor (cambio `ahorro-peticiones`)

- Los POST van con `{ 'content-type': 'text/plain;charset=UTF-8' }` y el body en JSON: así el navegador no hace la
  verificación previa de CORS y cada envío cuesta 1 petición en lugar de 2. No agregues encabezados personalizados.
- Sondeo de salas:
  - 2.5 s en la sala de espera y en ¡Una!, Basta, Lotería, Póker, Brisca y Conquián (`TIEMPO_REAL`);
  - 5 s en los juegos de preguntas;
  - se detiene al terminar, al vencer la sala, a 1 h o, en la sala de espera, a los 15 min sin empezar.
- Realtime (cambio `salas-realtime`): si el GET de la sala trae `rt`, `conectarRealtime` carga supabase-js 2.45.4
  (jsdelivr, diferido) y escucha el evento `estado`:
  - `mezclarEstado`: por jugador gana la `v` más alta y una sala empezada no regresa a la espera;
  - al quedar `SUBSCRIBED`: una consulta para ponerse al día y respaldo cada 30 s;
  - si el canal falla, vuelve el sondeo normal;
  - `limpiar` hace `removeChannel`.

## Inglés pro (cambio `ingles-pro`)

- **Archivos.** `ingles.html` es el shell (encabezado, acceso, `#nav`, `#content` y `<dialog id="cajon">`). Enlaza:
  - `estilos/stald.css`: tokens (`--bg`, `--card`, `--text`, `--muted`, `--border`, `--accent`, `--accent-bg`, `--ok`,
    `--warn`, `--bad` y sus `-soft`; radios 12/18/24; sombras en 2 niveles; espacio de 4 px) y componentes
    (`.card`, `.btn`, `.chip`, `.tabs`, `.anillo`, `.barra`, `.tabla`, `.kpis`, `dialog.cajon`, `.esqueleto`, `.vacio`,
    `.nav-item` y `.nav-barra`);
  - `ingles/ingles.css`: estilos propios de Inglés (incluida la presentación del Meet);
  - scripts clásicos con `defer`, en este orden: `comun.js` (configuración, `SECCIONES`, `api()`, formato y
    componentes), `reproductor.js`, `presentacion.js`, `admin.js` (grupos, alumnos y alumnas, juegos), `tablero.js`
    (vista del admin por secciones, mapa de calor y cajón), `alumno.js`, `profe.js` y `app.js` (sesión, ruteo y
    eventos). No son módulos ES: comparten el ámbito global, así que un nombre de nivel superior no se puede repetir
    entre archivos.
- **Modo oscuro.** Sigue a `prefers-color-scheme` salvo que `<html data-theme="light|dark">` lo fije. La preferencia
  se guarda en `localStorage.stald_tema` (`auto`, `claro` u `oscuro`; preferencia de interfaz sin datos personales) y se
  aplica en un `<script>` del `<head>` para no parpadear. Se cambia con 🌓 en el encabezado o en 👤 Perfil.
- **Navegación.** Catálogo único `SECCIONES` (`id`, `emoji`, `titulo`, `encabezado`, `rol`, `href`, `accion`, `barra`);
  de ahí salen la barra, el menú y el `<h2>` de cada sección (`seccionHtml`).
  - Ruteo por hash: `#inicio`, `#semana`, `#resultados`, `#perfil` (alumno o alumna) y `#resumen`, `#grupos`,
    `#alumnos`, `#semana`, `#resultados`, `#presentar`, `#juegos` (admin). Todas las secciones se dibujan a la vez
    y `aplicarRuta()` deja visible solo la del hash; la pestaña lleva `aria-current="page"`.
  - Abrir una actividad, un resultado o un guion agrega `#ver/<id>` al historial: Atrás regresa a la sección.
  - Menos de 720 px: `.nav-barra` fija abajo (botones de 56 px, `safe-area-inset-bottom`). El admin ve Resumen,
    Alumnos, Semana y Resultados, y el resto en «☰ Más» (`#nav-mas`). Desde 720 px: pestañas arriba (alumno o
    alumna) o menú lateral pegajoso de 232 px (admin).
  - Los E2E deben abrir la sección antes de interactuar con ella, p. ej. `ingles.html?api=…#alumnos`.
- **Alumno o alumna (`alumno.js`).** 🏠 Inicio: encabezado con anillo de la semana (`#anillo`), nivel (`#nivel`, de su
  último examen o de su grupo) y racha (`#racha`, del servidor); «Próxima clase» (`.mi-grupo.proxima-clase`): horario del
  grupo (`Sáb 10:00`, se entienden `dom…sáb` y `am/pm`) o el Meet de la semana, cuenta regresiva cada 30 s y botón al Meet;
  «Para hoy» (`#para-hoy`, filas `.hoy-item`); insignias (`#insignias`, calculadas en el cliente, no se guardan).
  📅 Semana: línea de lunes a domingo (`#semana-linea`, tocar un día filtra los `.exam-item[data-fecha]`), la tarjeta
  de la semana y el tablero de siempre. ⭐ Resultados: temas a reforzar y calificaciones. 👤 Perfil: grupo, insignias,
  tema y cerrar sesión.
- **Admin (`tablero.js`).** `#grupo-filtro` arriba de todas las secciones. 🏠 Resumen: `#kpis` y `#mapa-calor` desde
  `GET /ingles/resumen?grupo=`; cada celda y cada nombre abren el cajón. El cajón (`dialog#cajon`, se cierra con Esc o
  ✕) tiene grupo (mover), la semana con «⏳ Dar prórroga» / «Quitar prórroga» / «↺ Reiniciar intentos», historial y
  temas a reforzar. Las tarjetas `#grupos-admin` y `#alumnos-admin` van abiertas en su sección.
- **Reproductor (`reproductor.js`).** Barra de progreso (`#player-bar`). Con menos de 600 px y más de una pregunta, el
  formulario lleva `.paso`: una pregunta por pantalla (`.q.actual`), con ← / «Siguiente →» y «📋 Ver todas las
  preguntas» (`[data-action="ver-todas"]`), que vuelve a la lista completa. Atajos: 1–9 eligen la opción de la
  pregunta activa y Enter avanza (o envía cuando todo está respondido). El resultado muestra un anillo y barras por tema.
- **Peticiones.** Todas salen por `api(url, opts)` en `comun.js` (`fetchJson` es un alias). El inicio de sesión del
  Sprint 3 agrega ahí el encabezado `Authorization`.
- **Accesibilidad.** Foco visible (`:focus-visible`), enlace «Saltar al contenido», botones de al menos 44 px en
  pantallas táctiles, `role="progressbar"`, `aria-live` en avisos y sin desplazamiento horizontal a 390 px (las tablas
  anchas se desplazan dentro de `.tabla-wrap`).

## Inglés con sesión (integración `ingles-pro` + `plataforma-login`)

- `ingles.html` carga `comun/auth.js` antes de los módulos de `ingles/`.
- Todas las peticiones pasan por `api()` (`ingles/comun.js`):
  - mandan `Authorization: Bearer` con `StaldAuth.fetchConSesion`;
  - si el servidor responde 401 de sesión, llaman a `sesionVencida()` (`ingles/app.js`), que cierra la sesión y
    muestra la entrada con un aviso.
- Arranque (`ingles/app.js`): `StaldAuth.iniciar(API_BASE)` → `StaldAuth.email()` o, durante la transición,
  `StaldAuth.correoViejo()` → `loadFor`. Sin correo se muestra `mostrarEntrada()`, que usa
  `StaldAuth.pintarEntrada`.
- 🚪 Cerrar sesión (encabezado, menú y ☰ Más) usa `StaldAuth.salir()` y regresa a la entrada.
