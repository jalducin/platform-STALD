# Estándares de frontend (páginas estáticas)

Aplica a `index.html` (portal), `ingles.html`, `secundaria.html` y cualquier página nueva que se publique con GitHub Pages.

## 1. Forma de las páginas

- Cada página es **un solo archivo HTML autocontenido** en la raíz del repo: CSS en `<style>`, JS en
  `<script>`. Sin build, sin frameworks y sin dependencias de CDN salvo que un cambio lo justifique en su `design.md`.
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
- `localStorage` solo guarda el correo de sesión: `stald_email` (portal), `ingles_email` y
  `secundaria_email`.
  - El portal escribe las de los espacios a los que el correo tiene acceso, así que las páginas entran
    solas.
  - "Cerrar sesión" en cualquier página borra las tres.
  - Además del correo, se permiten preferencias de interfaz sin datos personales, como
    `juegos_pref = { musica, volumen }` (música de fondo de `juegos.html`).
  - No guardar filas ni otros datos personales.
- La página **no decide permisos**: muestra lo que devuelve el backend. Ocultar algo en el cliente no
  cuenta como control de acceso.

## 3. Estados obligatorios de UI

Cada página debe manejar y mostrar de forma explícita:

1. Sin sesión → formulario de correo.
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

## 5. Código compartido

`secundaria.html` e `ingles.html` (y el portal) repiten lógica de login, `escapeHtml` y estilos. Mientras sean archivos separados,
**un cambio en la lógica común debe aplicarse a ambos en el mismo cambio** y la tarea de verificación
debe cubrir ambas páginas. Extraer a un `shared.js` solo mediante un cambio OpenSpec propio.

## 6. Verificación

- Local: servir la raíz (`npx serve .`) y recorrer los estados del §3.
- Publicada: tras el merge, abrir la URL de Pages (ver `openspec/project.md`) y repetir login admin y
  login de alumna. Pages tarda de 1 a 2 minutos en publicar.

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
- `estadoAjedrez()` reproduce la sala:
  - el participante 0 juega con blancas;
  - el reloj de cada jugador es `opciones.reloj` minutos;
  - una jugada ilegal se ignora y el turno sigue;
  - el bot de respaldo es de nivel 2, con su jugada en caché por FEN.

## Vista del profe en Inglés (cambio `profe-diseno`)

- `ingles.html?modo=profe` agrega `body.profe`, que amplía la página a 1,080 px, y dibuja `renderProfe(act)`, no el
  tablero de alumnos:
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
