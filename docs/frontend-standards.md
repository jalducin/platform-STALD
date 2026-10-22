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
  - la tarjeta de Secundaria lleva a `secundaria.html`, que desde el cambio `secundaria-sin-notion` es un puente a
    `ingles.html?modo=secundaria` (ya no hay tablero de Notion).
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
- **Sesión (cambio `plataforma-login`):** todas las páginas incluyen `<script src="comun/auth.js?v=8">` (sube `?v=` en las
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
    (`localStorage.arcade_sonido`; también calla la emoción sonora, ver «Emoción sonora»), controles táctiles grandes (Axo, Dragon Run y Karts usan el mando compartido; ver
    «Mando de Arcade») y `prefers-reduced-motion`. No piden
    confirmación al recargar (`enCurso.foto = () => null`). `?arcadePrueba=1` abre los juegos con `?prueba=1`
    (ganchos `window.__plat` y `window.__karts`), solo para E2E;
  - **Pistas y copas de Karts Turbo** (cambio `karts-pistas-mesoamericanas`; decisiones en su `design.md`): las
    definiciones viven en `juegos/karts-pistas.js` (script clásico sin DOM, `window.KartsPistas`), que `juegos.html`
    y `karts.html` cargan **antes** de `juegos/arcade.js`. Cada pista lleva trazado, física, colores, `tema` (cielo
    de 360°), `decor` (adornos al azar), `fijos` (adornos por tramo), `desc` y `mecanicas` (zonas deterministas:
    `turbo`, `salto`, `cenote`, `lodo`, `trajinera`). `Arcade.PISTAS` son las de sala (`sala: true`; las 8 desde
    `juegos-en-vivo`; `MAPAS_SALA` de `server/carreras.ts` sale de ellas desde `karts-copa-reinos`); `Arcade.pistaPorId` encuentra todas. Copas en
    `KartsPistas.COPAS` (Copa Fiesta, Copa Mesoamericana y, desde `karts-copa-reinos`, Copa Reinos Antiguos); `copaEnCurso.copa` dice cuál va en curso (sin id =
    Copa Fiesta). Agregar una pista = un objeto en `karts-pistas.js` + sus dibujos en `karts.html`; las pruebas de
    datos (`server/karts_pistas_test.ts`) revisan que sea cerrada, manejable y con su minimapa. Cambio
    `karts-pistas-grandes`: vueltas ≈ 3 veces más largas (2.9–3.0×, radio mínimo ≥ el de antes, caja ≤ 12.6 M px),
    `vueltas` por pista (`Arcade.vueltasDe`, 3 en las 16 desde `karts-3-vueltas`; nunca `Arcade.VUELTAS` directo), cajas, monedas, lava y
    escenario proporcionales a la vuelta, escenario agrupado en celdas de 512 px (`decorCerca`) y gancho de prueba
    `__karts.rapido(n)` (n pasos de la misma física por cuadro). Cambio `karts-copa-en-sala`: la copa en sala la lleva
    la página (`pintarCopaSala` en `juegos/app/arcade.js`, calendario de `juegos/karts-copa.js`) con un solo iframe para
    las 4 carreras: manda `inicio` con `copa { k, nombre, tabla }` y `copa-tabla` mientras se espera; el juego muestra
    `#ov-copa`, reutiliza el canal en vivo y marca cada mensaje con la carrera (`d[9]`); cambio `karts-copa-sala-4`: la
    página nunca abandona sola una carrera (quien se entera tarde entra tarde) y, tras la primera llegada (45 s, `KartsCopa.PLAZO_MS`; cambio `karts-plazo-45`), manda
    `{ tipo: 'plazo', carrera, finLocal }`: el juego muestra `#plazo` «⏱️ N s para terminar» y 1.5 s antes del cierre
    manda su «no terminó» con `avance` (también en la carrera suelta de Karts, con `carrera: null`); cambio `karts-salida-y-puntos`:
    la hora del servidor de las salas sale de `juegos/reloj-sala.js` (intersección de las cotas de cada `GET /sala` y de
    los avisos de Realtime, no la última muestra), `inicio` lleva `salidaLocal` (hora del aparato de la salida) y el
    juego fija su salida ANTES de pintar la pista; la parrilla es `Arcade.parrilla` (filas de 2 a 48 px, lados ±24 px,
    personas adelante en el orden de la sala, fantasmas detrás) y el podio de una carrera suelta es
    `Arcade.podioCarrera`, el mismo del servidor, que solo se pinta con los tiempos que ya tiene el servidor;
    cambio `karts-copa-espacio` (decisiones y balance en su `design.md`): pistas con `espacio: true` (fuera del camino
    hay vacío) y `ritmoBots` (`Arcade.ritmoBots`: habilidad de los bots y tiempo de los fantasmas de sala); mecánicas por
    fracción de la vuelta (`f`, `tramo`, `salida`) con reglas puras en `KartsPistas` (`marcasEspacio`, `rescateEn`,
    `ladoPlataforma`, `aperturaCompuerta`, `ESPACIO`); el dibujo espacial (piso, sprites `esp*`, cielo y parche de las
    plataformas en los mipmaps) vive en `juegos/karts-espacio.js` (sin estado, solo lo carga `karts.html`). Copas con
    `nivel` (orden de dificultad: menú, selector y salas usan `KartsPistas.copasOrdenadas()`) y `requiere: { podios }`
    (`copaDesbloqueada`); `KartsCopa.COPAS_SALA`, el `<select>` de «Crear partida» y `MAPAS_SALA.karts` del servidor
    salen de las definiciones (no se copian listas). Agregar una copa = sus pistas y un objeto en `COPAS` con `nivel`;
    cambio `karts-copa-reinos` (decisiones en su `design.md`): tercera copa, **Copa Reinos Antiguos** (`reinos`, `nivel: 3`,
    `requiere: { podios: 1 }`: Giza, El Castillo, Karnak y Angkor Wat), con tramos DENTRO del monumento. Una pista puede
    llevar `interiores` (`desde`, `hasta`, `ancho` en veces `mitad`, `muro` 0/±1, `techo`), `int` (colores del interior),
    `columnas`, `adornos`, `lago` y `foso`; mecánicas `arena`, `luz`, `bloques`, `roca` y `losa` (compuerta de piedra que
    se desliza; distinta de la `compuerta` espacial), con funciones puras en `karts-pistas.js` (`tramosInteriores`,
    `muroEn`, `colocarColumnas`, `alturaBloque`, `ladoRoca`, `centroCompuerta`). El dibujo y la física de los interiores
    viven en `juegos/karts-reinos.js` (`window.KartsReinos`, script clásico que `karts.html` carga antes de su script;
    solo define funciones y `karts.html` lo llama con ganchos marcados `karts-copa-reinos`): muros en 3D
    (cuadriláteros proyectados; dentro de un corredor, en lote y solo los de ese tramo), portadas, bóveda (segundo
    panorama), niebla, viñeta y brillo de antorchas; con `prefers-reduced-motion`, antorchas quietas y luz sin
    transición. Ganchos de prueba: `__karts.obstaculo(tipo)` y `estado().reinos`;
  - **Trazados técnicos** (cambio `karts-curvas-complejas`; decisiones en su `design.md`): las pistas del Espacio y de
    Reinos Antiguos llevan `trazado: 3` y trazados con espiral doble, sacacorchos, laberintos de giros de 90°,
    chicanas, horquillas y curvas que se cierran (no hay ocho con cruce: el motor es de un solo plano). La
    complejidad es medible con `KartsPistas.complejidad(M)` / `curvasTrazado(M)` (giro total, curvas > 120°,
    espirales, sacacorchos, laberinto, chicanas, horquillas); `server/karts_curvas_test.ts` exige un mínimo por pista.
    Un interior largo que se enrolla (espiral) se parte en tramos seguidos para que, dentro del corredor, solo se
    dibujen los muros de ese tramo (60 fps). Entre muros, los bots miran más cerca (como en el espacio). Récords del
    trazado anterior en `recordsV2` (ver `docs/data-model.md`). Ganchos de prueba: `estado().bots` (vuelta, muestra y
    velocidad de cada bot) y `KARTS_PISTA=<id>` en `e2e-karts.js` para correr una sola pista. Cambio `karts-3-vueltas`:
    3 vueltas por carrera (referencia, límites de sala y bots salen de `vueltas`), récords de 2 vueltas en `recordsV3`
    («2 vueltas»), gancho `__karts.alFinalDe(v)` (al final de la vuelta v) y `KARTS_SOLO=vueltas` en `e2e-karts.js`;
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
    - **Controles** (cambio `futbolito-equipos-controles`; diagnóstico con toques reales y decisiones en su
      `design.md`). Botones táctiles con `MesaUI.boton` (responde al **bajar** el dedo, por dedo, sin umbral de
      movimiento ni de tiempo) y `MesaUI.sostener` (repite cada 60 ms tras 300 ms). El mando común se conecta como en
      Karts: `Mando.crear` sin teclas (todas en `null`), activo en el juego, la pausa y la sala con cualquier control
      elegido (un control físico funciona siempre), visible solo con «🎮 Mando clásico»; su `eje()` entra a la capa de
      acciones con `MesaUI.ejeDeMando` (no pisa el eje de otro adaptador). En horizontal el mando y los botones van
      encimados en las esquinas: la mesa se achica para dejarles lugar (`reservaLateral`) y START sube a la esquina
      superior derecha.
    - Futbolito individual en tiempo real: selector en la portada y botón 🎮 del HUD — **🔘 Botones** (por omisión:
      flechas grandes ◀ ▶ en vertical o ▲ ▼ en horizontal, «⚽ PATEA» y «🔄 BARRA» con el nombre de la barra activa),
      **👆 Deslizar** (mitad izquierda desliza, mitad derecha patea al tocar) y **🎮 Mando clásico** (cruceta
      proyectada sobre el eje de la barra en pantalla, A patea, B/R siguiente barra, L anterior, START pausa); se
      recuerda en `localStorage.futbolito_control`. La barra activa sale de `Futbolito.barraActivaCon` (pelota pegada
      por detrás hasta el alcance y histéresis); el cambio manual manda 2.5 s. Teclado: ↑ ↓ / W S y ← → / A D mueven
      (en pantalla: ← o ↑ = menos), Espacio/J patea, Tab/E/K siguiente barra, Q anterior, P/Esc/Enter pausa (solo
      en juego; en los menús el teclado es del navegador).
    - Billar: selector **👆 Táctil** / **🎮 Mando clásico** (`localStorage.billar_control`) en la portada y el HUD.
      Arrastrar apunta hacia el dedo solo después de moverlo más de 8 px; ⟲ ⟳ finos (0.1° por toque, repiten y
      aceleran hasta 2°); ángulo a la vista; bola fantasma rellena; resortera solo desde la blanca (`max(4R·K, 36 px)`),
      con «💪 fuerza · suelta para tirar», dispara con jalón ≥ 48 px y se cancela regresando a menos de 24 px; barra de
      fuerza vertical (`#fuerza`, `role="slider"`) con número; «🎱 TIRAR» grande. Mando: cruceta ◀ ▶ o palanca apunta
      (solo por `eje().x`), L/R fino, A tira, X/▲ y Y/▼ fuerza, B efecto, START menú; con él se oculta el panel y se ve
      la franja `#datos`. Teclado: ← → apuntar, Q/E fino, ↑ ↓ fuerza, K efecto, Espacio tirar.
    - Teclado y mandos pasan por la capa de acciones `MesaUI.crearAcciones` (`window.accionesJuego.presionar(nombre,
      on)` / `ponerEje(v)`); un mando nuevo se conecta con un adaptador, sin tocar el juego (design §9).
    - Sala: `pintarFisicaSala` manda `inicio { modo: "sala", seed, inicio, ahora, yo, orden, jugadas }` y
      `jugadas { jugadas, ahora }` cuando cambian; el iframe responde `jugada { jugada }` (la página hace el `POST` y
      contesta `jugada-ok`) y `fin { gana, puntos, aciertos, total, titulo }` → `pintarFinalSala`. En Futbolito cada
      quien ve su portería abajo (o a la izquierda en horizontal). Ganchos de prueba `window.__futbolito` y
      `window.__billar` con `?arcadePrueba=1`. En sala horizontal el marco se desplaza a la vista como en individual.
    - **Futbolito por equipos** (cambio `futbolito-equipos-controles`): la página ofrece «Formato» (1 vs 1 o
      2 vs 2) al crear la sala, muestra los equipos en la sala de espera (`#p-equipos-fut`, mismo reparto que el juego:
      `juegos.html` carga `juegos/fisica.js` y `juegos/futbolito-motor.js`; `equiposFutbolito` y `cambiarEquipoFutbolito`
      en `juegos/app/arcade.js`, formulario y `participantes()` en `juegos/app/salas.js`) con «🔁 Cambiar de equipo» (`POST …/unirse { equipo }`)
      y pasa al iframe la mesa completa (hasta 4) con el `equipo` pedido de cada quien. El juego reparte con
      `Futbolito.repartir`, juega con `Fisica.linea` y `Futbolito.motorSala(reparto)` (tira el asiento dueño de la barra
      con la pelota; `valida` descarta un tiro con otra barra) y manda `barra` en cada tiro. Cada asiento tiene color
      (rojo: amarillo y rosa; azul: cian y lima) en sus mangos y su nombre junto a su primera barra; el marcador dice
      «Tú + Angel» contra «🤖 + 🤖»; tu equipo siempre ataca hacia arriba. Panel de tiro: flechas sostenidas para correr
      la barra, ⟲ ⟳ para el ángulo, fuerza con número y «⚽ PATEA» (mando: cruceta, L/R ángulo, X/Y fuerza, A patea;
      teclado: flechas, Q/E ángulo, R/F fuerza, Espacio). Puntos por equipo para cada integrante;
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
  - **⚽ Fútbol Estelar 2010** (cambio `futbol-estelar`; decisiones, alcance y diseño del en línea del sprint 27 en su
    `design.md`): `juegos/futbol.html` en el iframe de Arcade **con avance** (`/juegos/progreso/futbol`: estadísticas,
    clasificatoria semanal, táctica y carrera; manda `guardar` y un `puntos` por partido contra la IA de una persona;
    los partidos locales no suman). Universo ficticio en `juegos/datos/futbol.json`, generado por
    `herramientas/generar-futbol.ts` con las reglas de `juegos/futbol-liga.js` (`window.FutbolLiga`).
    - Motor sin DOM y determinista `juegos/futbol-motor.js` (`window.FutbolMotor`, probado en
      `server/futbol_motor_test.ts`); dibujo en `juegos/futbol-vista.js` (`window.FutbolVista`): cámara lateral de
      transmisión que proyecta puntos del mundo (metros) con perspectiva, sprites de jugadores pre-dibujados (16
      cuadros: 8 a la derecha y 8 en espejo con el número al derecho), balón con altura y sombra, tribuna pre-dibujada,
      vallas con textos inventados, escudos y camisetas en canvas (`escudoUrl`, `camisaUrl`) y radar.
    - Entrada `window.FutbolEntrada` (como `KartsEntrada`): fuentes «todo» (toques + teclado J/K/U/I, Shift, Q +
      `Mando` con cualquier control), «tecladoIzq», «tecladoDer», «pad0»…«pad3» (cada control por separado con
      `Mando.controlABotones`) y «pantalla». En el modo local no se activa el mando virtual (junta todos los controles).
      Joystick flotante y botones A/B/X/Y/L/R con *touch events* no pasivos; los textos cambian en defensa y en las
      reanudaciones. Preferencias en `localStorage`: `futbol_control`, `futbol_nivel`, `futbol_minutos`,
      `futbol_fuera`, `futbol_club`. Ganchos `window.__futbol` con `?prueba=1`.
    - Audio propio sintetizado (patada, poste, atajada, público) y «Emoción sonora» (`juegos/emocion.js`): `gol()` y
      `silbato()` al empezar, en el medio tiempo y al final (con el sonido propio de respaldo), `intensidad(x)` en los
      últimos minutos con el marcador cerrado (se apaga en la pausa, al final y al salir), `victoria()`/`derrota()`,
      `suspenso()`/`revelacion()` en los penales, `podio(lugar)` al terminar la copa o el torneo y `calma()` al salir.
    - **En línea 1 vs 1** (cambio `futbol-en-linea`, decisiones en su `design.md`): sala `futbol` de 2 personas sin
      bots; en la sala de espera cada quien elige su táctica (`tacticaFutbol` en `juegos/app/arcade.js`). El iframe
      recibe `{ tipo: 'inicio', modo: 'linea', rol, yo, participantes, nombres, seed, vivo, tacticas }`, se conecta con
      `EnVivo.conectar` (`juegos/en-vivo.js`) y al final manda `fin-linea { goles, ms, corte }` (la página lo registra
      y pinta el podio) o, sin canal, `ir-clasif` (abre la Clasificatoria semanal con `?modo=clasif`). Netcode sin DOM
      en `juegos/futbol-red.js` (`window.FutbolRed`, probado en `server/futbol_red_test.ts`): foto cuantizada a 15 Hz
      (`fe:foto`), entrada a 30 Hz (`fe:entrada`), búfer de interpolación de 100 ms, predicción y reconciliación del
      jugador propio, `📶` latencia y aviso de desconexión (IA de inmediato, cierre a los 15 s). Sin pausa en vivo.
    - **Futbolito retirado del menú**: su tarjeta pasó a `JUEGOS_RETIRADOS` (`juegos/app/menu.js`) y salió de
      `JUEGOS_PARTIDA`; `juegoPorId('futbolito')` lo sigue encontrando para salas en curso, ranking e historial.
  - **🦎 Brigada Xalli** (cambio `brigada-xalli`; decisiones en su `design.md`): run-and-gun original en
    `juegos/brigada.html` (iframe de Arcade, con avance `brigada` por `postMessage`: `guardar` y `puntos` por misión).
    Datos de las 4 misiones en `juegos/brigada-misiones.js`; motor sin DOM `juegos/brigada-motor.js`
    (`window.BrigadaMotor`: paso fijo de 1/60, armas, enemigos, jefes con semilla, cámara compartida con liga, IA,
    puntos, estrellas y forma del avance; lo importa `server/brigada.ts`). Vista en canvas 2D con fondos en tiras
    pre-dibujadas y sprites por pose (personajes de `juegos/personajes.js` con casco, mochila y lanzaburbujas medidos
    con la caja del dibujo); *pools* de proyectiles, partículas y textos. Controles: capa `BrigadaEntrada` (joystick
    flotante + rombo A salta, B dispara, X globo, Y arma —mismo rombo que el mando común—, mando con `analogico: true` y
    teclas en `null`, teclado y fuentes registradas); el joystick táctil apunta en 4 direcciones (`c4`). Ganchos de
    prueba `window.__brigada` con `?prueba=1`. Cooperativo en sala (de 1 a 8): `juegos/app/brigada-sala.js`
    (`pintarBrigadaSala`, podio con los puntos del servidor) manda al iframe `{ tipo: 'inicio', modo: 'sala', rol,
    anfitrion, yo, asientos: [{ id, nombre, bot, personaje }], seed, vivo, mision }`; con una sola persona simula su
    aparato (compañeros IA), con más usa `juegos/brigada-red.js` (anfitrión autoritativo, `BrigadaRed.anfitrion` /
    `BrigadaRed.invitado`, cámara compartida) y responde `fin-sala { puntos: { <id>: n }, ms, completada, corte }` o,
    sin canal, `ir-solo`.
  - **⚽ Futbolito Arena** (cambio `futbolito-arena`; decisiones, medición del canal y 3 vs 3 en su `design.md`):
    `juegos/futbolito-arena.html` en el iframe de Arcade, sin avance guardado (`SIN_AVANCE`). Motor sin DOM
    `juegos/arena-motor.js` (`window.ArenaMotor`: física de paso fijo solo con `+ − × ÷` y `Math.sqrt`, reglas, IA,
    `repartir` de equipos, validación y puntos; lo importan también la página de Juegos y `server/arena.ts`) y netcode
    `juegos/arena-red.js` (`window.ArenaRed`, probado en `server/arena_red_test.ts`). Vista en canvas 2D con la arena
    pre-dibujada y cuerpos de robot por color; en vertical la arena se gira 90° y tu portería queda siempre abajo o a
    la izquierda (`ROTS`; el joystick se traduce de pantalla a mundo con `vista.aMundo`). Controles: capa
    `ArenaEntrada` (teclado, joystick flotante + ⚡ A y 🌀 B táctiles por dedo, mando común con `analogico: true` y
    teclas en `null`, y fuentes registradas); una presión más corta que un cuadro no se pierde (`pulso`). En sala la
    página manda `{ tipo: 'inicio', modo: 'sala', rol, anfitrion, yo, asientos: [{ id, nombre, bot, eq, color, num }],
    seed, vivo, formato, arena, goles }`; con una sola persona simula su aparato, con más usa el canal en vivo
    (anfitrión autoritativo); responde `fin-sala { goles, ms, corte }` o, sin canal, `ir-solo`. La hora de las fotos
    en el invitado sale de `ahora() − meta.edad` (el reloj del canal puede ser otro que `performance.now`). Ganchos de
    prueba `window.__arena` con `?prueba=1`.
  - **Vista pseudo-3D de Karts Turbo** (cambio `karts-pseudo3d`; diagnóstico y decisiones en su `design.md`):
    - la carrera se simula en el mapa 2D de siempre y se dibuja en Mode-7 sobre canvas 2D: cámara detrás del carro
      (`seguirCamara`, `d = 115`), piso proyectado por filas desde una textura `Uint32Array` de la pista (tres niveles
      1, ½ y ¼; búfer de máx. 400 px escalado sin suavizado), panorama de 360° (1 rad = F px) y sprites ordenados por
      profundidad; los carros son un modelo de cajas pre-dibujado en 32 vistas. Nunca cambiar reglas para «arreglar»
      la vista: la cámara se deriva de `x`, `y` y `ang` del carro;
    - controles por omisión: Botones (⬅ ➡; DERRAPE, 🎁, FRENO) y «Acelerar: Automático» (`localStorage.karts_acelerar`
      = `auto` | `manual`, este último agrega ACELERAR). Teclado: flechas/WASD (↑ acelera, ↓ frena), ESPACIO salto y
      derrape, E/Shift ítem, P/Esc pausa. Si el sensor falla se regresa a Botones. Tutorial `#tuto` de 3 s al empezar;
    - entrada por acciones (`acel`, `freno`, `izq`, `der`, `derrape`, `item`, `pausa`, `reversa`, `salto` + eje): un mando nuevo se conecta
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
    - **⏪ Reversa** (cambio `karts-reversa`; decisiones en su `design.md`): acción `reversa` de `KartsEntrada`; lógica
      pura en `juegos/karts-reversa.js` (`window.KartsReversa`, probada en `server/karts_reversa_test.ts`). Mientras se
      mantiene, el carro frena y retrocede a 38 % de la punta (aceleración 90 px/s²) con el volante invertido; manda
      sobre «Automático». Celular: botón «⏪ REVERSA» en la tercera fila de `#m-der` (Botones, Joystick y Sensor).
      Mando: B estando parado (etiqueta «frenar/rev»). Teclado: ↓/S estando parado, o R. El botón FRENO táctil no
      se vuelve reversa. Cruzar la meta hacia atrás resta la vuelta y la deja como `deuda`; volver a cruzarla solo la
      repone, sin aviso (no se suman vueltas yendo y viniendo). Sin reversa con el motor ahogado, girando por un
      golpe, cayendo, con el dron, al terminar, en el piloto de prueba ni en los bots;
    - **⤴ Salto** (cambio `karts-salto`; decisiones en su `design.md`): acción `salto` de `KartsEntrada`; lógica pura en
      `juegos/karts-salto.js` (`window.KartsSalto`, probada en `server/karts_salto_test.ts`). Brinco de 0.4 s y 14 px
      (sombra en el piso, aplastón al caer), 0.6 s de enfriamiento al caer, giro al 35 % en el aire (salvo derrapando).
      Esquiva cáscara y bola en lo alto del brinco; no el cohete, el rayo, los bloques ni la roca. **No es `k.aire`**
      (vive en `k.brinco`, `k.brincoEnf`, `k.aplasta`): no cruza huecos ni el cenote, no salva del lodo, no acelera y no
      toca el conteo de vueltas. Derrape: `derrape || (salto && en el piso)`, así SALTO mantenido + giro al caer empieza
      el derrape. Celular: botón «⤴ SALTO» separado, columna alta a la derecha de `#m-der`. Mando: R/L (salto y
      derrape; el adaptador responde `salto` con `derrape`, `mando.js` sin cambios). Teclado: ESPACIO (salto y
      derrape). En vivo, `d[10]` = altura (0–40 px) interpolada en los demás aparatos;
    - **🎮 Control en las salas** (cambio `karts-control-sala-y-ceremonia`; decisiones en su `design.md`): la sala de
      espera de Karts muestra «🎮 Tu control» junto a «🏁 Tu piloto» (`tarjetaControl` en `juegos/app/arcade.js`, clics
      `data-p="kcontrol"`/`"kacel"`) y escribe en texto plano `localStorage.karts_control` y `karts_acelerar` (las
      claves del modo individual; no va al servidor). Al elegir 📱 Sensor pide `DeviceOrientationEvent.requestPermission`
      dentro del toque (iPhone). El iframe relee las claves en cada `inicio` (`releerControl`); en la carrera de sala el
      botón ⚙️ (`#b-control`, oculto a quien especta) abre `#panel-control` sin pausar; si el sensor no se activa sin
      toque, ese panel ofrece «📱 Activar sensor»;
    - **🏆 Ceremonia de premiación** (mismo cambio): `juegos/karts-ceremonia.js` (`window.KartsCeremonia`, probada en
      `server/karts_ceremonia_test.ts`). Podio de 3 escalones con foco y confeti; suben 3.º, 2.º y 1.º (personaje con
      `Personajes.retrato(id, 'gana')`, kart SVG con sus colores, nombre y puntos), revelación, redoble y victoria de
      `window.Emocion`, «⏭ Saltar», 7 s; con movimiento reducido, fija. Toma las filas **en el orden que ya trae el
      podio** (no calcula lugares). Copa individual: sobre los resultados de `karts.html`. Sala (carrera suelta y copa):
      `ceremoniaKarts` en `juegos/app/arcade.js`, que empieza en `cierre + 2.5 s` con la hora del servidor
      (`ahoraServidor()`), igual en todos los aparatos y para quien especta; mientras corre, `pintarFinalSala` no toca
      `Emocion.podio` ni el confeti (`sala.conCeremonia`);
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
    perfil con las poses de Axo y `retrato(id, pose, poder)`), cargado con `<script src="personajes.js?v=2">`. La
    elección vive en `localStorage.arcade_personaje` (compartida por Axo y Karts, como `arcade_sonido`; desconocida o
    sin almacenamiento → `xalli`); **el progreso del servidor no cambia de forma**. Solo cosméticos: no tocan física,
    choque, tiempos ni puntos. Axo: selector `#personajes [data-personaje]` en la portada, partícula `rastro`
    (burbujas, glifos, hojas o pétalos; ninguna con movimiento reducido). Karts: selector `#menu-piloto` en el menú,
    `spriteKart(personaje, color, num, vista, phi)` con la carrocería en los colores del personaje y los costados, el
    número y el minimapa en el color de identidad del corredor (`k.color`; el del taller para la persona); cabeza del
    piloto según la vista (`pintarCabeza`), cola de Yahui y niebla de Xochiquetzal; bots y fantasmas con los otros
    3 personajes en orden fijo; estela del personaje con turbo. En sala, ver «Personaje en las salas de Karts y Axo». El título «Axo y los 12 mundos» y el id `plataformas` se conservan (renombrar el título
    es una línea en `plataformas.html`, `juegos.html` y `server/juegos.ts`). Ganchos de prueba: `__plat.cajaJugador()`,
    `__karts.cajaYo()`, `__karts.hojaPilotos()` y `personaje`/`personajes`/`rastro`/`estela` en `estado()`;
  - **Personajes estilo karts** (cambio `personajes-estilo-karts`; decisiones en su `design.md`): Xolo (xoloitzcuintle,
    ligero), Tlali (chapulina, ligera), Tona (tortuga marina, pesada) y Kinich (jugador de pelota maya, medio); son 8 en
    `Personajes.LISTA` (en el orden del selector), cada uno con `personalidad`, `peso`, `estela` (colores de su
    partícula) y `encuadre` del retrato. **El peso solo reparte el empuje de los choques entre karts**
    (`Personajes.masa(id)`, `repartoChoque(ma, mb)` en `chocarKarts`); no cambia aceleración, velocidad, giro, tiempos
    ni puntos. El piloto de espaldas de los nuevos vive en `personajes.js` (`Personajes.piloto(id)` → `cabeza` y un
    `extra` con su profundidad: caparazón de Tona, pelota de Kinich); `spriteKart` lo consulta antes de `pintarCabeza`
    (las 4 originales siguen en `karts.html`). Sus partículas (huellitas, notas, gotas, pelotitas) las dibuja
    `Personajes.pintarParticula`, que usan Axo y Karts. Selectores en 4×2 con retrato y nombre (el título queda en
    `.solo-lector`) y una línea `#personaje-detalle` (Axo) o `#piloto-detalle` (Karts, con el peso). Con 7 rivales, cada
    uno usa uno de los 7 personajes que la persona no eligió. Gancho de prueba: `masa` en `__karts.estado()`;
  - **Personaje en las salas de Karts y Axo** (cambio `personaje-en-salas`; decisiones en su `design.md`):
    `juegos.html` carga `juegos/personajes.js?v=3` (el mismo que los iframes). En la sala de espera de `karts` y
    `plataformas`, `tarjetaPersonaje()` (`juegos/app/arcade.js`) pinta «🏁 Tu piloto» o «🦎 Tu personaje»: los 8 en
    4×2 (`.p-pers-grid`, retrato, nombre y en Karts el peso) con `data-p="personaje"`; preselecciona el del asiento o
    el de `localStorage.arcade_personaje`. Elegir guarda en el navegador (`Personajes.preferencia(id)`) y en el
    asiento (`POST /unirse { personaje }`); si el asiento aún no tiene, la página guarda una vez el del navegador al
    entrar (`sincronizarPersonaje`). La lista de jugadores muestra el de cada quien (`.p-pers`). `inicio` lleva
    `personaje` y `humanos[].personaje`: `empezarSala` de Karts y Axo lo usa (si falta, `localStorage` y luego
    Xalli) sin escribir en `localStorage`; en Karts los karts remotos arrancan con el de su asiento (y siguen el que
    manda el canal en vivo) y los fantasmas usan personajes que nadie eligió. No hay botón para cambiarlo dentro del
    iframe: se abre con la sala ya empezada y el servidor responde 409 `ya_empezo`;
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
- **Espectador** (openspec: espectador-partidas; cambios marcados `// espectador`): al no poder unirse (`sala_llena`,
  `ya_empezo`) se ofrece «👀 Ver como espectador»; también «👀 Solo ver» en 🔑 Unirme con código y el enlace
  `?sala=<código>&ver=1`. `sala.espectador` sale del GET (`espectador: true`). Guardas: `post()` de `nucleo.js` no envía
  a la sala que se especta (`espectandoSala`) ni a `/juegos/partida`; `clicEspectador` ignora los clics del juego;
  `.espectando` apaga los controles. Barra `#p-esp` con «👀 Espectador», «👀 N viendo» (`#p-viendo`, para todos) y
  🔊/🔇 (`arcade_sonido`). Podio con «🔁 Unirme a la revancha» (o seguir viendo si está llena). Juegos en vivo:
  `ESPECTAR_EN_VIVO` en `salas.js`; el transporte y el puente (`EnVivo.puente({ escucha: true })`) no envían nada y el
  iframe recibe `espectador: true`: Karts (todas las personas remotas, cámara del líder o ◀ ▶ 👑, sin entrada,
  ítems ni `meta`), Fútbol (rol `espectador`), Arena (invitado sin robot) y Brigada (invitado sin entrada que sigue la
  cámara compartida). Para un juego en vivo nuevo: agregar su id a `ESPECTAR_EN_VIVO` y a `ESPECTADOR_EN_VIVO`
  (servidor) y atender `espectador: true` en su iframe con `EnVivo.conectar({ escucha: true })`.
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
| `salas.js` | partidas multijugador: semilla (`rngDe`), `sala`, Realtime (y transporte del juego en vivo), espera, preguntas, Basta por rondas, podio, revancha, crear/unirse/reanudar y compartir |
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
Turbo (`karts.html`, cambio `karts-mando`), ⛳ Golf (`golf.html`, cambio `golf`), Futbolito y Billar (cambio `futbolito-equipos-controles`), ⚽ Fútbol Estelar (`futbol.html`, cambio `futbol-estelar`), ⚽ Futbolito Arena (`futbolito-arena.html`, cambio `futbolito-arena`) y 🦎 Brigada Xalli (`brigada.html`, cambio `brigada-xalli`), **sin cambiar la API**. Si hace falta algo nuevo, se
agrega como opción con valor por omisión compatible, en su propio cambio OpenSpec.

**Cargar y crear** (dentro del iframe del juego; `window.Mando`):

```html
<script src="mando.js?v=2"></script>
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
  - Futbolito y Billar (cambio `futbolito-equipos-controles`): adaptador a su capa de acciones (`MesaUI.crearAcciones`)
    con `al`/`alSoltar` y `MesaUI.ejeDeMando`; sin teclas; activo en juego, pausa y sala con cualquier control; se ve
    con «🎮 Mando clásico» (`futbolito_control` / `billar_control`). Futbolito: `mover` = las 4 flechas (el juego
    proyecta `eje()` sobre la barra), A patea, B/R siguiente barra, L anterior, X/Y fuerza en sala, START pausa.
    Billar: ◀ ▶ apuntan (solo por `eje().x`), L/R fino, A tira, X/▲ y Y/▼ fuerza, B efecto, START menú. En horizontal,
    START va arriba a la derecha (`.mando .mando-centro`) para no tapar la mesa.
- **Pruebas:** lógica pura en `server/mando_test.ts` (Deno); E2E `tests/e2e/e2e-mando.js` (toques reales por CDP,
  teclado, control simulado con `navigator.getGamepads` en `addInitScript`, preferencia y capturas), para Karts,
  `tests/e2e/e2e-karts.js` (`probarMando`), y para Golf, `tests/e2e/e2e-golf.js` (cruceta, X, R y A con el dedo y la
  preferencia recordada).

## Emoción sonora (cambio `emocion-sonora`)

Fuente única de los sonidos de emoción de Juegos: `juegos/emocion.js` (script clásico sin dependencias, sin archivos
de audio: todo se sintetiza con WebAudio). Publica `window.Emocion`. Decisiones, síntesis y la tabla de dónde se usa
cada stinger: `openspec/changes/emocion-sonora/design.md` (al archivar, `openspec/changes/archive/*-emocion-sonora/`).

**Cargar:** en `juegos.html` ya va (`juegos/emocion.js?v=N`); en un juego de Arcade (iframe), después de sus scripts
compartidos: `<script src="emocion.js?v=N"></script>`. Llamar siempre con `window.Emocion?.` para no depender del
orden de carga.

**Stingers** (cada uno devuelve `true` solo si sonó): `gol()` (tribuna + fanfarria + «¡Goool!»; `gol({ voz: false })`
sin voz), `victoria()`, `derrota()` (amable), `record()`, `nivelSuperado()`, `logro()`, `cuentaRegresiva(n)` y
`cuenta(k)` (un paso: `k > 0` bip, `0` ¡YA!), `ultimoSegundos(n)`, `suspenso(ms)`, `revelacion()`, `acierto()`,
`error()`, `racha(n)`, `silbato()`, `campana()`, `canto()`, `revancha()` y `podio(lugar)` (redoble, revelación y
victoria/logro/derrota según el lugar; `0` = solo la revelación).

**Tensión:** `intensidad(x)` con `x` de 0 a 1 (latido más rápido y fuerte); `intensidad(0)` la apaga y se apaga sola
a los 60 s sin otra llamada o con la pestaña oculta. Se puede llamar en cada cuadro (solo se anota si cambia).
`calma()` apaga la tensión y desvanece lo que suena; el hub la llama en `limpiar()` al salir de cualquier juego.

**Reglas para un juego nuevo:**
- Úsalo solo en momentos que cambian el ánimo (anotar, ganar, perder, el último tramo, una revelación), nunca en
  acciones repetitivas (cada salto o moneda): para eso sigue el `tono()` del juego.
- Si el juego ya tiene un jingle para ese momento, sustitúyelo y deja el clásico de respaldo:
  `if (!window.Emocion?.nivelSuperado()) S.meta();` (con «Efectos de emoción: No» vuelve el sonido de siempre).
- Sube la tensión al entrar al tramo difícil y bájala (`intensidad(0)`) al terminarlo, al morir, al pausar y al
  salir; en una partida (sala) deja la victoria al podio de Juegos (`pintarFinalSala` ya llama `podio(lugar)`).
- No agregues controles de sonido: `Emocion` respeta `localStorage.arcade_sonido === '0'` (🔊 de Arcade, compartido
  entre el hub y los iframes del mismo origen), `localStorage.juegos_emocion === '0'` («🎉 Efectos de emoción» del
  menú de música) y el volumen `juegos_pref.volumen`. Si el juego tiene un 🔊 propio que no se guarda, llama
  `Emocion.silencio(muted)` (como Dragon Run).
- Solo suena tras un gesto (política de reproducción automática) y sin `AudioContext` no hace nada ni lanza errores.
- Los stingers grandes bajan solos la música de fondo del hub (`bajarMusica`), también desde un iframe.

**Pruebas:** `Emocion.eventos()` devuelve los últimos 200 `{ ev, t, sono, motivo, args }` (motivo: `silencio`,
`sin-gesto`, `repetido`, `sin-audio`) y la página recibe el evento DOM `emocion`. Unitarias en `server/emocion_test.ts`
(AudioContext falso); E2E en `tests/e2e/e2e-emocion.js` (eventos por juego, silencio, sin AudioContext, autoplay y
muestras WAV en `tests/e2e/salida/emocion/`). Ojo: `page.evaluate` de Playwright cuenta como gesto del usuario.

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
  - `#pf-urgente`: lo atrasado y lo de hoy, de su ruta propia (🎓 Mis clases) y del grupo (👥), con el `accionItem`
    de siempre;
  - pestañas: Esta semana, Plan del mes, Mi grupo y Hechas. Sin `plan` (cambio `profe-semanas-del-grupo`) no hay
    pestaña Plan del mes ni barra de la ruta del mes, y una pestaña guardada que no existe cae a Esta semana.
    El título es `🎓 <plan.titulo>` si hay plan y «🎓 Mi ruta de Inglés» si no (cambio `profe-grupo-y-ruta-ia`).
  - Esta semana (`renderSemanasProfe`): con ruta propia, dos bloques que no se ocultan entre sí: `#pf-sem-propia`
    («🎓 Mis clases · <plan.titulo>», `semanaPropia` y los elementos sin `grupo`) y `#pf-sem-grupo` («👥 Inglés con el
    grupo», `semana` y los elementos `grupo: true`). Cada uno usa `renderWeekCard(act, prefijo)` con prefijo de ids
    (`propia-`, `grupo-`). Sin ruta propia, solo lo del grupo, como antes.
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
- Juego en vivo (cambio `juegos-en-vivo`): `juegos/en-vivo.js` (`window.EnVivo`, script clásico) manda mensajes de
  navegador a navegador por el mismo topic con el evento `vivo` (sin tocar Supabase: canal público y llave publicable).
  El contrato (`EnVivo.conectar` → `enviar`, `al`, `presencia`, `latencia`, `alDesconectar`, `cerrar`; `EnVivo.simulado`
  para pruebas) está en el encabezado del archivo y en el `design.md` del cambio:
  - `prepararVivo` (en `salas.js`) arma `sala.vivoTr`: el **mismo** canal de `conectarRealtime` (un solo socket) con
    `.on('broadcast', { event: 'vivo' })`, o el doble de prueba con `?vivoSimulado=1` + `window.__vivoSimulado`;
  - el iframe habla con él por el puente `EnVivo.transporteMarco(juego)` ↔ `EnVivo.puente(...)`, que solo deja pasar
    mensajes de ids que están en la sala;
  - por el canal solo viajan el id de la sala y números; el nombre que se pinta sale de la sala;
  - **Karts** (`pintarArcadeSala` → `inicio` con `yo`, `humanos` y `vivo`): cada kart a 15 Hz con ≤ 4 personas y 10 Hz
    con 5–8 (2 Hz antes de salir), `[x·10, y·10, ángulo·1000, vel, vuelta, avance, banderas, término, personaje, carrera de la copa,
    altura]` (`d[10]`, cambio `karts-salto`: brinco o rampa en px, interpolada; sin ella, 0);
    los remotos se interpolan 100 ms atrás (extrapolación ≤ 250 ms), con color y número por su lugar en la sala,
    nombre encima, minimapa y clasificación en vivo (`#vivo-tabla`); empuje local en los choques; quien calla 3 s se
    desvanece con aviso; sin canal en 5 s, aviso y fantasmas como antes;
  - **Ítems entre personas en Karts** (cambio `karts-objetos-en-sala`; decisiones en su `design.md`): regla «la
    víctima decide». La parte pura (tablas por lugar `solo`/`vivo`/`respaldo`, codificación, registro anti-abuso,
    simulación con paso fijo de 1/60 s, choque, historial del avance para el rayo y gracia) vive en
    `juegos/karts-objetos.js` (`window.KartsObjetos`, lo carga `karts.html`; pruebas en `server/karts_objetos_test.ts`).
    Eventos sueltos (ritmo 0, `enviarYa`, cada uno dos veces): `item` =
    `[n, tipo, x·10, y·10, ángulo·1000, vel, vuelta, idx, tc, avance, blanco, carrera]` (id = `dueño:n`; `tc` = ms de
    la carrera con el reloj común; `blanco` = lugar en la sala o −1) e `item-golpe` = `[n, lugar del dueño, carrera]`.
    Cada aparato revisa los golpes solo contra su kart; se descartan repetidos, números viejos, eventos de más de 4 s y
    más de 1 ítem por segundo por persona; tras un golpe hay 4 s de gracia (el peor caso cabe en el límite de la pista).
    Sin canal, la tabla reducida (monedas, turbo y estrella); los fantasmas no reciben ítems.

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
    componentes), `material.js` (material de estudio), `reproductor.js`, `presentacion.js`, `admin.js` (grupos, registro de alumnos y alumnas, juegos; el registro va en su propia opción «➕ Registro», separado del avance en «Alumnos»; ahí cada persona activa tiene «🚪 Baja de Inglés» con `confirm` que avisa que sus resultados se conservan como historial, y «🗂️ De baja de Inglés» lista las bajas con «↩️ Reactivar»; los conteos de la lista y de los grupos son solo de activos, cambio `ingles-baja-alumno`), `tablero.js`
    (vista del admin por secciones, mapa de calor y cajón), `alumno.js`, `profe.js` y `app.js` (sesión, ruteo y
    eventos; si `GET /ingles/data` trae `baja: true`, `mostrarBaja()` pinta «Ya no estás en Inglés en línea» con enlace
    a `ingles.html?modo=secundaria` y a Juegos, sin cerrar la sesión). No son módulos ES: comparten el ámbito global, así que un nombre de nivel superior no se puede repetir
    entre archivos.
- **Modo oscuro.** Sigue a `prefers-color-scheme` salvo que `<html data-theme="light|dark">` lo fije. La preferencia
  se guarda en `localStorage.stald_tema` (`auto`, `claro` u `oscuro`; preferencia de interfaz sin datos personales) y se
  aplica en un `<script>` del `<head>` para no parpadear. Se cambia con 🌓 en el encabezado o en 👤 Perfil.
- **Diagramas de la teoría** (cambio `teoria-diagramas`). `renderDiagrama()` (`comun.js`) pinta `teoria[].diagrama`
  dentro de `renderTeoria()` y en la diapositiva `teoria` (`presentacion.js`). Solo HTML + CSS (`.dg-*` en
  `ingles.css`, medidas en `em`): `.dg` es un *container query*, así que flujo y ciclo van en fila según el ancho de la
  caja (no de la ventana) y en columna en celular; en `.slide` toma la paleta de la diapositiva. Colores solo con
  tokens del tema. Formato: [data-model.md](data-model.md) § `teoria[].diagrama`.
- **Navegación.** Catálogo único `SECCIONES` (`id`, `emoji`, `titulo`, `encabezado`, `rol`, `href`, `accion`, `barra`);
  de ahí salen la barra, el menú y el `<h2>` de cada sección (`seccionHtml`).
- **Material de estudio** (cambio `ingles-material-estudio`). `ingles/material.js` (va después de `comun.js`) lee el
  catálogo público `ingles/material/indice.json` una vez al cargar y rellena cada marcador `[data-material]`
  (`renderMaterial()`). Lo usan la sección `#material` (alumnos y alumnas en la barra; admin en el menú o «☰ Más»),
  la pestaña «📚 Material» de la ruta del profe y `#material-publico`, bajo la entrada sin sesión (no en Secundaria;
  el material es público). Los PDF se enlazan relativos al catálogo, así funcionan igual en Pages y en local. El
  portal tiene el atajo `#material-link` → `ingles.html#material`. Formato del catálogo y cómo agregar una guía:
  [data-model.md](data-model.md) § «Material de estudio en PDF».
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

## Clases de Secundaria (cambios `secundaria-mis-clases` y `secundaria-dashboard`)

- `secundaria.html` es el puente a `ingles.html?modo=secundaria`; conserva la query (`?api=`, `?alumna=`) y el `#hash`.
- **Archivos:**
  - `ingles/secundaria.js`: carga, pestañas, «Esta semana» y «Mi horario»;
  - `ingles/secundaria-inicio.js`: Inicio y Mis materias;
  - `ingles/secundaria.css`;
  - reglas puras en `comun/secundaria-datos.js` (`SecundariaDatos`), que reusa `comun/gamificacion.js`; las prueba
    `server/secundaria_tablero_test.ts`.
- **Fuentes:** Inter y Orbitron de Google Fonts se inyectan solo en modo Secundaria (excepción de CDN, ver el
  `design.md` del cambio); si no cargan, queda la fuente del sistema.
- Título «📚 Clases de Secundaria». Pestañas `role="tab"` (`.sec-tabs [data-sec-tab]`, ← → Inicio Fin), sin redibujar:
  - **«🏠 Inicio»** (`#sec-inicio`, la primera; estilo «RPG educativo»):
    - barra `#rpg-stats`: nivel y rango (`#rpg-rango`), XP del nivel (`#rpg-xp` y `.rpg-xp-barra` con
      `role="progressbar"`), insignias (`#rpg-insignias`) y racha (`#rpg-racha`);
    - `#rpg-mision`: «Hola, <nombre>» (`.sec-hola`, de `/perfil`), fecha (`.sec-fecha`, «Martes 27 de octubre», del
      `hoy` del servidor) y «⚔️ Misión principal activa» (la primera clase de hoy sin hacer o la próxima) con
      `#rpg-mision-btn`;
    - «⚡ Retos diarios · Hoy te toca» (`#sec-hoy-te-toca`, contador `#rpg-retos` y `#rpg-retos-texto`): una tarjeta
      `.sec-tarjeta[data-sec-card][data-estado]` por clase con chip de materia (emoji y color), estado, tema, mundo,
      XP (`.rpg-xp-chip`) y botón `.sec-btn-grande`. Sin clases: `#sec-hoy-vacio` «Hoy no tienes clases 🎉» y la
      próxima;
    - indicadores `#sec-progreso` (anillo, x de y), `#sec-racha` y `#sec-mundos`;
    - `#sec-actividad`, `#sec-promedios` (`[data-sec-prom]`, con el general), `#sec-insignias`
      (`[data-insignia].ganada`) y accesos `.sec-accesos [data-sec-tab]`.
  - **«📅 Esta semana»** (`#sec-clases`, hash `#semana`): «☀️ Hoy» (`#sec-hoy`), «📅 Esta semana» (`#sec-semana`, un
    bloque `data-sec-dia` por día) y «📝 Otras clases y exámenes» (`#sec-otras`). Cada fila `data-sec-item` lleva chip
    y borde de color.
  - **«🗓️ Mi horario»** (`#sec-horario`): 7 días (`data-sec-hor-dia`); 7 columnas desde 760 px y lista por día debajo.
  - **«📚 Mis materias»** (`#sec-materias`): `[data-sec-materia]` por materia (las 8 y «Otras clases» si hay). Cada
    una trae hechas/total, promedio, último tema, camino de mundos (`li[data-mundo]`, clase `mundo-<estado>`; el
    actual con `aria-current="step"` y «ahora»), los temas de Inglés y la nota de su secuencia.
  - **«📝 Resultados»** (solo admin): por clase, cada persona con su mejor calificación (`[data-sec-admin]`).
- **Estado de la tarjeta** (`SecundariaDatos.estadoClase`):

  | Estado | Cuándo | Botón |
  |---|---|---|
  | Hecha | `completo` o `en-espera`, con su calificación | «Ver resultado» |
  | En curso | `en-curso` | «Continuar» |
  | Pendiente / Vence hoy / Vence mañana / Atrasada | `disponible`, según la fecha límite | «Empezar» |
  | Todavía no abre | `proximamente` | deshabilitado |

  - «Hoy te toca» = lo de días anteriores que vence hoy y sigue sin hacer, más las clases de hoy.
  - Progreso = clases hechas (con al menos un envío) entre las de lunes a domingo.
  - Racha = la del servidor.
  - Promedio = media de `mejor.porcentaje`.
- **Día de la clase:** su `dia` si lo trae (clase abierta antes para adelantar; cambio `secundaria-adelantar`). Si
  no, `disponibleDesde` si vence ese día o el siguiente; si tiene ventana, `fechaLimite`. Aplica a todas las vistas y
  al portal. Las clases de semanas futuras que ya abrieron salen en «📝 Otras clases y exámenes» y cuentan en el total
  de su materia en «📚 Mis materias».
- **Hash:** `#inicio`, `#semana`, `#horario`, `#materias` y `#resultados` (`history.replaceState`). Al volver de una
  clase queda la misma pestaña; al cargar con `#ver/<id>`, «📅 Esta semana».
- **Admin:** pide la lista (resultados y `alumnas`) y la vista `?alumna=<slug>` (la de la URL o la primera). El
  selector `#sec-alumna` recarga. El tablero es de solo lectura: «👀 Vista previa» en lugar de Empezar/Continuar.
- **Botones reales** (`ingles/secundaria.css`, solo `body.secundaria`): «← Inicio» y «🎮 Juegos» (`.home-link`),
  «Cerrar sesión», pestañas, accesos y botones de clase con fondo, borde, padding, hover, foco visible
  (`outline` de 3 px), estado deshabilitado y 44 px o más (los grandes, 52 px).
- **Materia:** `materia` del listado o, si falta, el prefijo del título antes de « · » sin el emoji (`materiaDe` de
  `comun/gamificacion.js`). Se usa el nombre canónico si contiene una de las 8 materias como palabra completa
  («Partes» no es «Artes»).
  - El color sale de `mat-<clave>` (`ingles`, `espanol`, `matematicas`, `ciencias`, `sociales`, `tecnologia`,
    `artes`, `edfisica`, `otra`), que fija `--mat` y `--mat-soft` en `estilos/materias.css` (compartido con el portal;
    claro y oscuro).
  - El chip siempre lleva el nombre.
- **Tokens del estilo RPG:** `--rpg-*` en `ingles/secundaria.css`, redefinidos para el modo oscuro. Sin Tailwind ni
  íconos externos.

### Portal: «🗓️ Mi horario» (cambio `secundaria-dashboard`)

- `index.html` carga `estilos/materias.css`, `comun/gamificacion.js` y `comun/secundaria-datos.js`.
- Con `accesos.secundaria`, `pintarSecundaria(p)` pide `/secundaria/actividades`. El admin pide además
  `?alumna=<primera>`.
- Pinta `#sec-portal`:
  - `#sec-hoy-toca`: «Hoy te toca» con chips de materia, o «Hoy no tienes clases 🎉»;
  - `ol.sec-mini`: 7 días `[data-sec-mini]` con el emoji de cada materia (`role="img"` y su nombre); hoy con
    `aria-current="date"`;
  - los botones `#sec-portal-clases` («📚 Mis clases») y `#sec-portal-horario` («🗓️ Mi horario»,
    `secundaria.html#horario`), de 44 px o más.
- Si falla, aparece un aviso corto con el botón a Secundaria. Sin Secundaria, el bloque queda `hidden`.

## Clase interactiva de Secundaria (cambio `secundaria-sin-notion`)

- `ingles/secundaria-clase.js` (archivo propio para no mezclarse con la vista de lista): en modo Secundaria,
  `openItem` (`ingles/reproductor.js`) arma la clase con `vistaClaseSecundaria(it, cabecera, form)`; Inglés no cambia.
- Indicador de pasos `nav.sec-pasos` (pegajoso arriba): «1 Teoría → 2 Video → 3 Ejercicios → 4 Libreta», botones
  `data-sec-paso` de ≥ 44 px que llevan a `#sec-paso-<id>`; el paso visible lleva `aria-current="step"`
  (IntersectionObserver). Un paso sin contenido queda `disabled`.
- Videos: los `tips` `video` de YouTube (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`; `idYouTube`) se
  incrustan con `https://www.youtube-nocookie.com/embed/<id>`, `loading="lazy"`, `title` y enlace «Abrir en YouTube ↗»;
  marco 16:9 (`aspect-ratio`). Otros videos y lecturas van como botones-enlace (`.sec-enlaces`).
- Libreta: tareas `libreta` con la casilla «✅ Ya la hice» (`data-sec-libreta`), guardada en
  `localStorage['stald_libreta:<hash FNV-1a del correo>:<id>']` con try/catch (sin almacenamiento no se recuerda).
- Resultado: «🎉 ¡Misión cumplida!», calificación y retroalimentación por tema (`renderResultado`), la recompensa, la
  libreta y el botón grande «Siguiente misión» (`.sec-siguiente`: la siguiente `disponible`/`en-curso` por fecha desde
  hoy; si no hay, «🗺️ Mis misiones»). Vista previa del admin: sin estos extras.
- Estilo «RPG educativo»: en Secundaria la clase se llama **«Misión»** (banner «⚔️ Misión» con chip de materia y su
  **mundo** actual, «🎉 ¡Misión cumplida!», «Siguiente misión →» / «🗺️ Mis misiones»). En el resultado,
  `#sec-recompensa` muestra «+N XP» (XP total después − antes del envío; `submitExam` guarda `state.actAntes =
  { id, act }`, que se consume una sola vez y solo para esa misión: ver un resultado pasado no la repite), nivel y
  rango con su barra, y las insignias desbloqueadas. **Todas las reglas** (XP, nivel, rango, mundos, insignias) salen
  de `comun/gamificacion.js` (`Gamificacion.mundoDe`, `xpTotal`, `nivelDe`, `insigniaNueva`); `secundaria-clase.js`
  no tiene fórmulas y, si `Gamificacion` no está cargado, omite el mundo y la recompensa.

## Gamificación (cambio `gamificacion-nucleo`)

Fuente única de las reglas; el código está en `comun/gamificacion.js` (script clásico, `globalThis.Gamificacion`, sin
DOM ni peticiones; lo prueba `server/gamificacion_test.ts`). Todo se calcula en el aparato con lo que ya devuelve el
servidor y **nada se guarda**. Lo usan el tablero de Secundaria y la pantalla de resultado de la clase; después, Inglés.

- **XP de una clase** (`xpDeClase(item, calificacion, opciones?)`): solo el mejor intento. Porcentaje de aciertos en el
  que cada acierto de un tema cuyo título empieza con 🎯 (mini examen) cuenta doble
  (`round(100 × (correctas + correctas🎯) / total)`, puede pasar de 100), **+ 20** si llegó a tiempo. Usa de
  `calificacion` `correctas`, `total` y `secciones[].titulo|correctas` (o, sin `total`, `porcentaje`). «A tiempo», en orden: `opciones.aTiempo`,
  `calificacion.aTiempo`, `item.mejorATiempo` (del listado) y, si nada viene, `opciones.hoy <= item.fechaLimite`; sin
  dato, sin bonus. La respuesta del envío trae `aTiempo`/`mejorATiempo`. La pantalla de resultado de Secundaria
  (`ingles/secundaria-clase.js`) muestra como «+N XP» la diferencia de `xpTotal` entre la lista de antes y la de
  después del envío (que ya trae `mejorATiempo`), así solo cuenta lo que ese envío mejoró.
- **XP total** (`xpTotal(items)`): suma de las clases hechas (con al menos un envío).
- **Nivel** (`nivelDe(xp, genero?)`): `floor(XP / 300) + 1`; devuelve `xpNivel` (XP dentro del nivel, 0–299),
  `xpSiguiente` (XP total del siguiente nivel) y `porcentaje` del nivel. Rangos: 1–3 Aprendiz, 4–6
  Exploradora/Explorador, 7–9 Sabia/Sabio, 10+ Gran Sabia/Gran Sabio. Lenguaje inclusivo: el registro no guarda
  género, así que se muestran las dos formas; con `genero` `'f'` o `'m'`, solo la suya.
- **Racha:** la del servidor (`racha.dias`, días seguidos hasta hoy o ayer con al menos un envío).
- **Insignias** (`insigniasDe({ items, hoy, racha })`, `insigniaNueva(antes, despues)`): Primera misión, Racha de 3 / 7
  / 14 (racha actual), 100 % en una clase, Mini examen superado (≥ 80 % en un tema 🎯) y Mundo completado.
- **Mundos** (`mundoDe(materia, hoy?)`, `mapaMundos(items, hoy)`), con las fechas de la skill `clases-secundaria`
  (si cambian ahí, se cambian en `MUNDOS`). Derivadas, porque la skill da duraciones: Química y Física (3 meses cada
  una tras Biología). Tecnología: la skill pone «Programación e IA» en el mismo tramo, así que sus dos mundos comparten
  fechas. Ciencias Sociales rota: desde febrero de 2027, un mundo por mes calendario (Ágora → Puerta del Tiempo →
  Atlas del Mundo → …):

  | Materia | Mundos (bloque) |
  |---|---|
  | Matemáticas | 🔢 Valle de los Números (Aritmética, 26 oct–22 nov 2026) → 🏙️ Ciudad de las Formas (Geometría, 23 nov–20 dic) → 🗼 Torre de las Incógnitas (Álgebra, desde ene 2027) |
  | Ciencias | 🌿 Selva de la Vida (Biología, oct 2026–ene 2027) → ⚗️ Laboratorio Alquimia (Química, feb–abr 2027, derivada) → 🏔️ Cumbre de la Fuerza (Física, may–jul 2027, derivada) |
  | Ciencias Sociales | 🏛️ Ágora (Cívica y Ética, 26 oct–22 nov) → ⏳ Puerta del Tiempo (Historia, 23 nov–20 dic) → 🗺️ Atlas del Mundo (Geografía, ene 2027) → rota cada mes |
  | Tecnología | 🛠️ Taller Digital (Bases, 26 oct–6 dic) → 🌀 Laberinto Sintaxis y 🤖 Núcleo IA (Programación e IA, desde el 7 dic) |
  | Inglés | 🏝️ Isla del Alfabeto (bloque actual) |
  | Español | 📚 Gran Biblioteca |
  | Artes / Ed. Física | 🎨 Estudio y Arena |

  Estado: «completado» (terminó su fecha y todas sus clases, al menos una, están hechas), «en-curso» (el actual, o uno
  que terminó con clases pendientes) o «bloqueado» (aún no empieza).
  `mundoDe` da el actual; en vacaciones, el último que empezó; antes del primero, el primero.
- **Retos diarios** (`retosDiarios(items, hoy)`): las clases cuyo día es hoy, con `xp` (hechas) o `xpPosible` (120),
  `faltan` y `xpHoy`. **Actividad reciente** (`actividadReciente(items, n)`): por `ultimoEnvio`, con porcentaje y XP.
- Día de la clase (`diaDeClase`): su `dia` si viene (cambio `secundaria-adelantar`: la clase abre antes y sigue en
  su día del horario, sin contar como atrasada ni «de hoy» antes de ese día). Sin `dia`: `disponibleDesde` si dura
  un día (vence ese día o el siguiente); con ventana más larga, su `fechaLimite`. Hecha (`estaHecha`): al menos un envío.

## Misiones principales en Secundaria (cambio `rpg-fase2-misiones`)

`ingles/secundaria-misiones.js` dibuja; las reglas viven solo en `comun/gamificacion.js` (funciones aditivas de la Fase
2a; las de la Fase 1 no cambian y las fijan los 10 casos de `server/gamificacion_regresion_test.ts`):

- **XP de misión** (`xpDeMision`): porcentaje de la rúbrica × 3 + 60 si el último paso llegó a tiempo; 0 sin evaluar.
  `xpTotalConMisiones(items, misiones)` suma clases + misiones en el mismo total del nivel (Inicio y recompensa).
- **Mapa** (`mapaRpg(items, hoy, { catalogo, misiones })`): mundos del catálogo (o de la Fase 1 si no hay), zonas de 2
  semanas y capítulos; estados bloqueado, en curso, completado (terminó y su misión está evaluada; sin misión, todas
  sus clases hechas) y dominado (además promedio ≥ 80 % y misión ≥ 80 %). Un mundo pasado se puede repasar.
- **Misiones del día y de la semana** (`misionDiaria`, `misionesSemanales`): sin XP; dan progreso e insignias
  (`INSIGNIAS_RPG`: Semana completa, Misión principal, Constructora de mundos; van aparte de `INSIGNIAS`).
- **Árbol** (`arbolHabilidades`): nodos = temas (`temas` del listado), por mundo; estado del último intento
  (`ultimoTemas`): no visto (bloqueado si no abre), en progreso, a reforzar (con «🔧 Reforzar»: su repaso o la clase) y
  dominado.

Vistas (pestañas en filas de 4 en teléfono): «⚔️ Misiones» (lista; detalle con consigna, teoría con práctica, pasos,
cuadro de texto con el recordatorio «🔒 Sin nombres reales, direcciones ni datos de contacto», contador `n / 4000`,
borrador local por paso y rúbrica), «🗺️ Mapa», «🌳 Árbol» y, solo admin, «📥 Entregas» (rúbrica con radios por
criterio y total en vivo, comentario, pedir corrección con casilla de privacidad, borrar contenido). En el Inicio:
tarjeta de la misión principal, misiones de hoy y de la semana y, una sola vez por evaluación (en `localStorage`),
el aviso «+N XP» y «¡Subiste a nivel N!». Sin sonido; `prefers-reduced-motion` quita la transición de las barras; claro
y oscuro con los tokens RPG; 360 px sin scroll horizontal (E2E `e2e-misiones`).
