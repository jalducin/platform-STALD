# Estándares de frontend (páginas estáticas)

Aplica a `index.html` (portal), `ingles.html`, `secundaria.html` y cualquier página nueva que se publique con GitHub Pages.

## 1. Forma de las páginas

- Cada página es **un solo archivo HTML autocontenido** en la raíz del repo: CSS en `<style>`, JS en
  `<script>`. Sin build, sin frameworks y sin dependencias de CDN salvo que un cambio lo justifique en su `design.md`.
  - **Excepción (`ingles.html`, cambio `ingles-pro`):** es un shell que enlaza `estilos/stald.css` (sistema de diseño
    compartido), `ingles/ingles.css` y scripts en `ingles/*.js`. Ver "Inglés pro" al final.
  - **Excepción (`juegos.html`, cambio `organizar-codigo`):** también es un shell: estilos en `juegos/app/juegos.css` y
    código en scripts clásicos de `juegos/app/`. Ver [Estructura de juegos/app/](#estructura-de-juegosapp-cambio-organizar-codigo).
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
- **Sesión (cambio `plataforma-login`):** todas las páginas incluyen `<script src="comun/auth.js?v=7">` (sube `?v=` en las
  cuatro cada vez que cambie) y usan
  `window.StaldAuth`:
  - al arrancar, `await StaldAuth.iniciar(API_BASE)`; el correo es `StaldAuth.email()` (sesión) o, solo durante la
    transición, `StaldAuth.correoViejo()`;
  - toda petición al backend va con `StaldAuth.fetchConSesion(url, opts)` (`Authorization: Bearer`). Con sesión no
    se manda `?email=`; sin sesión (transición) sí;
  - si `StaldAuth.esSesionVencida(res, body)` (401 `inicia_sesion` o `sesion_invalida`), `StaldAuth.salir()` y la
    pantalla de entrada (`StaldAuth.pintarEntrada(el, { titulo, texto, correo, aviso, alEntrar })`, o la propia del
    portal), nunca un error crudo;
  - se entra con correo y contraseña (`StaldAuth.entrarConContrasena`; cambio `acceso-con-contrasena`), sin
    enlaces ni códigos por correo. Con la contraseña inicial se muestra `StaldAuth.pintarCambio` (obligatorio con
    «sensei»; «Ahora no» con «clase»). Juegos pide correo y nick a quien no es de las clases (`/juegos/registro`);
  - 🚪 Cerrar sesión llama a `StaldAuth.salir()`.
  - supabase-js guarda la sesión en `localStorage` (clave `stald-auth`); en pruebas locales, `stald_sesion_prueba`.
- `localStorage` guarda además el correo de antes: `stald_email` (portal), `ingles_email` y `secundaria_email`.
  - El portal las sigue escribiendo para las páginas que aún no usan la sesión; dejan de servir para entrar después
    de `LOGIN_TRANSICION_HASTA`.
  - "Cerrar sesión" en cualquier página borra las tres (y la sesión), y también las claves de Juegos
    `juegos_sala_activa`, `juegos_partida_individual` y `juegos_revancha` (`StaldAuth.salir()`).
  - Además del correo, se permiten preferencias de interfaz sin datos personales, como
    `juegos_pref = { musica, volumen }` (música de fondo de `juegos.html`) y `juegos_admin_sub` (sub-sección abierta de
    «🛡️ Admin» en `juegos.html`).
  - Estado de juego para no perderlo al recargar (`juegos.html`, openspec: juegos-recarga), con el id opaco del
    jugador (`quien`), nunca el correo, y caducidad de 3 h: `juegos_sala_activa = { codigo, quien, t, marcas? }`
    (sala en curso) y `juegos_partida_individual = { juego, quien, t, … }` (instantánea del juego individual).
  - No guardar filas ni otros datos personales. Única excepción: el borrador del examen abierto (ver «Reproductor»),
    que vive solo en el aparato de quien contesta, sin el correo en claro, y se borra al enviar, al cerrar sesión o
    a los 14 días.
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
  por alumno o alumna, de las actividades y exámenes en línea (mejor intento, fecha del último envío). El color va
  por nivel: ≥ 80, 60–79 y < 60. Inglés ya no muestra tareas ni calificaciones de Notion (cambio `cierre-tecnico`,
  fase 2): los bloques del admin salen del registro (filas `source: "registro"` de `/ingles/data`).
- Voz en `ingles.html` (cambio `pronunciacion`):
  - 🔊 / 🐢 con `speechSynthesis` (en-US) en ejercicios con `audio` y `pronunciar`;
  - 🎙️ con `SpeechRecognition` / `webkitSpeechRecognition`: muestra «Te escuché…» y la coincidencia (misma regla que
    el servidor); sin reconocimiento, autoevaluación;
  - privacidad: el reconocimiento de Chrome/Edge manda el audio a su proveedor para transcribirlo; la plataforma no
    guarda audio, solo el texto reconocido como respuesta.
- Fichas y pares en `ingles.html` (`ingles/reproductor.js`, cambio `ejercicios-ordenar-emparejar`):
  - `ordenar`:
    - fichas `<button class="ficha" data-action="ficha">` en `.ord-banco`; al tocarla pasa a `.ord-linea` y al
      tocarla ahí regresa a su lugar; «⌫ Borrar» las regresa todas;
    - la respuesta va en `input.q-text` oculto, como `pronunciar`.
  - `emparejar`:
    - botones `.emp-btn[data-lado=izq|der]` en dos columnas; se toca uno y luego el del otro lado. El par queda con
      la clase `par-<n>` (color) y un número, para no depender solo del color;
    - tocar uno unido deshace su par;
    - la respuesta (JSON) va en `input.q-par` oculto. La pregunta cuenta como respondida solo con todos los pares,
      pero el borrador guarda el avance parcial.
  - Accesibilidad:
    - todo es botón nativo (Tab, Enter, Espacio) con `aria-label` que dice el estado («ficha 2 de tu oración»,
      «unida con…»);
    - un `aria-live` por ejercicio anuncia cada cambio;
    - el foco pasa a la siguiente ficha;
    - objetivos de 44 px o más, sin desborde a 390 px.
- Vista de admin de `ingles.html`: tarjeta "🎮 Juegos de la semana" (`#juegos-admin`), con el ranking
  completo y las partidas con su podio, desde `/juegos/admin/resumen`. En el bloque de cada alumno o alumna
  va su línea de juegos.
- `juegos.html`:
  - **🛡️ Admin** (`admin-juegos-unificado`): la barra tiene 4 pestañas (🎮 Juegos, 👥 Partidas, 🏆 Ranking y, solo para
    el admin, 🛡️ Admin). Admin junta Jugadores, Pendientes, Invitados y Fotos:
    - sub-secciones `role="tab"` (`data-adm`, ← → Inicio Fin) con contador (`…` cargando, `!` error); las tres rutas se
      piden en paralelo al abrir y una que falla no tapa a las demás («↻ Reintentar»);
    - buscador único `#adm-buscar` sobre la sub-sección activa (`data-busca`, sin mayúsculas ni acentos) con resumen
      `aria-live` y «Nada coincide» + «Limpiar búsqueda»;
    - listas `.adm-lista` con altura máxima y scroll propio; `table.adm-tabla` con encabezado pegajoso desde 640 px y,
      abajo de eso, filas como tarjetas (`td[data-label]`, columnas con `--cols`), sin scroll horizontal;
    - CSV por sub-sección (`csv-jugadores` en Jugadores y Pendientes, `csv` en Invitados); el enlace de acceso de un
      pendiente sale en `#jug-enlace`, arriba de la lista. Detalle en el `design.md` del cambio.
  - **🏆 Ranking** tiene tres sub-pestañas (`button.opt[data-rtipo]` con `aria-pressed`, `.opts.tres` en una fila a 390 px):
    ⭐ Individuales, 👥 Partidas y **🔥 Juegos** (`ranking-juegos-populares`). 🔥 Juegos pinta `GET /juegos/ranking/juegos`
    en `<ol class="rank" id="rank-juegos">`: 🥇🥈🥉, emoji del catálogo del cliente, `titulo` del servidor,
    «N jugadores · M partidas», barra `.rj-barra` proporcional al líder (`aria-hidden`) y «👑 Mejor puntaje: {nick} · N puntos» (`ranking-juegos-puntos`);
    vacío: «Todavía nadie juega esta semana. ¡Estrena un juego!». `ttl` 30 s como el ranking de personas. Muestra el
    top 10: desde la fila 11 llevan `.rj-extra` (ocultas) y el botón `#rj-todos` («Ver los N juegos» / «Ver solo el
    top 10», con `aria-expanded`) alterna `.todos` en la lista (`ranking-juegos-top10`).
  - **avatar:** personaje y color de las listas que envía `/juegos/yo`, o foto propia (`avatar-foto`): se recorta y reduce a 128×128 JPEG en el navegador, exige la casilla de permiso de mamá, papá o tutor y, si la foto ya no existe, se muestra el personaje (`onerror`);
  - **Sudoku** (`sudoku-niveles`): el tablero se genera en el navegador con solución única (`generarSudoku`,
    `contarSoluciones`); niveles Fácil 40, Medio 32, Difícil 27 y Experto ~24 pistas; 3 vidas; puntos con
    `puntosSudoku` (base por nivel + rapidez − errores);
  - **Dragon Run** (`dragon-run`, en Arcade desde `dragon-run-misiones`): juego del profe en `juegos/dragon-run.html`,
    embebido con un iframe del mismo origen dentro de `.arcade-caja`. Al terminar avisa con `postMessage` (solo a
    `location.origin`) y `juegos.html` lo acepta solo si viene de su iframe y de su origen, y luego llama a `terminar`
    (las misiones cumplidas van escapadas en el detalle). Conserva su propia música; la de Juegos se pausa mientras se
    juega. Misiones y premios: reglas en `juegos/dragon-misiones.js` (`DragonMisiones`, también lo prueban los tests
    de Deno); el juego pide el avance con `listo`, recibe `inicio` (`progreso`, `semilla` = id del jugador) y manda
    `guardar` antes de `fin`; `juegos.html` lo guarda con `canalProgreso` (`juegos/app/arcade.js`; `GET`/`PUT
    /juegos/progreso/dragon-run`, cola por juego). Pantalla de misiones a pantalla completa en `rem`, aviso `#toast` «¡Misión cumplida!», toque en
    toda la pantalla y `prefers-reduced-motion`. Suelto, el avance va a `localStorage.dragonProgreso`. `?auto=1`
    (`?dragonAuto=1` en Juegos) y `?prueba=1` (`?arcadePrueba=1`, ganchos `window.__dragonPrueba`) son solo para
    pruebas;
  - **Arcade** (`plataformas` y `karts`, cambio `juegos-plataformas-karts`): `juegos/plataformas.html` y
    `juegos/karts.html`, cada uno en un iframe del mismo origen (`.arcade-caja`), con reglas compartidas en
    `juegos/arcade.js` (mundos, pistas, referencias, mapa de sala, tiempos de bots y puntos por lugar; también lo
    carga `juegos.html`). El juego nunca llama al servidor: avisa a `parent` (`listo`, `guardar`, `puntos`, `meta`) y
    `juegos.html` acepta solo mensajes de su iframe y su origen; responde `inicio` (avance de `GET /juegos/progreso`
    o, en sala, mapa, semilla, `inicioEn` y bots), `guardado` y `puntos-ok`. Guarda con el mismo `canalProgreso` de
    Dragon Run: `PUT` encadenado (gana el último). Canvas con paso fijo de 1/60 s y escala entera, pausa con `visibilitychange`, sonido opcional
    (`localStorage.arcade_sonido`), controles táctiles grandes (Axo, Dragon Run y Karts usan el mando compartido; ver
    «Mando de Arcade») y `prefers-reduced-motion`. No piden
    confirmación al recargar (`enCurso.foto = () => null`). `?arcadePrueba=1` abre los juegos con `?prueba=1`
    (ganchos `window.__plat` y `window.__karts`), solo para E2E;
  - **Controles de Karts Turbo** (cambio `karts-controles-diseno`; causa raíz y decisiones en su `design.md`):
    - la entrada táctil usa *touch events* no pasivos con `preventDefault`, por dedo (`identifier`); los *pointer
      events* quedan para mouse y pluma. Nunca soltar un botón por `lostpointercapture` ni por `blur` (el `blur` solo
      suelta el teclado). Los mandos se ven con *touch events* o `(any-pointer: coarse)` y abajo de 700 px;
    - controles: 🕹️ Joystick (por omisión: flotante, zona muerta 0.15, abajo frena), 📱 Sensor
      (`DeviceOrientationEvent`: `gamma` en vertical, `±beta` en horizontal; centro al arrancar y con 🎯; permiso de
      iOS con el toque en «Activar sensor»; sin permiso o sin lecturas en 2 s regresa al joystick con aviso) y
      🔘 Botones (◀ ▶). DERRAPE, 🎁 y FRENO a la derecha. Preferencia en `localStorage.karts_control` y
      `karts_sensibilidad`. El iframe de Arcade lleva `allow="autoplay; accelerometer; gyroscope"`;
    - giro analógico acotado a [−1, 1]; el derrape lo cuantiza (umbral 0.3) para que las reglas no cambien;
    - minimapa en `canvas#minimapa` (fuera del canvas del juego), con todos los corredores: tú con borde, flecha y
      «TÚ»; rivales y fantasmas con su color y número. La E2E verifica que no se cruza con los mandos a 360×640,
      390×844 y 844×390;
    - pista y sprites de los karts pre-dibujados; partículas con tope de 300 y un tercio con
      `prefers-reduced-motion` (sin humo ni confeti);
  - **Futbolito y Billar** (cambio `futbolito-billar`; decisiones en su `design.md`): `juegos/futbolito.html` y
    `juegos/billar.html` en el mismo iframe de Arcade, **sin avance guardado** (`SIN_AVANCE` en `juegos/app/arcade.js`: no
    piden `/juegos/progreso`). Motores sin DOM y deterministas: `juegos/fisica.js` (`senCos`, `atan2Dec` solo con
    `+ − * /` y `Math.sqrt`; azar con semilla; `linea`, la línea de turnos de sala), `juegos/futbolito-motor.js` y
    `juegos/billar-motor.js` (probados con Deno en `server/fisica_test.ts`; **nunca** usar `Math.sin/cos/atan2/hypot`
    ni `**` en la simulación). `juegos/mesa-ui.js` reúne toques (*touch events* no pasivos, como Karts), sonido,
    avisos, confeti, mensajes y el controlador de sala (`crearSala`: jugadas del servidor + la propia enviada,
    reproduce y anima cada tiro con el mismo objeto de simulación; si llegan varios, salta al penúltimo).
    - Futbolito individual en tiempo real: deslizar (relativo) mueve la barra activa, un toque corto patea, la barra
      activa es la propia más cercana detrás de la pelota; teclado ← → / ↑ ↓ (según la orientación) y Espacio.
    - Billar: arrastrar apunta hacia el dedo con línea guía (bola fantasma, salida de la bola y de la blanca);
      jalar desde la blanca (resortera) tira con la fuerza del jalón; barra de fuerza, ⟲ ⟳ y efecto ⬆ ● ⬇.
    - Teclado y mandos pasan por la capa de acciones `MesaUI.crearAcciones` (`window.accionesJuego.presionar(nombre,
      on)` / `ponerEje(v)`); un mando nuevo se conecta con un adaptador, sin tocar el juego (design §9).
    - Sala: `pintarFisicaSala` manda `inicio { modo: "sala", seed, inicio, ahora, yo, orden, jugadas }` y
      `jugadas { jugadas, ahora }` cuando cambian; el iframe responde `jugada { jugada }` (la página hace el `POST` y
      contesta `jugada-ok`) y `fin { gana, puntos, aciertos, total, titulo }` → `pintarFinalSala`. En Futbolito cada
      quien ve su portería abajo (o a la izquierda en horizontal). Ganchos de prueba `window.__futbolito` y
      `window.__billar` con `?arcadePrueba=1`;
  - **⛳ Golf** (cambio `golf`; decisiones en su `design.md`): `juegos/golf.html` en el iframe de Arcade **con avance**
    (`/juegos/progreso/golf`: mejor y estrellas por hoyo, recorridos y mejor recorrido; manda `guardar` y un `puntos`
    por hoyo terminado). Motor sin DOM y determinista `juegos/golf-motor.js` (`window.Golf`; reutiliza
    `juegos/fisica.js` sin cambiarlo; probado en `server/golf_motor_test.ts`): 9 hoyos como datos (contorno, muros,
    zonas de arena/agua/pendiente, portales y obstáculos `molino`/`compuerta` que dependen del `reloj` en subpasos).
    - Vista: canvas con cámara que sigue a la pelota (suave; inmediata con `prefers-reduced-motion`), escala mínima
      `0.75 · lado corto / 300`, hoyo acostado en horizontal y minimapa (`canvas#minimapa`) que alterna la vista
      completa al tocarlo.
    - Controles: resortera desde cualquier parte del campo (`MesaUI.tactil`; jalón de 170 px = fuerza 100) que **no
      tira al soltar**; ⟲ ⟳ (0.5°) y − + (1) con repetición al mantener; botón grande «⛳ GOLPEAR»; línea guía
      geométrica (hasta 2 rebotes) y fuerza en número. Teclado por `MesaUI.crearAcciones` (← → con Shift fino, ↑ ↓,
      Espacio/J, P/Esc); `window.accionesJuego`. Mando clásico (abajo). Preferencia `localStorage.golf_control`.
    - Sala de 2 a 4 (sin bots): `pintarFisicaSala` (`juegos/app/arcade.js`) toma hasta 4 de `participantes()` para golf; el iframe usa
      `MesaUI.crearSala` con `Golf.motorSala(n)` y en el `fin` agrega `tarjeta { hoyos, golpes }`, que la página pinta
      escapada debajo del podio (`tarjetaGolf`, en el mismo módulo). Ganchos `window.__golf` con `?arcadePrueba=1`;
  - **Vista pseudo-3D de Karts Turbo** (cambio `karts-pseudo3d`; diagnóstico y decisiones en su `design.md`):
    - la carrera se simula en el mapa 2D de siempre y se dibuja en Mode-7 sobre canvas 2D: cámara detrás del carro
      (`seguirCamara`, `d = 115`), piso proyectado por filas desde una textura `Uint32Array` de la pista (tres niveles
      1, ½ y ¼; búfer de máx. 400 px escalado sin suavizado), panorama de 360° (1 rad = F px) y sprites ordenados por
      profundidad; los carros son un modelo de cajas pre-dibujado en 32 vistas. Nunca cambiar reglas para «arreglar»
      la vista: la cámara se deriva de `x`, `y` y `ang` del carro;
    - controles por omisión: Botones (⬅ ➡; DERRAPE, 🎁, FRENO) y «Acelerar: Automático» (`localStorage.karts_acelerar`
      = `auto` | `manual`, este último agrega ACELERAR). Teclado: flechas/WASD (↑ acelera, ↓ frena), ESPACIO derrape,
      E/Shift ítem, P/Esc pausa. Si el sensor falla se regresa a Botones. Tutorial `#tuto` de 3 s al empezar;
    - entrada por acciones (`acel`, `freno`, `izq`, `der`, `derrape`, `item`, `pausa` + eje): un mando nuevo se conecta
      con `window.KartsEntrada.registrar({ presionado(accion), eje() })`, sin tocar las reglas;
    - **🎮 Mando clásico** (cambio `karts-mando`; decisiones en su `design.md`): cuarta opción del selector
      (`karts_control = mando`, cuadrícula 2×2); **por omisión siguen los Botones**. El mando común se registra en
      `KartsEntrada`: cruceta ◀ ▶ = girar (solo por `eje()`, para que la palanca de un control físico gire en
      proporción), A = acelerar (con «Automático» no hace falta; sirve para el arranque turbo), B = frenar, R o L =
      derrape, X o Y = ítem, START = pausa/seguir. El mando no lee teclas (todas en `null`): el teclado de Karts no
      cambia. Está activo en `carrera`/`pausa` con cualquier elección (un control físico funciona siempre, también en
      la PC) y se ve solo con «Mando clásico»; entonces se ocultan `#mandos`. En vertical va debajo de `#pantalla`
      (contenedor `#juego`, el flex le resta su alto; `--mando-alto` no se usa); en horizontal se encima en las
      esquinas solo con `body.en-carrera`, la cruceta pierde el brazo ▼ invisible (`margin-bottom: −u`) y el tutorial
      sube para no taparse con START;
    - en horizontal (`max-height: 520px`) el marco de Arcade de `juegos.html` mide `100dvh − 16px`; las pantallas del
      juego usan `justify-content: safe center` para poder desplazarse;
    **Dibujo de «Axo y los 12 mundos»** (cambio `axo-diseno`): arte vectorial en canvas a la resolución real (`K`),
    sin imágenes externas. Los tiles se pre-dibujan una vez por combinación (tipo, mundo, lados expuestos y variante)
    y los fondos son franjas de paralaje que se repiten (cachés fuera de pantalla a `min(K, 4)`); en cada cuadro solo
    se copian las columnas visibles. En celular vertical el canvas crece a `VH` y el nivel se desplaza `OY`: el
    sobrante es cielo (donde va el HUD) y subsuelo, sin cambiar lo que se ve del nivel. Con `prefers-reduced-motion`
    no hay paralaje ni partículas. El mapa es una escena SVG en línea con los mismos botones `[data-nivel]`;
  - **Personajes de Arcade** (cambio `personajes-xalli`; decisiones en su `design.md`): Xalli (el ajolote, antes
    «Axo»; personaje por omisión), Itzae, Yahui y Xochiquetzal. Fuente única: `juegos/personajes.js`
    (`Personajes.LISTA` con nombre, título, colores y partícula; `normalizar`, `preferencia`, `pintar(c, id, o)` de
    perfil con las poses de Axo y `retrato(id, pose, poder)`), cargado con `<script src="personajes.js?v=1">`. La
    elección vive en `localStorage.arcade_personaje` (compartida por Axo y Karts, como `arcade_sonido`; desconocida o
    sin almacenamiento → `xalli`); **el progreso del servidor no cambia de forma**. Solo cosméticos: no tocan física,
    choque, tiempos ni puntos. Axo: selector `#personajes [data-personaje]` en la portada, partícula `rastro`
    (burbujas, glifos, hojas o pétalos; ninguna con movimiento reducido). Karts: selector `#menu-piloto` en el menú,
    `spriteKart(personaje, color, num, vista, phi)` con la carrocería en los colores del personaje y los costados, el
    número y el minimapa en el color de identidad del corredor (`k.color`; el del taller para la persona); cabeza del
    piloto según la vista (`pintarCabeza`), cola de Yahui y niebla de Xochiquetzal; bots y fantasmas con los otros
    3 personajes en orden fijo; estela del personaje con turbo. En una sala las otras personas no se dibujan, así que
    el personaje no se manda. El título «Axo y los 12 mundos» y el id `plataformas` se conservan (renombrar el título
    es una línea en `plataformas.html`, `juegos.html` y `server/juegos.ts`). Ganchos de prueba: `__plat.cajaJugador()`,
    `__karts.cajaYo()`, `__karts.hojaPilotos()` y `personaje`/`personajes`/`rastro`/`estela` en `estado()`;
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
- **Revancha** (openspec: revancha-partidas; detalle en su `design.md`): el podio de toda partida
  (`pintarFinalSala`) muestra «🔁 Otra con los mismos» (`POST /juegos/sala/<código>/revancha`); si alguien ya la
  abrió (`sala.siguiente`), «🔁 {Nombre} abrió la revancha · Unirme». Al terminar se guarda
  `juegos_revancha = { codigo, quien, t }` (15 min); si se recarga en el podio, el inicio de Juegos muestra la
  tarjeta `#revancha-inicio`. Se borra al entrar a la revancha, al salir del podio, con «No, gracias» y al cerrar
  sesión.

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

## Estructura de juegos/app/ (cambio `organizar-codigo`)

`juegos.html` solo tiene la estructura: el HTML (con el `<svg>` de la baraja española), los `<link>` y los
`<script>`. Su CSS está en `juegos/app/juegos.css` (entre `juegos/tablero.css` y `juegos/clasicos-rapidos.css`, por
la cascada) y su código en estos scripts clásicos, que se cargan **en este orden**, después de los motores e
interfaces de `juegos/*.js` y de `comun/auth.js`:

| Archivo | Responsabilidad |
|---|---|
| `nucleo.js` | `API_BASE` (`?api=`), `?sala=`, `state`, recarga (`juegos_sala_activa`, `juegos_partida_individual`), utilidades (`escapeHtml`, `barajar`, `fmt`…), `api`/`post`/`datos`, sonido y voz |
| `menu.js` | `CATEGORIAS`, `JUEGOS`, `juegoPorId`, `icoJuego`, avatar, sesión y registro (`iniciar`, `pantallaLogin`), hub y navegación por categorías |
| `ranking.js` | 🏆 Ranking (⭐ individuales, 👥 partidas, 🔥 juegos) |
| `admin.js` | 🛡️ Admin (jugadores, pendientes, invitados y fotos) |
| `individuales.js` | `marco`, `reloj`, `terminar`, `quiz` y los juegos de Inglés, Español, Cultura y Mente ágil |
| `arcade.js` | Dragon Run, Axo, Karts, Futbolito, Billar y Golf en iframe (`canalProgreso`, `jugarArcade`) y sus carreras y tiros en sala. No confundir con `juegos/arcade.js` (reglas sin DOM) |
| `mente.js` | Sudoku y Ajedrez contra la computadora |
| `clasicos.js` | Basta, ¡Una! y Lotería contra bots |
| `naipes.js` | Póker y baraja española (Brisca y Conquián) contra bots; HTML de cartas y fichas |
| `salas.js` | partidas multijugador: semilla (`rngDe`), `sala`, Realtime, espera, preguntas, Basta por rondas, podio, revancha, crear/unirse/reanudar y compartir |
| `salas-mesa.js` | Lotería, ¡Una!, Póker, Brisca/Conquián y Ajedrez jugados en sala |
| `musica.js` | música de fondo (WebAudio) y su menú |
| `arranque.js` | `AYUDA` (📖 Cómo se juega), eventos delegados de `#app` e `iniciar()`; **va al último** |

Reglas:
- Son scripts clásicos (sin build ni módulos ES): sus `const`/`let`/`function` de nivel superior son globales
  compartidos. Los scripts de `juegos/` (`salas-grandes.js`, `tablero-ui.js`, `clasicos-rapidos-ui.js`…) y las E2E
  (`JUEGOS`, `CATEGORIAS`, `state`) dependen de esos nombres: no renombrarlos sin buscar sus usos.
- Fuera de `arranque.js`, cada archivo solo **declara**. Lo que se ejecuta al cargar (`JUEGOS.push`,
  `JUEGOS_PARTIDA.push`, `addEventListener`…) solo puede usar lo que cargó antes; nada lee un `const` de un archivo
  posterior hasta que el usuario hace algo.
- Un juego nuevo va en el archivo de su familia (o en un `juegos/<juego>.js` propio, como los de salas grandes). Si
  un archivo pasa de ~600 líneas, se parte por juego.
- Al cambiar un archivo de `juegos/app/`, sube su `?v=` en `juegos.html`.
- El avance en el servidor de los juegos en iframe (Dragon Run, Axo, Karts) pasa siempre por `canalProgreso`.

## Navegación por categorías en Juegos (cambio `juegos-categorias`)

- **Primero la categoría, luego el juego.** La pestaña 🎮 Juegos pinta `#menu-juegos[data-menu]`: con
  `data-menu="categorias"`, las tarjetas `.cat-card[data-categoria]` (`<button>` con emoji, nombre, «N juegos» y la
  descripción `d` de `CATEGORIAS`); con `data-menu="<id>"`, el botón «← Categorías» (`data-a="categorias"`), el
  encabezado `#menu-titulo` y solo las tarjetas `.game[data-juego]` de esa categoría. No usar `data-cat` (es del
  Maratón).
- **Conteos dinámicos:** el número de cada tarjeta (`data-n`, texto y `aria-label`) sale de
  `JUEGOS.filter(j => j.cat === id)`. Un juego nuevo solo necesita su `cat`; nunca escribir números fijos.
- **Estado:** `state.cat` (id o `null`), `sessionStorage.juegos_categoria` (con `try/catch`) y la URL `#cat=<id>`.
  Prioridad al entrar al hub: `#cat=` válido → `state.cat` → `history.state.cat` → `sessionStorage`. Un `#cat=` que no
  existe abre las categorías.
- **Historial:** abrir una categoría hace `pushState({ cat })`; si se pinta una lista y la entrada actual no es suya
  (recarga, regreso de un juego, enlace directo), se convierte en la de categorías y se empuja la de la lista: debajo
  de una lista siempre hay una entrada de categorías. «← Categorías» hace `history.back()` en ese caso. `popstate` y
  `hashchange` solo repintan con el menú a la vista; dentro de un juego el Atrás no cambia nada del juego.
- **Accesibilidad:** al cambiar de vista por una acción, el foco va a `#menu-titulo` (`tabindex="-1"`); las tarjetas
  tienen contorno `:focus-visible`; con `prefers-reduced-motion` no hay `transform` ni transición en `.cat-card` y
  `.game`. Rejilla `.cat-grid`: 1 columna < 360 px, 2 en celular y 3 desde 620 px.
- **Íconos en imagen:** un juego puede tener `icono` (SVG en `juegos/iconos/`, ruta relativa a `juegos.html`).
  `icoJuego(j | id)` devuelve `<img class="ico-img" alt="">` (1.25 em, alineada con los emojis) o el emoji. Úsalo
  donde el ícono va como HTML: tarjeta, 🔥 ranking, `marco`, `terminar`, barra de la sala, «¿Continuar?», portadas y la
  espera de Arcade 1 vs 1. Donde va como texto (`<option>`, avisos, mensajes, títulos de ayuda) se usa `j.emoji`,
  que es el **respaldo**: debe dibujarse en cualquier celular y no repetir el de otro juego (Blackjack ♣️, Dominó 🔳;
  nada de 🂡 ni 🁫). Los módulos que cargan antes de `menu.js` lo llaman en tiempo de ejecución con respaldo a
  `j.emoji`.

## Ritmo de los juegos de cartas (ajuste del profe, sprint final)

| Juego | Individual | Sala |
|---|---|---|
| Póker | resultado de la mano 10 s; bots 2 s | `PK_PAUSA_MS` 9 s; `PK_BOT_MS` 2.5 s |
| Brisca | baza completa 5.3 s; bots 1.5 s | `CS_PAUSA_BAZA_MS` 4 s tras cada baza (sumado a `T0`, determinista; durante la pausa aún no es tu turno); `botMs` 2.5 s |
| Conquián | bot 2.5 s por acción | `botMs` 2.5 s |
| ¡Una! | bots 2.5 s | `U_BOT_MS` 3 s |

- ¡Una!: **robar hasta poder tirar** (cambio `basta-divertida-una-robo`), con `Una.robarHastaPoder` de `juegos/una.js`
  en individual, en sala (`estadoUna`) y para los bots.
  - Roba del mazo hasta la primera carta que sí sirve; esa queda marcada con 🆕 y se puede tirar o pasar. Aviso:
    «Robaste 3 cartas hasta encontrar una que sí puedes tirar» (`Una.avisoRobo`).
  - Si el mazo se acaba sin una que sirva, el turno pasa («…y se acabó el mazo sin una que sirva»). Para robar **no se
    rebaraja** el descarte; los castigos (+2, +4 y UNA tarde) sí lo rebarajan, como antes.
  - Si alguien se queda sin cartas que sirvan y sin mazo, puede **Pasar**.
  - Las cartas robadas entran una tras otra con la animación `.una-btn.nueva` (`--k` = orden; sin animación con
    `prefers-reduced-motion`).
- Basta: `juegos/basta.js` (`Basta.norm`, `dic`, `puntuar`, `conExtras`, `extrasDe`). Las categorías divertidas (hasta
  2) se eligen al crear la partida o antes de la letra en individual y se suman como columnas normales.

## Mando de Arcade (cambio `mando-arcade`)

Fuente única del control de los juegos de 🕹️ Arcade: `juegos/mando.js` (sin dependencias; inyecta su CSS una vez como
`<style id="mando-css">`). Decisiones y lecciones de Karts en `openspec/changes/mando-arcade/design.md` (al archivar,
`openspec/changes/archive/*-mando-arcade/`). Lo usan Axo (`plataformas.html`), Dragon Run (`dragon-run.html`) y Karts
Turbo (`karts.html`, cambio `karts-mando`) y ⛳ Golf (`golf.html`, cambio `golf`); los juegos nuevos (Futbolito, Billar) lo adoptan **sin cambiar la API**. Si hace falta algo nuevo, se
agrega como opción con valor por omisión compatible, en su propio cambio OpenSpec.

**Cargar y crear** (dentro del iframe del juego; `window.Mando`):

```html
<script src="mando.js?v=1"></script>
```

```js
const mando = Mando.crear({
  acciones: { izquierda: 'izq', derecha: 'der', saltar: 'A', fuego: 'B', pausa: 'START' }, // acción → botón o [botones]
  contenedor,            // elemento donde va el mando (por omisión, body); en vertical es un hijo flex debajo del juego
  analogico: false,      // true: palanca (circle pad) encima de la cruceta; eje() analógico
  teclas: { Space: 'A', KeyZ: null }, // cambios al teclado por omisión (KeyboardEvent.code → botón; null quita)
  nombres: { saltar: 'saltar' },      // nombre corto bajo cada botón y en la guía
  zonaMuerta: 0.2,       // palanca y control físico (radial)
  vibrar: true,          // navigator.vibrate(12) al presionar con el dedo
  visible: 'auto',       // 'auto' (táctil, any-pointer: coarse o < 700 px), true o false
  botonesControl: {},    // reasignar índices de la Gamepad API ({ 0: 'B', 6: null })
});
mando.presionado('saltar'); // ¿alguna fuente (dedo, tecla o control) mantiene un botón de la acción?
mando.eje();                // { x, y } en [−1, 1]: palanca táctil > palanca del control > cruceta (diagonal normalizada)
mando.al('saltar', fn);     // flanco de bajada de la ACCIÓN (no se repite si otra fuente ya la mantenía); devuelve quitar()
mando.alSoltar('saltar', fn); // cuando ninguna fuente la mantiene
mando.mostrar(false);       // ocultar el mando de la pantalla (usar los controles propios del juego)
mando.activar(false);       // desactivar toda la entrada (táctil, teclado y control) y soltar lo presionado
mando.botonGuia();          // <button class="mando-guia-btn">⌨️ Controles</button> para colocar donde convenga
mando.mostrarGuia();        // diálogo con cada acción: botón del mando, teclas y botón del control (Esc o «Cerrar»)
mando.soltarTodo(); mando.destruir(); mando.estado(); mando.elemento; // estado() es para pruebas
Mando.preferencia(clave[, valor]); // localStorage con try/catch (modo privado)
```

- **Botones canónicos:** `arriba`, `abajo`, `izq`, `der` (cruceta), `A`, `B`, `X`, `Y`, `L`, `R`, `START`, `SELECT`. Un
  botón desconocido en `acciones` o `teclas` lanza error al crear. Solo se ven los botones usados (de la cruceta, solo
  los brazos usados); un lado vacío conserva su lugar invisible.
- **Distribución:** izquierda cruceta (y palanca opcional), derecha A/B/X/Y en rombo (A derecha, B abajo, X arriba,
  Y izquierda), L/R arriba, START/SELECT al centro abajo. En vertical va debajo del juego (`--u` de 30 a 48 px; cabe
  desde 320 px). En horizontal bajo (`orientation: landscape` y `max-height: 520px`) va encimado en las esquinas, con
  el cuerpo transparente y `pointer-events: none` salvo en los grupos. El módulo publica `--mando-alto` en `:root`
  (0 si está oculto o encimado).
- **Táctil:** *touch events* no pasivos con `preventDefault` en la raíz del mando, por `identifier`; *pointer events*
  solo para mouse y pluma (o sin `TouchEvent`); nunca se suelta por `lostpointercapture`; `touchcancel` suelta ese dedo;
  `blur` suelta solo el teclado y `visibilitychange` (oculto) suelta todo. Cruceta por ángulo en 8 sectores (zona muerta
  central 0.25; el dedo la conserva hasta 1.8 radios), rombo por el botón visible más cercano, deslizar cambia de botón.
  El mando no detiene la propagación de `pointerdown`: un juego con «toca para saltar» debe ignorar
  `e.target.closest('.mando')`.
- **Teclado por omisión:** flechas/WASD = cruceta; J = A, K = B, U = X, I = Y; Q = L, E = R; Enter = START; Shift derecho
  y Backspace = SELECT. Solo se interceptan las teclas de botones usados, con el mando activo, y nunca Enter/Espacio sobre
  botones, enlaces o campos.
- **Control físico (Gamepad API, mapeo estándar por posición):** 0 abajo = A, 1 derecho = B, 2 izquierdo = X, 3 arriba =
  Y, 4/6 = L, 5/7 = R, 8 = SELECT, 9 = START, 12–15 = cruceta; palanca izquierda = `eje()` y, pasado 0.5, cruceta.
  Sondeo con `requestAnimationFrame`; aviso `.mando-aviso` «🎮 Control conectado» / «🎮 Control desconectado».
- **Textos:** español de México y sin marcas («🎮 Mando clásico», «botón de abajo», «gatillo izquierdo»).
- **Uso en los juegos:**
  - Axo: cruceta = mover, A = saltar, B = fuego, START = pausa; además ESPACIO/↑/W = A, X = B, P/Esc = START. Selector
    «🎮 Mando clásico» · «🔘 Botones» (los de antes, con su teclado) en la portada y la pausa,
    `localStorage.plataformas_control`. El mando solo está activo en `nivel`/`pausa` y se ve con `body.jugando`.
  - Dragon Run: A = saltar/doble salto; START = empezar, pausa nueva (`st = 'pause'`, «⏸ Pausa» / «SEGUIR», también
    ⏸ y al ocultar la pestaña) y seguir. Selector «🎮 Mando clásico» · «👆 Tocar la pantalla» en la pantalla de
    misiones, `localStorage.dragon_control`. En vertical el `body` pasa a columna y el cielo/tierra usa `--mando-alto`.
  - Karts Turbo (cambio `karts-mando`): adaptador de `KartsEntrada` (no usa `al`/`alSoltar`: la capa de acciones de
    Karts lee los flancos una vez por cuadro). Acciones `izq`/`der` (cruceta ◀ ▶, entran solo por `eje().x`),
    `acel` A, `freno` B, `derrape` [R, L], `item` [X, Y], `pausa` START; `teclas` con todas las de `Mando.TECLAS` en
    `null` (Karts conserva su teclado y la pausa no se alterna dos veces); `nombres` cortos («gas», «frenar», «ítem»,
    «pausa») para que quepan a 320 px. Sin «⌨️ Controles»: el tutorial de 3 s explica los botones. Selector
    «🎮 Mando clásico» junto a Botones, Joystick y Sensor (`localStorage.karts_control`); por omisión, Botones.
  - ⛳ Golf (cambio `golf`): acciones `apuntarMenos`/`apuntarMas` (cruceta ◀ ▶, giro que acelera al mantener),
    `finoMenos`/`finoMas` L/R (0.5° con `al`), `fuerzaMas` X, `fuerzaMenos` Y, `golpear` A y `pausa` START; `teclas`
    en `null` (el teclado va por la capa de acciones del juego) y nombres cortos («+💪», «−💪», «fino», «golpe»,
    «pausa»). Activo jugando y en pausa. Con «🎮 Mando clásico» (`body.ctl-mando`) el panel de botones se esconde y la
    fuerza sale en el HUD. Selector «👆 Toques» · «🎮 Mando clásico» en la portada (`localStorage.golf_control`).
- **Pruebas:** lógica pura en `server/mando_test.ts` (Deno); E2E `tests/e2e/e2e-mando.js` (toques reales por CDP,
  teclado, control simulado con `navigator.getGamepads` en `addInitScript`, preferencia y capturas), para Karts,
  `tests/e2e/e2e-karts.js` (`probarMando`), y para Golf, `tests/e2e/e2e-golf.js` (cruceta, X, R y A con el dedo y la
  preferencia recordada).

## Juegos fusionados (cambio `juegos-fusion`)

- 🧩 **Completa y responde** (`en-frases`): alterna `preguntaFrase` y `preguntaEn` (en `juegos/ingles-gramatica.js`
  desde `juegos-ingles-gramatica`).
- ✍️ **Ortografía** (`es-ortografia`): mezcla `ortografia`, `acentos` y `poolSinonimos` con `preguntaOrto` y
  `preguntaSinonimo`.
- 🧮 **Cálculo y secuencias** (`mente-calculo`): dura 75 s. Una de cada tres preguntas es de `genSecuencia`.
- En partida, `preguntasPartida` reparte las 10 preguntas así:
  - Completa y responde: 5 y 5;
  - Ortografía: 4, 3 y 3, en orden barajado con semilla;
  - Cálculo y secuencias: 1 de cada 3 es secuencia.
- El Maratón de cultura suma las categorías `ia` y `tecnologia` (desde `cultura-conocimiento`, con más preguntas; ver
  `docs/data-model.md`).

## Cultura y Conocimiento (cambio `cultura-conocimiento`)

- **Sección única** «🧠 Cultura y Conocimiento» en `CATEGORIAS` (`id: 'cultura'`): 🏃 Maratón de cultura, 📜 Línea del
  tiempo, ✍️ Ortografía y 🔀 Ordena la oración. Ya no hay secciones «📝 Español» ni «🧠 Maratón de cultura»; los ids de
  los juegos no cambian. Las E2E cuentan juegos y secciones sin un número fijo (otros cambios suman juegos).
- **Dato al acertar**: `quiz(opts)` acepta `datoAlAcertar`; con él, al acertar se muestra `explicacion` en
  `.quiz-dato` y la siguiente pregunta llega a los 1.6 s. Solo lo usa el Maratón.
- **📜 Línea del tiempo** (`cultura-linea`): la lógica vive en `juegos/linea-tiempo.js`, script clásico cargado antes
  de los scripts de `juegos/app/` (sube `?v=` al cambiarlo):
  - `globalThis.LineaTiempo`: funciones puras (temas, líneas por semilla, aciertos, puntos, bots y podio), probadas
    con Deno en `server/linea_tiempo_test.ts`;
  - pantallas `elegirLineaTiempo()`, `jugarLineaTiempo(d, tema)`, `pintarLineaSala(body)` y `lineasDeSala(seed,
    opciones)`, que usan los helpers globales de la página (`marco`, `reloj`, `terminar`, `rngDe`, `sala`,
    `pintarFinalSala`…).
  - Tablero: lista vertical de casillas («⬆ Más antiguo» a «⬇ Más reciente») y tarjetas debajo. Tocar una tarjeta la
    pone en la primera casilla libre; tocar una casilla llena la regresa; arrastrar con Pointer Events (dedo o mouse,
    `touch-action: none` en tarjetas y casillas llenas) la deja en la casilla soltada e intercambia si estaba ocupada;
    menos de 8 px cuenta como toque. «✔ Confirmar» se habilita con todo colocado.
  - Revelación: año y ✔/✘ en cada casilla, y «📜 Orden correcto» con el dato 💡 de cada suceso. La animación
    `.lt-revela` se apaga con `prefers-reduced-motion`.
  - Individual: tema, 3 vidas, 45 s por línea (`reloj`), hasta 10 líneas de 4, 5 y 6 sucesos; puntos con racha y
    rapidez (ver el `design.md` del cambio). En sala: 5 líneas (4, 5, 5, 6 y 6) de 40 s + 8 s de revelación,
    sincronizadas por reloj; si se acaba el tiempo se envía lo colocado; el podio desempata por aciertos y tiempo, y
    `pintarFinalSala` da la revancha. El selector `#p-ltema` aparece al elegir el juego al crear la partida.

## Gramática de inglés en Juegos (cambio `juegos-ingles-gramatica`)

- La lógica vive en `juegos/ingles-gramatica.js`, script clásico cargado antes de los scripts de
  `juegos/app/` (sube `?v=` al cambiarlo):
  - `globalThis.InglesGramatica`: funciones puras (temas, grupos, filtros, reglas, preguntas de partida), también
    probadas con Deno en `server/ingles_datos_test.ts`;
  - pantallas `elegirTemaIngles(id)`, `jugarFrasesTema(tema)`, `jugarTiempos()` y `resumenFallosSala(sala, n)`,
    que usan los helpers globales de la página (`quiz`, `marco`, `datos`, `barajar`, `escapeHtml`…).
- **Selector de tema** (Todo · To be · Presente · Pasado · Futuro (will)): botones `.opt[data-tema]` antes de 🧩
  Completa y responde y 🔀 Ordena la oración; en partida, `#p-tema` (solo con `en-frases`) va en `opciones.tema`
  y el título de la partida muestra el tema. Los grupos están en `docs/data-model.md`.
- **Regla al fallar**: Completa y responde muestra «Era: … · 📌 regla»; Ordena la oración, la regla de orden del
  tema; en partida, la revelación muestra la regla como `💡` (`dato`). Las pausas no cambian.
- ⏳ **Máquina del tiempo** (`en-tiempos`): motor `quiz`, 90 s contra reloj con racha; cada oración en dos
  preguntas (¿en qué tiempo está? y cámbiala a otro tiempo, con la forma correcta, la original y un error típico).
  Cada pregunta trae `fallo` (tipo de error) y el gancho `quiz(opts).alResponder(pregunta, bien)` los cuenta para
  «🧠 Lo que más se te complicó» (también en el final de la partida, `#p-fallos`). En partida son 5 oraciones × 2
  pasos con la semilla de la sala.

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

## Clásicos rápidos (cambio `clasicos-rapidos`)

- `juegos/clasicos-rapidos.js` es el motor sin DOM (`globalThis.ClasicosRapidos`): reglas y bots de Gato (minimax),
  Conecta 4 (negamax con poda a 4 o 6), Piedra-papel-tijera, Ahorcado y Serpientes, y la reproducción determinista de
  cada sala (`salaGato`, `salaConecta4`, `salaPpt`, `salaAhorcado`, `salaSerpientes`) a partir de
  `{ orden, jugadas, inicio, ahora, dur, rng, memo? }`. Lo prueba `server/clasicos_rapidos_motor_test.ts`.
- `juegos/clasicos-rapidos-ui.js` (`globalThis.ClasicosRapidosUI`): tarjetas, modos individuales, dibujo y clics de
  cada sala, selector de modo del Ahorcado y ayudas. Se carga antes de los scripts de `juegos/app/` y usa sus funciones solo al
  jugar. Estilos en `juegos/clasicos-rapidos.css` (con `prefers-reduced-motion`).
- Ganchos en `juegos.html` y `juegos/app/*.js` (comentario `// clasicos-rapidos`): `<link>` y 2 `<script>`, `JUEGOS.push(...TARJETAS)`,
  ids en `JUEGOS_PARTIDA` y `TIEMPO_REAL`, una línea en `pintarSala`, las opciones al crear y `AYUDA`.
- Los participantes salen de `participantes()` (tabla de mesas). Las elecciones ocultas de Piedra-papel-tijera
  (`"?"`) se vuelven a pedir y las ya vistas se recuerdan en `sala.cr.vistas`.
## Juegos de tablero (cambio `juegos-tablero`)

- **Motores:** `juegos/tablero.js` es el motor sin DOM de Damas, Dominó, Parchís y Batalla naval. Expone
  `globalThis.Tablero`, sus estados son JSON y lo prueban `server/tablero_test.ts` y `server/naval_test.ts`.
- **Pantallas:** `juegos/tablero-ui.js` (`TableroUI`) tiene las pantallas individuales, las salas y la ayuda.
  - Es un script clásico que se carga antes de los scripts de `juegos/app/` y usa sus funciones globales en tiempo de llamada.
  - Sus ganchos en `juegos.html` y `juegos/app/*.js` llevan el comentario `juegos-tablero`.
- **Estilos:** `juegos/tablero.css`, con prefijo `tb-`.
  - El arte es propio: las piezas y fichas son CSS y el tablero de Parchís es SVG.
  - Las animaciones (deslizar la pieza, caer la ficha, girar el dado e impacto del disparo) se apagan con
    `prefers-reduced-motion`.
- **Salas:**
  - Damas, Dominó y Parchís se reproducen en el cliente por pasos, como `estadoCartasSala`: el bot juega a los
    1.5 s y el turno de una persona dura 30 s (60 s en Damas).
  - Batalla naval muestra solo lo que manda el servidor. La flota propia se conserva en `sala.tb.miFlota`, porque los
    avisos de Realtime no traen flotas.
- **Celular:** todo cabe a 390 px. El Parchís y la Batalla naval mueven y disparan con botones o casillas de buen
  tamaño, y el Parchís repite las jugadas posibles como botones de 44 px.
- **Para cambiar un motor:** sube `?v=` en las etiquetas de `juegos/tablero*.js` y `tablero.css`.

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
- Fichas (cambio `poker-fichas`; decisiones en su `design.md`):
  - `Cartas.FICHAS_INICIALES` = 500 y `Cartas.CIEGAS` = 5/10, 10/20, 20/40 y 40/80 (cada 4 manos); la página no
    escribe esos números, los toma del motor. Todo va en múltiplos de `Cartas.FICHA` (5).
  - Puntos: `pkPuntos` = fichas × (1000 ÷ `FICHAS_INICIALES`) ÷ jugadores, tope 1000; +150 al equipo ganador.
  - «⬆️ Subir» (`data-pk-abrir`) abre `#pk-subir`: fichas `.pk-ficha[data-pk-ficha]` de 5/10/20/50/100 (CSS puro,
    `aria-label="Ficha de N"`), aumento `#pk-aum`, `#pk-total`, `#pk-pila`, «↺ Limpiar» (`data-pk-limpiar`) y
    «✅ Apostar» (`data-pk="subir"`, `monto = data-base + data-aum`). Un escucha único en `document` lo maneja en
    individual y en sala.
  - `pkPilaHtml(monto, chica)` dibuja pilas de fichas (pozo y apuesta de cada asiento); son `aria-hidden`.
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
  - Diseño de la carta (cambio `cartas-espanolas-diseno`; detalle en su `design.md`): `esCarta` dibuja con el sprite SVG
    del `<body>` (palos `es-s0..3`, figuras `es-f10..12`), sin imágenes externas; `role="img"` y `aria-label` con
    `nombreEsp`. Tamaño con `--cw`/`--w` (mano, mesa y `.chica`). La mano se arma con `esManoHtml` (abanico en una
    fila que se encima solo si no cabe), el mazo con `esMazoHtml` y los dorsos de rivales con `esDorsosHtml`;
    `esNuevas(zona, ids)` anima solo las cartas que llegan a la mesa (sin animación con `prefers-reduced-motion`).
    Ojo: la regla genérica `.sel` (selects) se anula en `.es-btn.sel`.
- 📖 Cómo se juega: `AYUDA[id]` (HTML) más `ayuda(id)`, que abre un `<dialog>` que se cierra con Esc o con el botón.
  Cualquier botón con `data-ayuda="<id>"` lo abre.

## Peticiones al servidor (cambio `ahorro-peticiones`)

- Los POST van con `{ 'content-type': 'text/plain;charset=UTF-8' }` y el body en JSON: así el navegador no hace la
  verificación previa de CORS y cada envío cuesta 1 petición en lugar de 2. No agregues encabezados personalizados.
- Sondeo de salas:
  - 2.5 s en la sala de espera y en ¡Una!, Basta, Lotería, Póker, Brisca y Conquián (`TIEMPO_REAL`);
  - 5 s en los juegos de preguntas;
  - en el podio sigue cada 5 s (30 s con Realtime) hasta ver la revancha (`siguiente`) o 15 min
    (`revancha-partidas`);
  - se detiene tras el podio, al vencer la sala, a 1 h o, en la sala de espera, a los 15 min sin empezar;
  - fallas de red y pestaña oculta: ver «Caché y estabilidad del cliente».
- Realtime (cambio `salas-realtime`): si el GET de la sala trae `rt`, `conectarRealtime` carga supabase-js 2.45.4
  (jsdelivr, diferido) y escucha el evento `estado`:
  - `mezclarEstado`: por jugador gana la `v` más alta y una sala empezada no regresa a la espera;
  - al quedar `SUBSCRIBED`: una consulta para ponerse al día y respaldo cada 30 s;
  - si el canal falla, vuelve el sondeo normal;
  - `limpiar` hace `removeChannel`.

## Caché y estabilidad del cliente (cambio `cache-estabilidad`)

Fuente canónica de las reglas de caché del cliente (decisiones y medición en el `design.md` del cambio; las del
servidor, en [backend-standards.md](backend-standards.md) «Caché y single-flight»):
- **Nunca `cache: 'no-store'` ni `'no-cache'` en peticiones al API:** en Chromium se saltan también la caché de la
  verificación previa y cada petición con `Authorization` paga un `OPTIONS`. `fetchConSesion` usa `cache: 'default'`; la
  frescura la da el servidor (`no-store` en datos personales).
- **Peticiones JSON por `StaldAuth.pedirJson(url, opts, { ttl? })`** → `{ ok, status, body }` (Juegos e Inglés lo usan
  dentro de su `api()`):
  - junta en una sola las peticiones `GET` idénticas en vuelo;
  - guarda en memoria solo lo que pide `ttl` (ms), con el correo de la sesión en la clave. Hoy: el ranking de Juegos,
    30 s. Nunca pongas `ttl` a algo que la persona acaba de cambiar sin pasar por un envío;
  - cualquier envío (`POST`, `DELETE`), `salir()` y `limpiarCache()` vacían esa memoria;
  - reintenta los `GET` ante red caída, 429, 502, 503 y 504 (2 veces, espera creciente, `Retry-After` ≤ 5 s), salvo
    errores que no cambian al reintentar (`sin_base`, `sin_config`, `auth_no_disponible`, `limite_diario`,
    `cupo_lleno`). Los envíos **no** se reintentan solos;
  - sin red responde `status: 0`, `error: 'sin_conexion'` y `mensaje` amable, sin lanzar.
- **Sondeo de salas:** un error nunca lo detiene; mientras falle, la espera se duplica (hasta 30 s) y se muestra `#p-red`
  «📶 Reconectando…»; al primer éxito vuelve a su ritmo. Con la pestaña oculta no consulta; al volver, consulta enseguida.
- `juegos/datos/*.json` se piden una vez por página (`datos()`); si la descarga falla, se reintenta la próxima vez.
- Medición: `tests/e2e/e2e-peticiones.js` cuenta en un proxy las peticiones por flujo (con `OPTIONS`) y falla si un flujo
  pasa su umbral. Si un cambio agrega peticiones a un flujo, ajusta el umbral en el mismo PR y explica por qué.

## Inglés pro (cambio `ingles-pro`)

- **Archivos.** `ingles.html` es el shell (encabezado, acceso, `#nav`, `#content` y `<dialog id="cajon">`). Enlaza:
  - `estilos/stald.css`: tokens (`--bg`, `--card`, `--text`, `--muted`, `--border`, `--accent`, `--accent-bg`, `--ok`,
    `--warn`, `--bad` y sus `-soft`; radios 12/18/24; sombras en 2 niveles; espacio de 4 px) y componentes
    (`.card`, `.btn`, `.chip`, `.tabs`, `.anillo`, `.barra`, `.tabla`, `.kpis`, `dialog.cajon`, `.esqueleto`, `.vacio`,
    `.nav-item` y `.nav-barra`);
  - `ingles/ingles.css`: estilos propios de Inglés (incluida la presentación del Meet);
  - scripts clásicos con `defer`, en este orden: `comun.js` (configuración, `SECCIONES`, `api()`, formato y
    componentes), `reproductor.js`, `presentacion.js`, `admin.js` (grupos, registro de alumnos y alumnas, juegos; el registro va en su propia opción «➕ Registro», separado del avance en «Alumnos»), `tablero.js`
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
  - **Autoguardado** (cambio `examen-autoguardado`): cada respuesta se guarda en
    `localStorage['stald_borrador:<ingles|profe|secundaria>:<hash FNV-1a del correo>:<id>:<intento>']` =
    `{ v: 1, t, r }` (`r` con la forma de `examAnswers`). Es la copia inmediata en el aparato.
    - Copia en la cuenta (cambio `borrador-en-servidor`): `PUT …/<id>/borrador { intento, respuestas }` 2.5 s después
      del último cambio, al ocultar la pestaña (`keepalive`) y, si falló, al volver la conexión (`online`). Al abrir el
      intento gana la copia más reciente entre la del aparato y la de la cuenta (`borrador.actualizado`), así que se
      recupera desde cualquier aparato o navegador. `#autoguardado` dice «Tu avance se guarda en tu cuenta ✔ · …» o,
      sin conexión, que se subirá al reconectar.
    - Al reabrir el mismo intento se restaura por id de pregunta (ignora las que ya no están y las fijas de la
      corrección), avisa «Recuperamos tus N respuestas» (`#autoguardado-aviso`) y, en modo paso, va a la primera sin
      contestar.
    - Se borra al enviar con éxito, al abrir un intento posterior o un elemento terminado, con 🚪 Cerrar sesión y a
      los 14 días. La vista previa del admin no guarda.
    - Mientras existe `#exam-form`, `html.examen-abierto` aplica `overscroll-behavior-y: contain` (sin «jalar para
      recargar») y `beforeunload` pide confirmar si hay respuestas sin enviar.
- **Peticiones.** Todas salen por `api(url, opts, cfg?)` en `comun.js` (`fetchJson` es un alias), que usa
  `StaldAuth.pedirJson` (ver «Caché y estabilidad del cliente»).
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
