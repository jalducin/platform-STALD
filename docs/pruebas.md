# Pruebas

Cómo correr las pruebas del proyecto, qué cubren y qué cuidar. Cambio de origen: `openspec/changes/pruebas-en-repo`.

| Tipo | Dónde | Quién las corre |
|---|---|---|
| Unitarias del servidor | `server/*_test.ts` | GitHub Actions en cada push a `main` y en cada PR (`.github/workflows/pruebas.yml`), y tú en local |
| E2E (navegador) | `tests/e2e/e2e-*.js` | Solo en local, con `tests/e2e/correr.sh` |
| Análisis de calidad (reglas tipo SonarQube) | `tests/calidad/` | En local, con `npm run calidad` (ver [Análisis de calidad](#análisis-de-calidad)) |

## Unitarias (Deno)

```bash
deno test -A server/          # o: npx -y deno test -A server/
deno check server/main.ts
deno lint server/
```

- No necesitan llaves ni red propia: usan dobles (`server/test_datos.ts`, `server/test_postgrest.ts`).
- 6 pruebas de `server/actividades_test.ts` se **omiten** si no hay `DATA_DIR`; para correrlas, apunta a una
  **copia** del repo privado de datos: `DATA_DIR=<copia> deno test -A server/`. `correr.sh` las corre solo como la
  prueba `actividades-datos` (cambio `pruebas-fecha-fija`), así que no se quedan sin revisar.
- El workflow **Pruebas** corre los tres comandos; si uno falla, el check del PR queda en rojo.

## E2E (Node + Playwright)

### Por qué no corren en CI
Necesitan una copia del **repo privado de datos** (contenido de las semanas, exámenes y resultados de alumnos y
alumnas) y el repo es público: esos datos no deben viajar a un runner. Además levantan dos servidores y Chromium.
Córrelas en local antes de abrir un PR que toque páginas o servidor.

### Preparar (una vez)

```bash
cd tests/e2e
npm install                     # instala playwright (devDependency)
npx playwright install chromium # o exporta CHROME=<ruta a chrome.exe / chromium> para usar uno ya instalado
```

Requisitos: Node, Deno (o `npx -y deno`), Python 3 (sirve los estáticos), curl y bash (Git Bash en Windows).

### Correr

```bash
bash tests/e2e/correr.sh --datos <copia local del repo privado de datos>             # todas
bash tests/e2e/correr.sh --datos <ruta> login portal juegos poker                     # algunas
bash tests/e2e/correr.sh --lista                                                      # pruebas y su fase
bash tests/e2e/correr.sh --datos <ruta> --puerto-api 8817 --puerto-web 8795           # puertos (por omisión)
bash tests/e2e/correr.sh --datos <ruta> --transicion-terminada poker                  # como tras el fin de la transición del login
bash tests/e2e/correr.sh --datos <ruta> --hoy 2026-10-11 ruta-profe                  # otro «hoy» del servidor (o --hoy real)
```

Qué hace `correr.sh`:
1. Valida argumentos y que los puertos estén libres (no mata procesos ajenos).
2. Copia `--datos` a una carpeta temporal, sin `.git`, y borra los `profe.json` de resultados y los resultados del
   examen 2026-10-02 (las pruebas parten de cero). También borra `contenido/profe`: la ruta propia del profe sale solo
   de la ruta de ejemplo de `tests/fixtures/datos/contenido/profe/` (8 semanas coherentes con 2026-10-04: 3 publicadas,
   con una semana futura ya abierta y un resultado de ejemplo, y 5 sin publicar; entre todas tienen clases en los 9
   mundos de la ruta), para que `ruta-profe`, `profe-diseno` e `ingles-diseno-profe` no dependan de la ruta real ni
   del orden (cambios `fix-e2e-rpg` y `navegacion-mejoras`). **La carpeta original nunca se modifica.**
3. Levanta el servidor (`server/main.ts`) con `DATA_DIR=<copia>`, `ROWS_FIXTURE=tests/fixtures/rows-fixture.json`,
   `SUPER_ADMIN_EMAIL=admin@example.com`, `PERMITIR_HOY=1` y `HOY_FIJO=2026-10-04` (el día con el que se escribieron
   las E2E, para que no dependan del calendario; `--hoy` lo cambia), sin Notion ni GitHub, y los estáticos con
   un `http.server` de Python con cola de 128 conexiones (con la de omisión, 5, Windows rechazaba conexiones cuando 4
   páginas abrían a la vez y faltaban scripts en `revancha`). `HOY_FIJO` solo tiene efecto con `ROWS_FIXTURE`, nunca en producción.
   `rows-fixture.json` solo trae Secundaria y las cuentas de Supabase Auth: Inglés ya no lee Notion (cambio
   `cierre-tecnico`, fase 2). Antes de arrancar, superpone `tests/fixtures/datos/` (contenido de ejemplo) sobre la
   copia y **combina** `tests/fixtures/alumnos-ejemplo.json` (Marisol, Angel, Jesus, Laura y Fernando,
   `@example.com`) con su `alumnos.json`: agrega solo los correos que falten, sin pisar ni borrar los de la copia.
4. Corre las pruebas por **fase** (ver `--lista`); reinicia datos y servidor cuando la fase cambia.
5. Imprime `PASS`/`FAIL`/`OMIT` por prueba y el total; sale con 1 si alguna falla.
6. Siempre (también con error o Ctrl+C) apaga los servidores, vacía `stald_test_*` si usó `--pg` y borra la copia.

Todo lo que producen (`<prueba>.out`, capturas `.png`, `servidor-*.log`, `resumen.txt`) queda en
`tests/e2e/salida/`, ignorada por git.

### Postgres de prueba (`--pg`)
Las pruebas de Inglés pueden correr contra las tablas `stald_test_*` (mismo esquema que `stald_*`, ver
`supabase/migrations/` y [data-model.md](data-model.md)). `grupos`, `ocultar-grupos` e `ingles-pro` **solo**
corren así; sin `--pg` salen como `OMIT`.

```bash
export SUPABASE_URL=https://<proyecto>.supabase.co
export SUPABASE_SERVICE_KEY=$(supabase projects api-keys --project-ref <proyecto> -o json | python -c "import json,sys;print([x['api_key'] for x in json.load(sys.stdin) if x['name']=='service_role'][0])")
bash tests/e2e/correr.sh --datos <ruta> --pg
```

- Sin llaves (cambio `ingles-ocultar-grupos`): `tests/e2e/lib/postgrest-falso.ts` sirve en memoria un PostgREST
  falso (el de `server/test_postgrest.ts`, con los defaults de las migraciones) que solo acepta `stald_test_*`:

  ```bash
  deno run -A tests/e2e/lib/postgrest-falso.ts 8943 &
  SUPABASE_URL=http://127.0.0.1:8943 SUPABASE_SERVICE_KEY=falsa bash tests/e2e/correr.sh --datos <ruta> --pg
  ```

  Si cambias `server/test_postgrest.ts`, reinicia el proceso (carga el código al arrancar).
- La llave vive **solo** en el entorno del proceso; nunca en archivos ni en el repo.
- `correr.sh --pg` fuerza `STALD_TABLAS=stald_test_` y se niega si recibe otro prefijo: **nunca** toca `stald_*`.
- `stald_test_*` es **compartida** por todo el que pruebe contra ese proyecto: no corras dos baterías `--pg` a la
  vez. Si al empezar las tablas ya tienen filas, `correr.sh` se detiene sin tocarlas (otra corrida podría estar
  en curso); si sabes que son restos de una corrida cortada, repite con `--pg-vaciar`.
- Antes de cada fase de Inglés vacía `stald_test_*`, migra la copia con `herramientas/migrar-ingles.ts` y crea
  `grupo-1`. Al terminar las vacía e imprime cuántas filas quedan (debe ser 0).
- Limpieza a mano, si una corrida se cortó de golpe (p. ej. se cerró la terminal): borra las filas de
  `stald_test_inscripciones`, `stald_test_grupos` y `stald_test_docs`, en ese orden.

### Convenciones de las pruebas
- Un archivo por prueba (`e2e-<nombre>.js`), Node + `playwright` (sin `@playwright/test`). Cada línea de
  resultado empieza con `PASS` o `FAIL`; el proceso sale con 0 solo si no hay `FAIL`.
- La primera línea es `require('./lib/entorno')`: pone `BASE`, `API`, `DATOS` (por omisión `juegos/datos`) y la
  carpeta `SALIDA`, y se cambia a ella (las capturas usan rutas relativas). Nada de rutas absolutas ni puertos fijos.
- `DATA` (la copia de datos) la pasa `correr.sh`; las pruebas de Inglés leen de ahí actividades y exámenes.
- `presentacion-cabe` (cambio `presentacion-cabe`) recorre, como admin, todas las diapositivas de los Meets reales
  de la copia: `meet-2026-10-25`, `meet-2026-10-11` y `meet-g1-2026-10-21`; si faltan, usa `meet-2026-11-01`. También
  recorre una presentación sintética servida con `page.route`. Falla si un contenido queda cortado sin forma de verlo.
  - Tamaños: 1280×720, 1024×768 y 360×740. Con `TAMANOS=todos` agrega 1920×1080, 1366×768 y 740×360.
  - Con `CAPTURAS=1` guarda una captura de cada diapositiva.
  - Si la copia no trae esos Meets, sale `OMIT`. Es de solo lectura.
- `tests/fixtures/datos/` se superpone a la copia: exámenes de Secundaria exclusivos de `valeria@example.com`
  (`sec-e2e` para `examen-secundaria` y `sec-e2e-guardado` para `autoguardado`) y, para `autoguardado-todo` (cambio
  `autoguardado-todo`), la clase `sec-e2e-todo-clase` y la misión `mis-e2e-zz-borrador-sec` (de `valeria`), el reto
  del Meet `meet-e2e-reto-borrador` (de `angel`) y la misión de Inglés `mis-ingles-e2e-zz-borrador` (de `laura`); esa
  prueba reinicia los resultados que envía y borra el texto de sus entregas al terminar. Cada prueba usa el suyo para no
  gastarle las oportunidades a otra en la misma fase. También trae una clase por Meet anterior (`meet-2026-09-27`,
  semana `2026-09-21`, exclusiva de `nadie-e2e`) para la prueba `presentar`; solo la ve el admin. Y la actividad
  `fichas-e2e` (ordenar y emparejar), en la misma semana, con fecha 2026-10-04 y exclusiva de `fernando`, para
  `ordenar-emparejar`: aparece en su «Para ponerte al día». La semana de Secundaria `2026-10-26` (15 clases
  `sec-e2e-clase-*`, exclusivas de `valeria`, 2 por día y 3 el domingo, con y sin `materia`) es de
  `secundaria-clases`, `secundaria-clase` y `secundaria-dashboard`, que solo corren con `--hoy 2026-10-27` (con otro
  día salen `OMIT`). La clase `sec-e2e-clase-2026-10-27-a` trae además 2 videos de YouTube, una lectura y libreta para `secundaria-clase` (clase
  interactiva, cambio `secundaria-sin-notion`; también solo con `--hoy 2026-10-27`): pasos y `aria-current`, iframes
  `youtube-nocookie` lazy, «✅ Ya la hice» que se recuerda, resultado con «Siguiente clase», 360 px claro/oscuro e
  Inglés sin pasos. Envía la clase de la alumna: corre después de `secundaria-clases`.
- `revision-profe` (fase `ingles`, cambio `revision-profe`): semana de Secundaria `2026-09-14` del fixture, propia de
  esta prueba (no toca la `2026-10-26`): 5 clases `sec-rev-e2e-*` de `valeria` (sin abrir; en borrador 2 de 4 en
  `borradores/`; enviada a tiempo con 80 %; fuera de tiempo con 50 % y una revisión previa del profe con 6 en
  `revisiones/valeria/`; y Español con audio y libro de ortografía, 50 %; las materias no mueven los promedios que fija `secundaria-dashboard`). Prueba la API (semana, estados, matriz
  403/401, 400/404, lo que recibe la alumna), la pestaña «📋 Revisión» del profe (perezosa, «🔎 Ver respuestas»,
  checklist, audio, libro, calificación, comentario, recarga, final y resumen contra `comun/revision-datos.js`) y lo
  que ve la alumna (aviso «📝 El profe revisó N clases», «Profe · Final» y chip «📋 Final» en «Mis materias», y
  «✅ Revisado por el profe» en su fila y en la clase), en 360, 768 y 1280 px, claro y oscuro. Con `--pg` siembra en `stald_test_docs` el borrador y la
  revisión de ejemplo (la migración solo lleva `resultados/` y `avance/`). Al terminar deja las revisiones como en el
  fixture. Selectores `data-testid`: `openspec/changes/revision-profe/design.md`.
- `secundaria-adelantar` (fase `ingles`, cambio `secundaria-adelantar`; solo con `--hoy 2026-10-22`, con otro día
  sale `OMIT`): la semana de Secundaria `2026-10-19` del fixture (3 clases `sec-adelanta-*` de `valeria` que abren el
  21 y traen `dia` jueves 22 ×2 y viernes 23) y la semana `2026-11-02` (1 clase con `dia` 2026-11-02 que también abre
  el 21). Revisa que «Hoy te toca» traiga solo las del jueves, que la del viernes
  se abra y se resuelva hoy (a tiempo) y que «🗓️ Mi horario» quede igual antes y después; la de la semana futura sale en «📝 Otras clases y exámenes».
- `juegos-diseno` (fase `base`, cambio `juegos-diseno-rpg`): a 360 px, en claro, en oscuro y con `stald_tema=oscuro`,
  revisa:
  - el encabezado `#jg-heroe` contra `/juegos/yo`;
  - las secciones en orden y «Para ti» vacío y con puntajes (`state.mejores` solo en la página, sin escribir en el
    servidor) con su «▶ Jugar»;
  - «En vivo» → Partidas con el foco en el código, y «Copas»;
  - botones de 44 px o más, foco de 3 px, sin scroll horizontal y contraste AA de los textos del hub;
  - Ranking, Partidas, avatar y los menús de Karts, Fútbol Estelar, Billar y Golf, sin los controles táctiles del
    mando (`tabindex="-1"`).

  Deja capturas `juegos-diseno-*.png`.
- `portal-diseno` (fase `base`, cambio `portal-diseno-rpg`): registra un invitado de Juegos por la API (copia temporal)
  y revisa el portal a 360 px en claro y oscuro para la alumna de Secundaria (héroe, línea «… hoy», avance de la semana
  y racha comparados con `SecundariaDatos` sobre la misma respuesta, sin nivel ni XP), el alumno de Inglés (línea de
  Juegos igual a `/juegos/yo`), el invitado (solo Juegos), el admin (4 tarjetas,
  selector de alumna sin peticiones; con una sola persona en la copia agrega una opción solo en la página) y sin sesión (entrada, selector de tema que se guarda y leen Inglés y Juegos, «Crea tu cuenta de Juegos»
  e `index.html?juegos=1`). En todos: botones de 44 px o más, sin scroll horizontal, contraste AA, sin errores de
  consola y pie legal oculto con el interruptor apagado. Con `--hoy 2026-10-27` también ve el avance. Deja capturas
  `portal-diseno-*.png`.
- `navegacion-dispositivos` (fase `ingles`, cambio `navegacion-dispositivos`): recorre 8 tareas clave en celular
  (360×740, táctil), tablet (768×1024 y 1024×768, táctiles) y PC (1280×800 y 1920×1080): clase de Secundaria hasta
  «Siguiente misión», pestañas de Secundaria, actividad de Inglés, Material → PDF, invitado de Juegos (entrar, jugar y
  volver), panel del profe (ver grupo, ocultar/mostrar «Grupo 1», Entregas y evaluar), Secundaria del profe (alumna y
  Resultados) y Mi ruta → clase. Por tarea y tamaño mide toques de navegación, tiempo de cada pantalla, peticiones,
  errores de consola (sin Postgres se excusa el 503 `sin_base` de `/ingles/grupos`), scroll horizontal, objetivos
  < 44 px (con toque), elementos tapados, formas de volver y el atrás
  del navegador; además el ancho en tablet y PC, el teclado en PC y 7 enlaces profundos. Falla ante scroll, objetivos
  chicos en celular o tablet, errores, tapados, más toques que `TOPE_TOQUES`, pantallas de más de 8 s, atrás que sale de la
  plataforma o foco invisible. Si una tarea se pasa de 8 s en un tamaño, se repite **una** vez solo para medir el
  tiempo y falla solo si se pasa las dos veces; la tabla cierra con el tiempo máximo observado y los reintentos
  (`NAV_TOPE_MS=<ms>` baja el tope para probarlo; cambio `navegacion-mejoras`). Escribe `salida/navegacion-dispositivos.md` (tabla) y capturas `nav-*.png`. `MEDIR=1`
  solo mide (línea base); `NAV_SOLO` y `NAV_DISP` acotan. La clase de Secundaria necesita `--hoy 2026-10-27` (si no,
  esa tarea sale `OMIT`) y se envía una sola vez (en los demás tamaños abre su resultado); ocultar/mostrar el grupo
  necesita `--pg` (si no, `OMIT`). Corre al final de la fase: si `misiones` ya evaluó las entregas, solo llega a la
  bandeja.
- `juegos-carga` (fase `base`, cambio `juegos-carga-perezosa`): abre `juegos.html` con caché vacía y 4G simulada por
  CDP (150 ms, 1.6 Mbps) en celular 360 y PC 1280 (mediana de 3, tras una visita de calentamiento) y exige el menú con
  ≤ 15 archivos y usable en ≤ 3 s, sin motores ni pantallas de juego; también `?registro=1`. Luego prueba la carga al
  elegir Gato («Cargando…», archivos con `?v=`, una sola petición, misma cascada de CSS), el error de red en Damas con
  «Reintentar», 👥 Partidas, `?sala=` y `&ver=1` con caché vacía y `#cat=`. Escribe `salida/juegos-carga.md`; `MEDIR=1`
  solo mide (línea base) y `REPETICIONES` cambia la muestra.
- `secundaria-dashboard` (fase `ingles`, cambio `secundaria-dashboard`): la alumna del fixture envía 3 clases por la API
  (en la copia temporal) y revisa a 360 px en claro y oscuro el Inicio RPG (retos, estados, progreso, racha, XP y
  nivel, insignias, misión, actividad, promedios), botones de 44 px o más con foco visible, «📚 Mis materias» con sus
  mundos, abrir y volver de una clase, escritorio, el tablero del admin (`?alumna=valeria`) y el bloque «🗓️ Mi
  horario» del portal.
  Corre después de `examen-secundaria` y `secundaria-clase` en el mismo servidor: lo que esperan XP, nivel e insignias
  sale de lo que devuelve la API en ese momento (incluida la XP de misiones evaluadas).
- `misiones` (fase `ingles`, cambio `rpg-fase2-misiones`, solo con `--hoy 2026-10-27`): con `mundos.json` y la misión
  inventada `mis-e2e-valle-de-los-numeros` del fixture (exclusiva de `valeria`), revisa a 360 px en claro y oscuro la
  matriz básica por la API (archivo y multipart → 400, > 4 000 → 400, bandeja 403 a la alumna), «⚔️ Misiones» con el
  recordatorio de privacidad, contador, práctica comprobada en el servidor y entrega en texto, la bandeja del admin con
  la rúbrica (85 % → 315 XP), 409 al reenviar, el aviso «+XP» y el nivel en el Inicio, «🗺️ Mapa» y «🌳 Árbol». Corre
  después de `secundaria-dashboard`; si la copia ya trae la misión evaluada, sale `OMIT`.
- `ingles-diseno-profe` (fase `ingles`, cambio `ingles-diseno-profe`): panel del profe a 360 px en claro y oscuro
  (encabezado con grupos activos, alumnos y alumnas, en riesgo y «Por revisar» contra `/profe/entregas`; grupo elegido;
  sin grupos; tarjetas por grupo; mapa de calor como tarjetas; Registro; cajón; «🔍 Ver grupo»), 44 px y sin scroll en
  las 11 secciones del admin, y la ruta del profe con la experiencia RPG (barra, misión principal, retos, nada
  «atrasada», «🌍 Mundos» con los 9 mundos, clase por pasos como «⚔️ Misión») y su Plan del mes (cuenta las clases
  abiertas con botón contra la API), más capturas de escritorio. En claro envía la misión principal del profe (en la
  copia temporal de datos) para ver «+XP». Sin `--pg`, cambia en el navegador la parte `grupos` del panel
  (`/ingles/data?incluir=panel` y `/ingles/panel`) y el GET de `/ingles/grupos` por dos grupos de ejemplo (cambio
  `panel-profe-peticiones`); en Registro espera la lista, que se pide al abrir la pestaña. La ruta sale siempre del
  plan de ejemplo de 8 semanas (`tests/fixtures/datos/contenido/profe/`, con clases en los 9 mundos; cambio
  `navegacion-mejoras`), no de la ruta real.
- `baja-ingles` (fase `ingles`, sin `--pg`; cambio `ingles-baja-alumno`) da de baja a `laura@example.com` desde
  «Registro», revisa el aviso de la alumna, `/ingles/actividades` 403, el portal sin Inglés, el mismo jugador de Juegos
  y el resumen sin ella, y la reactiva al final (deja el registro como estaba).
- `ocultar-grupos` (fase `grupos`, `--pg`; cambio `ingles-ocultar-grupos`) crea «Grupo 2» con Angel y una partida
  de Marisol; con «Grupo 1» oculto, Marisol ve su grupo y su semana y entrega con el resultado guardado. Luego lo
  oculta con «👁️ Ocultar del panel» y revisa que sus alumnos y alumnas salgan del avance, «Últimas calificaciones»,
  «Registro», el selector, el resumen, el mapa de calor, el conteo «con intentos» de «Esta semana», el guion del Meet
  y el ranking; el interruptor «Mostrar grupos ocultos (1)» (y que el selector vuelve a «Todos los grupos» al
  apagarlo); y lo revierte con «Mostrar en el panel» (el interruptor se apaga solo). Abre «🎮 Juegos» y «➕ Registro»
  antes de leerlos (se piden al abrir la pestaña; cambio `panel-profe-peticiones`).
- `ingles-admin` (fase `ingles`, con o sin `--pg`; cambio `fix-ingles-admin`) abre `ingles.html` como admin, recorre
  cada pestaña y la ruta del profe y falla ante cualquier error de consola, error JS, script o estilo que no carga o 5xx
  de la API (sin Postgres solo se excusa el 503 `sin_base` de `/ingles/grupos`). Con grupos, oculta y muestra el
  grupo desde su tarjeta del Resumen y restaura la bandera. Simula en el navegador fallas parciales del panel
  (`/ingles/data?incluir=panel`, cambio `panel-profe-peticiones`): el resumen caído con su «🔄 Reintentar» (que pide
  `/ingles/resumen`) y los grupos caídos con el aviso `#panel-avisos` y su «🔄 Reintentar» (que pide `/ingles/panel`).
  A 360 px (cambio `navegacion-mejoras`) revisa que «📥 Entregas» esté en la barra inferior (6 botones de 44 px o más,
  sin scroll horizontal) con el contador = total de entregas listas del panel (Inglés + Secundaria, el mismo dato que
  «📥 Por revisar»; simulado en el navegador con 2 listas y con la parte caída), y a 1280 px que el menú lateral
  conserve el orden del catálogo.
- Reloj acortado solo en pruebas: `window.__TIEMPO_JUEGOS` (juegos), con `addInitScript`.
- Juego en vivo sin Supabase (cambio `juegos-en-vivo`): `lib/vivo-relevo.js` levanta un relevo local (HTTP + SSE) y
  `initVivo(relevo.url, { latencia, perdida, desorden, noConecta })` es el `init` de `abrirPagina`; con la ruta
  `/juegos.html?vivoSimulado=1` la página usa `EnVivo.simulado` (latencia y pérdida inyectadas en la página) en lugar
  del canal de Realtime. `relevo.cortar(id)` silencia a alguien y `relevo.inyectar(topic, sobre)` fabrica mensajes.
  `e2e-karts-vivo` usa 8 contextos (el cupo de la sala); para medir fps abre un solo navegador, las otras 7 personas
  entran por la API y el relevo fabrica sus karts, porque 8 navegadores dibujando en la misma máquina contaminan la
  medición (15–50 fps según la carga).
- Sensor de Karts (cambio `karts-sensor-android`): Chromium 151+ ya trae `DeviceOrientationEvent.requestPermission`
  (como iPhone) y el *headless shell* de Playwright deja los sensores en «prompt» (resuelve `'prompt'`, sin cuadro que
  contestar). `e2e-karts` concede `accelerometer` y `gyroscope` en sus contextos táctiles (como Chrome real, que los
  permite por omisión) y simula cada caso del permiso (nativo, `granted`, ausente, `denied`, rechazo y sin lecturas).
  El caso «nativo sin conceder» espera lo que resuelva el navegador (`'prompt'` en el headless shell, `'granted'` en
  Chrome completo). `probarSensorEnSala` arranca una sala con el sensor elegido y un `requestPermission` que rechaza
  hasta que hay un toque dentro del juego: no usa `navigator.userActivation` porque Chromium hereda al iframe la
  activación del clic en «Empezar». Las lecturas son eventos sintéticos (llegan aunque no haya permiso). Solo esa
  parte: `KARTS_SOLO=sensor`.
- Con el verificador falso local, cualquier contraseña no vacía abre la sesión; «clase» o «sensei» cuentan como la
  inicial y piden cambiarla (cambio `acceso-con-contrasena`).
- Solo correos `@example.com`. El usuario admin de prueba es `admin@example.com`. Nada de datos reales.
- Para correr una prueba suelta sin `correr.sh`, levanta tú los servidores y exporta `BASE`, `API`, `DATA` y,
  si quieres, `CHROME`: `cd tests/e2e && node e2e-poker.js`.

### Sesión de prueba
Desde `plataforma-login`, el servidor exige sesión. Con `ROWS_FIXTURE` (y solo entonces) acepta el verificador
falso `Authorization: Bearer prueba:<correo>`:
- En el navegador, `abrirPagina` de `lib/navegador.js` guarda `localStorage.stald_sesion_prueba = { email, token:
  'prueba:' + email }` (y, si se pide, las claves viejas `stald_email` / `ingles_email`) antes de cargar la página.
- En las llamadas directas de Node, `lib/entorno.js` agrega el encabezado a toda petición a `API` con `?email=`.
- Las de login (`login`, `login-despues`) manejan el token a mano porque prueban justo eso (p. ej. cuándo se rechaza `?email=`
  sin token); llaman a `sinSesionEnFetch()`.

### Agregar una prueba
1. Crea `tests/e2e/e2e-<nombre>.js` con `require('./lib/entorno')` en la primera línea.
2. Abre las páginas con el ayudante `lib/navegador.js` (cambio `e2e-ayudantes`), no con un `newContext` +
   `addInitScript` propio. Sus opciones (`email`, `viejo`, `ingles`, `tiempo`, `init`, `viewport`, `contexto`, `out`,
   `etiqueta`, `dialogos`, `ruta`, `esperar`) están documentadas en el encabezado del archivo:

   ```js
   const { abrirPagina, urlDe } = require('./lib/navegador');
   const p = await abrirPagina(b, { email: 'marisol@example.com', tiempo: 0.4, out, ruta: '/juegos.html', esperar: '[data-menu]' });
   // Sin `ruta`, la página queda en blanco: agrega rutas o escuchas y luego `await p.goto(urlDe('/ingles.html#semana'))`.
   ```

   Las pestañas de Secundaria se abren con `irPestanaSec(p, id, toca?)` de `lib/secundaria.js` (cambio
   `navegacion-mejoras`): usa la fila de pestañas en tablet y PC y, en celular, la barra inferior o «☰ Más»; no toques
   `.sec-tabs [data-sec-tab]` directo (a menos de 720 px la fila está oculta).
   El menú de `juegos.html` abre en las categorías (cambio `juegos-categorias`): espera `[data-menu]` (existe en las
   dos vistas) y usa los ayudantes de `lib/menu.js` en lugar de tocar `[data-juego="…"]` directo:
   `abrirJuego(p, id, { tap })` (abre la categoría del juego si hace falta y toca su tarjeta), `abrirCategoria`,
   `irACategorias`, `idsDe(p, cat)`, `textoTarjeta(p, id)` y `recorrerMenu(p)`. Para comparar el menú con su catálogo
   usa `contarMenu(p)` (cambio `organizar-codigo`): entra a cada categoría y devuelve `ids`, `tarjetas`, `juegos`
   (`JUEGOS.length`), `secciones` (tarjetas de categoría), `categorias` (`CATEGORIAS.length`), `porCategoria` y
   `completo` (cada categoría pinta exactamente sus juegos y la suma es todo el catálogo). No repitas
   `p.evaluate(() => JUEGOS.length)`. Los botones `.result [data-juego]` («Jugar otra vez») no cambian.
3. Agrégala a `ORDEN` en `correr.sh` (y a `fase_de` si no es de fase `base`).
4. Córrela con `correr.sh` y documenta el resultado en el reporte del cambio.

## Análisis de calidad

Mide desde la terminal los mismos avisos que SonarQube for IDE (SonarLint) muestra en el panel «Problemas» de VS Code,
para saber si suben o bajan sin abrir cada archivo. Cambio de origen: `openspec/changes/archive/2026-10-12-calidad-sonar` (decisiones y
conteos antes/después en su `design.md` y su reporte).

```bash
cd tests/calidad
npm install                                      # una vez: ESLint, Stylelint y sus plugins (solo aquí, no en la raíz)
npm run calidad                                  # avisos por regla de Sonar y por archivo
node calidad.mjs --detalle --regla S3358         # cada aviso de una regla (archivo:línea y mensaje)
node calidad.mjs --detalle --contexto 2 --archivo juegos/golf.html   # con el código alrededor, solo ese archivo
node calidad.mjs --json salida.json              # resultado completo en JSON (para comparar antes y después)
```

- **Qué revisa:** el JS del navegador (`juegos/`, `juegos/app/`, `ingles/`, `comun/` y los `<script>` de los HTML de la
  raíz y de `juegos/`), el CSS (`estilos/`, archivos `.css` y `<style>`) y `server/*.ts`. No revisa `tests/`,
  `supabase/` ni `herramientas/`.
- **Cómo:** `eslint.config.mjs` activa solo las reglas equivalentes de `eslint-plugin-sonarjs` (el mismo código que usa
  SonarLint) y `eslint-plugin-unicorn`, con su clave de Sonar al lado (`S3358`, `S3776`, `S2681`, `S2245`, …). Stylelint
  cubre `css:S4666` (selectores duplicados) y `css:S1874` (valores obsoletos), y `calidad.mjs` agrega dos revisiones
  propias: contraste WCAG AA de reglas con `color` y fondo literales (`css:S7924`) y roles ARIA que tienen elemento
  nativo (`Web:S6819`, p. ej. `role="group"` → `<fieldset>`).
- **`NOSONAR`:** igual que SonarLint, un aviso en una línea con `// NOSONAR: <motivo>` no cuenta; se lista aparte como
  «revisados con NOSONAR», por regla. Úsalo solo con el motivo escrito, p. ej. `// NOSONAR: azar de juego, no
  criptográfico` en `Math.random()` (S2245) o en la aritmética entera de 32 bits de los generadores con semilla
  (S7767).
- **No es una compuerta:** sale con 0 aunque haya avisos y no corre en CI. Córrelo antes de un PR que toque mucho código
  y no subas los conteos sin motivo.
- **Diferencias con SonarLint:** VS Code solo analiza los archivos abiertos (y también las copias de los worktrees de
  `.claude/`); este análisis recorre todo el código vivo y nada más. Las revisiones propias de contraste y roles son
  aproximadas: no resuelven variables CSS (`var(--x)`) ni roles dentro de cadenas de JS.
