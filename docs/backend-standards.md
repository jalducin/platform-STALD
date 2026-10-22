# Estándares de backend

> **Backend en producción: Deno Deploy** (`https://stald.jalducin.deno.net`, `server/main.ts`). Los datos
> viven como JSON en el repo privado `jalducin/platform-STALD-data`. Ya no se usa Supabase ("Fidello QAS").
> La configuración está en [deno-deploy-setup.md](deno-deploy-setup.md). Las secciones de Supabase de este
> documento describen la versión anterior (v14). Sigue desplegada, pero las páginas dejaron de usarla el
> 2026-09-28 y queda como legado.

## 0. Backend actual: Deno Deploy (`server/`)

| Archivo | Rol |
|---|---|
| `server/main.ts` | Entrypoint: CORS y rutas `/ingles/data`, `/ingles/actividades…`, `/secundaria/actividades…`, `/data` (historial de Notion, sin consumidores) |
| `server/secundaria_registro.ts` | Identidad de Secundaria desde `alumnos.json` (marca `secundaria` o clases exclusivas) y caída temporal a Notion (cambio `secundaria-sin-notion`) |
| `server/actividades.ts` | Rutas de actividades y exámenes sobre el almacén JSON (caché de contenido de 60 s) |
| `server/cache.ts` | `crearMemo` y `unaALaVez`: cachés en memoria con single-flight (cambio `cache-estabilidad`) |
| `server/http_cache.ts` | Política de caché HTTP por ruta, `ETag` y 304 (cambio `cache-estabilidad`) |
| `server/interruptores.ts` | `GET /interruptores`: interruptores públicos del profe (`config/interruptores.json`), con caché de 60 s y falla cerrada (cambio `rpg-privacidad`) |
| `server/motor.ts` | Lógica pura: selección por alumno e intento, calificación, mejor intento, refuerzo |
| `server/store.ts` | `GitHubStore` (API de contenidos, escritura con `sha`) y `MemoryStore` (pruebas) |
| `server/rows.ts` | Extracción de filas de Notion (Secundaria) y filtrado por correo |
| `server/auth.ts` | Sesión con Supabase Auth: `quienEs`, `GET /config` y `POST /auth/enlace` (cambio `plataforma-login`) |
| `server/contrasena.ts` | Entrada con contraseña: `POST /auth/preparar`, `/auth/contrasena` y `/auth/restablecer` (cambio `acceso-con-contrasena`) |
| `server/gamificacion.ts` | Nick de Juegos, perfil y ranking por grupo de Inglés (`/gamificacion/perfil`, `/gamificacion/ranking`) y su moderación (`/profe/nicks`, `/profe/ranking`); ver § «Ranking de Inglés» (cambio `rpg-fase2-ingles`) |
| `server/interruptores.ts` | Interruptores del profe en `stald_docs`: se leen en cada petición, apagados por defecto (cambio `rpg-fase2-ingles`) |
| `server/cache_ranking.ts` | Caché de 60 s del ranking por grupo y semana; la invalidan gamificación y `POST /juegos/nick` |
| `server/resumen.ts` | `GET /ingles/resumen`: indicadores y mapa de calor del tablero del profe (cambio `ingles-pro`) |
| `server/panel.ts` | `GET /ingles/panel` y la parte `panel` de `GET /ingles/data?incluir=panel`: panel del profe en una petición (cambio `panel-profe-peticiones`) |
| `server/semana.ts` | `validarSemana`: revisa una semana completa antes de subirla (errores y avisos) |
| `server/validar_semana.ts` | CLI del validador: `npx -y deno run --allow-read server/validar_semana.ts <dir-datos> <lunes> [--profe \| --secundaria]` (código 1 si hay errores; 2 si los argumentos no son válidos) |

**Variables:** `NOTION_TOKEN` (opcional desde `secundaria-sin-notion`), `SUPER_ADMIN_EMAIL`, `GITHUB_TOKEN` (token fino, solo Contents del repo
de datos) y `DATA_REPO`. Sesión: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_KEY` y, opcionales,
`LOGIN_TRANSICION_HASTA` y `SITIO_URL`. Para pruebas: `DATA_DIR`, `ROWS_FIXTURE` (también activa el verificador
falso de sesión), `PORT` y `PERMITIR_HOY=1` (permite `?hoy=`).

**Identidad y sesión (`server/auth.ts`, cambio `plataforma-login`):**

- Cada petición pasa por `quienEs(req, deps)` **una vez** en `main.ts`; todas las rutas usan el correo que devuelve,
  nunca el de la URL. Excepciones sin identidad: `OPTIONS`, `GET /salud`, `GET /config`, `GET /interruptores` y `GET /juegos/foto/<token>`.
- Con `Authorization: Bearer <token>`: se valida con `GET {SUPABASE_URL}/auth/v1/user` (`apikey` = publishable) y se
  usa el correo verificado. Caché de 5 min por SHA-256 del token (tope 2,000). Token rechazado → 401
  `sesion_invalida`; Supabase sin responder o sin configurar → 503 `auth_no_disponible` (no se guarda en caché).
- Sin token: se acepta `?email=` (sin verificar) hasta `LOGIN_TRANSICION_HASTA` (constante `2026-10-12`, inclusive,
  hora de CDMX; la variable de entorno la sobreescribe). Después → 401 `inicia_sesion`. El correo del admin
  (`SUPER_ADMIN_EMAIL`) **siempre** requiere token: sin él → 401 `inicia_sesion`.
- Con `ROWS_FIXTURE` (solo local), `Bearer prueba:<correo>` es una sesión válida falsa. Sin `ROWS_FIXTURE` no existe.
- CORS: `Access-Control-Allow-Headers: content-type, authorization`.

| Ruta | Método | Respuesta |
|---|---|---|
| `/config` | GET (sin sesión) | `{ supabaseUrl, publishableKey, interruptores }`; con `ROWS_FIXTURE`, `{ prueba: true, interruptores }`; sin variables, 503 `sin_config` (sin `interruptores`). `interruptores` = lo mismo que `GET /interruptores`, del último valor leído y sin esperar la lectura (se refresca en segundo plano y se lee al arrancar); en frío sale sin el campo (cambio `fix-e2e-rpg`) |
| `/interruptores` | GET (sin sesión) | `{ privacidad: boolean }`: solo llaves conocidas y solo `true` estricto enciende. Lee `config/interruptores.json` de `stald_docs` (o del almacén sin Postgres); sin documento o con error → todo `false`. Caché en memoria 60 s. Otro método → 405 (cambio `rpg-privacidad`) |
| `/auth/preparar` | POST `{ email, password }` (sin sesión) | Si es la contraseña inicial de esa persona («sensei» el admin, «clase» alumnos y alumnas de Inglés o Secundaria) y su cuenta no tiene `app_metadata.contrasena_propia`, crea la cuenta de Auth (correo confirmado) o le pone la inicial y confirma su correo: `{ listo: true }`. 401 `credenciales`, 400 `correo_invalido`, 429 tras 10 intentos por correo en 10 min, 503 `auth_no_disponible`. En Auth la contraseña es `stald·` + lo que se escribe |
| `/auth/contrasena` | POST `{ nueva }` (con token) | 6 a 60 caracteres, distinta de las iniciales; la pone y marca `contrasena_propia`. 400 `contrasena_invalida`, 401 sin token |
| `/auth/restablecer` | POST `{ email }` | Solo admin **con token**: contraseña aleatoria y `contrasena_propia = false` (vuelve a entrar con la inicial). `{ ok, email, sinCuenta? }`; 403 `solo_admin` |
| `/auth/olvide` | POST `{ email }` (sin sesión) | «¿Olvidaste tu contraseña?»: manda un enlace de acceso por correo (Supabase `/auth/v1/otp`, `redirect_to` = `SITIO_URL`) solo a correos de las clases y del admin; máximo 3 por correo cada hora. `{ enviado: true }`; 404 `no_es_de_clase`, 429 `demasiados_intentos` o `limite_correo` (correo de Supabase agotado), 503 `auth_no_disponible` |
| `/auth/enlace` | POST `{ email, destino? }` | (Sin uso en las páginas desde `acceso-con-contrasena`.) Solo admin **con token**: `{ email, enlace, codigo }` (Admin API `generate_link`, tipo `magiclink`, `redirect_to` = `SITIO_URL` o el portal; con `destino: "juegos"`, `<sitio>/juegos.html`). 401 sin token, 403 `solo_admin`, 400 `correo_invalido`, 404 `sin_cuenta`, 503 `auth_no_disponible` |

Alta de las personas actuales en Supabase Auth: `herramientas/alta-usuarios-auth.ts --correos <archivo> [--prueba]`
(Admin API `POST /auth/v1/admin/users` con `email_confirm: true`; el archivo de correos no va al repo).

**Rutas `/ingles/actividades`:**

| Ruta | Método | Respuesta |
|---|---|---|
| `/ingles/actividades` | GET | Alumno: elementos de las semanas iniciadas (`id <= hoy`) y exámenes sueltos (los que no referencia ninguna semana, iniciada o no; así una semana subida por adelantado no se asoma), con `estado` (`proximamente`, `disponible`, `en-curso`, `completo`), `intentosUsados`, `mejor`, `mejorATiempo` (`true`/`false` según el intento que da la mejor calificación llegó o no dentro de su fecha; `null` sin intentos; cambio `gamificacion-nucleo`) y `ultimoEnvio`. Admin: `resultados` por elemento y `resumen[alumno].temasAReforzar` |
| `/ingles/actividades/<id>` | GET | Con `prorrogas`, el alumno o alumna recibe su propia `fechaLimite` aquí, en la lista y en `fueraDeTiempo`; el admin ve la base. Teoría, tips, temas, `enfoque` (refuerzo) y los ejercicios del intento que toca, **sin respuestas**. 403 `no_disponible`, 409 `sin_intentos`. El admin puede usar `?alumno=` y `?intento=`. En el intento de corrección (no examen) agrega `correccion: { fijas, anteriores }`: `fijas` son sus respuestas correctas y `anteriores` el texto de lo que contestó mal, nunca la respuesta correcta |
| `/ingles/actividades/<id>/borrador` | PUT `{ intento, respuestas }` | Avance del intento abierto en `borradores/<id>/<slug>.json` (Postgres): solo la dueña o el dueño (admin → 403 `solo_alumno`), solo el intento que toca (409 `intento_invalido`) y solo preguntas de ese intento, sin las fijas de la corrección; vacío lo borra. El GET del intento devuelve `borrador: { respuestas, actualizado }` y el POST que guarda el intento lo borra (cambio `borrador-en-servidor`). Igual en `/ingles/profe/actividades` y `/secundaria/actividades` |
| `/ingles/actividades/<id>` | POST `{ intento, respuestas }` | Calificación inmediata, `mejor`, `restantes` (0 si una actividad llega a 100 %) y, si se guardó, `aTiempo` (este intento llegó dentro de su fecha) y `mejorATiempo` (cambio `gamificacion-nucleo`, bonus de XP). En la corrección, las `fijas` mandan sobre lo que envíe el cliente. 409 `intento_invalido` / `sin_intentos`. El admin no guarda |
| `/ingles/actividades/<id>/resultados/<alumno>` | DELETE | Solo admin: reinicia los intentos |
| `/ingles/actividades/<id>/prorroga` | POST `{ alumno, fecha \| null }` | Solo admin: da o quita una prórroga (ver "Tablero del profe, racha y prórroga") |
| `/ingles/resumen` | GET (`?grupo=`) | Solo admin: indicadores y mapa de calor de la semana (cambio `ingles-pro`) |
| `/ingles/panel` | GET (`?grupo=`, `?ocultos=1`) | Solo admin: grupos, alumnos y alumnas sin correos, resumen y «Por revisar» en una respuesta (cambio `panel-profe-peticiones`) |

**Rutas `/juegos/…`** (`server/juegos.ts`, cambio `juegos-plataforma`):

| Ruta | Método | Respuesta |
|---|---|---|
| `/juegos/yo` | GET | Jugador, `totalIndividual`, `totalPartidas`, `total`, mejores, `pos` (individual), `posPartidas` y catálogo |
| `/juegos/partida` | POST `{ juego, puntos, aciertos, total, segundos, sala? }` | `{ guardado, puntos, modo, mejor, nuevoRecord, totalIndividual, totalPartidas, total, pos }`. **Todo suma** (`puntos-por-tipo`): sin `sala` → puntos individuales (tope del juego); con `sala` → puntos de partidas (tope 10,000; la sala debe existir, ser de ese juego, haber empezado y tener al jugador: 400 `sala_invalida`, 403 `no_en_sala`, 409 `ya_guardada`). 400 si el juego es inválido, 403 `no_registrado`, 429 `limite_diario` (100 por día) |
| `/juegos/ranking` | GET (`?semana=<lunes>&tipo=individual\|partidas`) | Top 20 del tipo (solo quien tiene puntos de ese tipo) `{ pos, nombre, tipo, total, totalIndividual, totalPartidas, partidas, juegos }` y `yo`. 400 `tipo_invalido`. Sin correos |
| `/juegos/ranking/juegos` | GET (`?semana=<lunes>`) | Juegos más jugados de la semana (cambio `ranking-juegos-populares`): `{ semana, jugadores, juegos: [{ pos, id, titulo, jugadores, partidas, mejor: { nombre, puntos } \| null }] }`. Solo juegos del catálogo con al menos 1 jugador; `jugadores` = personas distintas (individual o sala; los bots no envían partidas y no cuentan); orden jugadores → partidas → título. Se calcula una vez por carga de la semana en caché (`WeakMap` sobre el arreglo de `leerSemana`, que lee la carpeta con `leerCarpeta`: una consulta en Postgres). 400 `semana_invalida`. Sin correos ni ids de jugador |
| `/juegos/invitado` | POST `{ nombre, acepto: true }` | Registra o hace entrar a un invitado; `{ ya: true }` si el correo ya es alumno o alumna. 400 si falta aceptar o el apodo es inválido; 429 con 500 invitados |
| `/juegos/invitados` | GET | Solo admin: correos, apodos, visitas y puntos de la semana, para análisis |
| `/juegos/registro` | POST `{ email, nombre, acepto }` (sin sesión) | Cuenta de Juegos sin validar el correo: alta del invitado (`registrarInvitado`) y `{ token_hash, jugador }` (llave de un solo uso de `generarEnlace`, que la página canjea con `verifyOtp`); con `ROWS_FIXTURE`, `{ prueba: true }`. 409 `correo_de_clase` para alumnos, alumnas y admin (entran con su enlace); 400 `correo_invalido`/`apodo_invalido`/`debe_aceptar`; 429 `cupo_lleno`; 503 `auth_no_disponible` (cambio `registro-directo-juegos`) |
| `/juegos/nick` | POST `{ nick }` | Nick del jugador (2 a 20 letras o números; vacío lo quita) en `juegos/nicks.json`; actualiza su entrada de la semana. Con nick, la identidad trae `nombre` = nick y `nombreReal` (cambio `nick-jugadores`). 400 `nick_invalido` |
| `/juegos/progreso/<juego>` | GET · PUT `{ v, datos }` | Avance individual de los juegos de Arcade (`plataformas`, `karts`; cambio `juegos-plataformas-karts`; `dragon-run`, cambio `dragon-run-misiones`; `golf`, cambio `golf`; `futbol`, cambio `futbol-estelar`; `brigada`, cambio `brigada-xalli`, forma en `juegos/brigada-motor.js` vía `server/brigada.ts`; `server/progreso.ts`). Cada jugador lee y escribe solo el suyo (id de la sesión; no hay forma de leer el de otra persona, tampoco el admin). GET → `{ juego, v, datos, actualizado }` (`v: 0`, `datos: null` si no hay). PUT con escritura condicional: `v` debe ser la versión guardada (si no, 409 `version_vieja` con `{ v, datos }` actuales) y el `put` usa el sha leído (3 reintentos; 503 `conflicto_escritura`) → `{ ok, v: v + 1, actualizado }`. 400 `juego_sin_progreso`, `json_invalido`, `version_invalida` o `progreso_invalido` (forma exacta por juego, ver docs/data-model.md); 413 `progreso_grande` (> 4096 bytes); 405 otro método; 403 `no_registrado` |
| `/juegos/jugadores` | GET | Solo admin: `{ semana, jugadores[], pendientes[], cuentasError }`. Jugadores = alumnos, alumnas e invitados con puntos y partidas de la semana; pendientes = cuentas de Supabase Auth (`listarCuentas`, 60 s en memoria) que no terminaron: `sin confirmar` o `sin apodo`. Con `ROWS_FIXTURE`, las cuentas salen de su clave `cuentas` (cambio `jugadores-admin`) |

- **Semana:** de lunes a domingo, hora de CDMX.
- **Total:** suma del mejor puntaje de cada juego.
- **Id del jugador:** `admin`, `a-<slug>` (Inglés), `s-<slug>` (Secundaria) o `i-<hash>` (invitado).
- **Partidas** (`server/salas.ts`, cambio `juegos-partidas`):
  - **Escrituras que no se guardan** (cambio `errores-latentes`): crear, unirse, empezar y revancha revisan cada
    escritura condicional (3 intentos con el `sha` leído); si no se guardó, responden **503 `conflicto_escritura`**
    (como `respuesta` y `/juegos/progreso`) y no dejan estado a medias. Las páginas lo muestran como «No se pudo
    …, intenta de nuevo.».
  - `POST /juegos/sala` `{ juego, opciones, bots }` → `{ codigo }`. 503 `sin_codigo` si no encontró código libre;
    503 `conflicto_escritura` si no se guardó la sala o su anfitrión (en ese caso se borra la sala nueva).
  - `POST /juegos/sala/<código>/unirse`: 404 si no existe, 409 si ya empezó o está llena (30), 410 si
    venció (3 h), 503 `conflicto_escritura` si no se guardó (la persona no queda dentro).
  - `GET /juegos/sala/<código>` trae `ahora` (hora del servidor al empezar a atender) y `reloj` (al responder; cambio
    `karts-salida-y-puntos`): con las dos, la página acota su desfase con el servidor sin el tiempo de procesamiento
    (`juegos/reloj-sala.js`).
  - `POST /juegos/sala/<código>/empezar`: solo el host; fija `inicio` = ahora + 5 s (Karts: + 8 s, para que todos los
    aparatos tengan abierta la pista antes de la salida; `cuentaRegresiva` en `server/salas.ts`). Relee la sala en cada intento:
    si otra petición ya la empezó responde esa sala (mismo `inicio`); 404 `sala_no_existe` si ya no existe; 503
    `conflicto_escritura` tras 3 choques (la sala sigue sin `inicio`).
  - `POST /juegos/sala/<código>/respuesta`:
    - en preguntas, `{ q, correcta, puntos ≤ 200, ms }`, y solo cuenta la primera;
    - en Basta, `{ ronda, palabras, basta }` (`basta-rondas`): `ronda` entero `0 ≤ ronda < opciones.rondas`
      (si no, 400 `ronda_invalida`); se guarda en `rondasBasta[ronda]` y solo cuenta el primer `basta` de
      cada ronda. Sin `ronda` se acepta el formato anterior `{ palabras, basta }`;
    - `{ final, podio }`: totales hasta 10000;
    - en carreras de Arcade (`plataformas`, `karts`; `server/carreras.ts`), `{ carrera: { ms, monedas } }`: `ms` entero
      entre el mínimo y el límite del juego (plataformas 6 s y 240 s; karts, los de la pista de la sala:
      `Arcade.limitesKarts`, 25 % y 2.5 veces su referencia, ≈ 30 s y 300–350 s; cambio `karts-pistas-grandes`, el
      servidor importa `juegos/karts-pistas.js` y `juegos/arcade.js`; cambio `karts-copa-espacio`: las pistas de sala
      son `MAPAS_SALA.karts = Arcade.PISTAS`, las de `sala: true`, sin lista copiada), o `null` si no terminó; además debe cuadrar
      con el reloj del servidor (`ms ≤ ahora − inicio + 3 s` y `ms ≥ ahora − inicio − 20 s`); `monedas` 0–999. Si no,
      400 `carrera_invalida`. Solo cuenta el primer envío (`carrera` del jugador, con su hora `t`). Con `ms: null` puede
      venir `avance` (entero 0–999, ‰ de la carrera recorrido; cambio `karts-salida-y-puntos`). En `POST
      /juegos/partida` de una carrera suelta en sala, los puntos los calcula el servidor (`rankingCarreraSala`, con
      `Arcade.podioCarrera`: orden de llegada; quien no terminó, después por su avance; 500, 440, 380… por lugar, 0 si
      no terminó; sin monedas) e ignora los de la página; si la carrera sigue abierta, 409 `carrera_en_curso` (no
      guarda; la página reintenta). Cierre de la carrera (`cierreCarreraSala`; en Karts `KartsCopa.cierreCarrera`,
      cambio `karts-copa-sala-4`): todas reportaron, 45 s tras la primera llegada (`KartsCopa.PLAZO_MS`, cambio `karts-plazo-45`) o el límite + la gracia; un primer
      tiempo después del cierre → 409 `carrera_cerrada`.
    - copa completa de Karts (cambio `karts-copa-en-sala`, `server/karts_copa.ts`; reglas en `juegos/karts-copa.js`, que
      importa el servidor): la sala se crea con `opciones { modo: "copa", copa }` (`copa` ∈ `KartsCopa.COPAS_SALA`: las
      copas de `KartsPistas.COPAS` por `nivel` + `mixta`; cambio `karts-copa-espacio`) (400 `copa_invalida` /
      `modo_invalido`) y cada carrera se reporta con `{ copa: { carrera 0–3, ms, monedas } }` o
      `{ copa: { carrera, abandono: true } }` (o `{ copa: { carrera, ms: null, monedas, avance } }` si no terminó;
      cambio `karts-copa-sala-4`): solo la carrera abierta y ya empezada (409 `carrera_fuera_de_turno` /
      `carrera_cerrada`), validada como una carrera suelta desde el inicio de esa carrera y con su pista. Cambio
      `karts-copa-sala-4`: en cada carrera cuentan todas las personas de la sala y cierra cuando todas reportan, 45 s
      después de la primera llegada (`KartsCopa.PLAZO_MS`; antes 30 s, cambio `karts-plazo-45`) o al límite + la gracia; la siguiente empieza 10 s después. `GET /sala`,
      la respuesta y Realtime traen `copa` (fase, carrera, calendario, resultados y tabla). En `POST /juegos/partida`
      de una sala de copa, los puntos se topan con los de la tabla del servidor: por el lugar final en la copa, 4 ×
      `Arcade.puntosLugar` (2000, 1760, 1520…; 0 sin puntos de copa; cambio `karts-salida-y-puntos`).
    - juegos para salas grandes (cambio `juegos-salas-grandes`; reglas en `server/salas_grandes.ts`, ganchos
      `// juegos-salas-grandes` en `server/salas.ts`):
      - **Bingo** `{ bingo: true }`: el servidor revisa la figura (`opciones.figura`: `linea`, `esquinas`, `lleno`) del
        cartón del jugador (`cartón(seed, id)`) con los números cantados a su hora (uno cada 4.5 s desde `inicio`, orden
        `orden(seed)`). Válido → guarda `bingo: { t, n }` (solo el primero); falso → 409 `bingo_falso` y suma
        `bingoFalsos`; antes del inicio → 409 `no_empezo`. Al crear, otra figura → 400 `figura_invalida`.
      - **Blackjack** `{ jugada: { n, accion, monto? } }`: `accion ∈ {apostar, pedir, plantarse, doblar}`; `apostar`
        lleva `monto` entero, múltiplo de 5 y ≥ 5; las demás, sin monto. Si no, 400 `jugada_invalida` (`turno_tomado`
        como en el póker). La mesa se reproduce en el cliente (`juegos/blackjack.js`).
      - **Dibuja y adivina**: al empezar se guarda `sala.secreto` (nunca sale: `sinCanal` lo quita del cuerpo y de
        Realtime). Calendario: cada persona dibuja una vez en orden de llegada, 60 s o hasta que todas adivinan, más
        5 s de pausa. `{ trazo: { turno, nuevos: [{ c 0–7, g 1–3, p: [x, y…] 0–255, 2–64 puntos }] | borrar: true } }`
        solo de quien dibuja en su turno (409 `turno_cerrado` / `no_dibujas`; 400 `trazo_invalido`; ≤ 6 por envío;
        200 trazos y 8000 números por turno → 413 `dibujo_lleno`; un envío cada 300 ms → 429 `muy_rapido`).
        `{ adivina: { turno, texto ≤ 40 } }` → `{ correcta: true, pts }` (100–200 por rapidez; guarda
        `aciertos[turno]`) o `{ correcta: false, casi? }` (guarda el texto en `intentos`, o sin texto si contiene la
        palabra); 409 `eres_quien_dibuja`, `ya_adivinaste`, `turno_cerrado`; un intento cada 700 ms → 429. El GET de la
        sala agrega `dibuja: { turno, fase, letras, forma, palabra?, es?, emoji?, reveladas }`: la palabra solo para
        quien dibuja en su turno; `reveladas`, las de turnos terminados.
      - **Memorama y Sopa en sala** `{ resultado }` (como las carreras: ≤ 3 s adelante y ≤ 20 s atrás del reloj):
        Memorama `{ ms, errores, pares, fin: true }` una vez (`ms` de 8 s a 180 s solo con los 8 pares; `null` si no
        terminó); Sopa `{ ms, encontradas 0–6, fin }`: el avance no baja y `fin` con las 6 lleva `ms` (≥ 5 s). Tras el
        final se ignora lo demás. Si no, 400 `resultado_invalido`. Memorama: `opciones.gana` = `tiempo` (por omisión)
        o `errores`; otro → 400 `criterio_invalido`.
  - Al crear una carrera de Arcade, `opciones.mapa` es el nivel (`1-1`…`4-2`, solo niveles normales) o la pista
    (`pradera`, `desierto`, `hielo`, `volcan`); sin `mapa` el servidor elige uno al azar; uno que no existe → 400
    `mapa_invalido`. La revancha copia las opciones, así que repite el mapa.
  - `POST /juegos/sala/<código>/revancha` (cambio `revancha-partidas`) → `{ ok, codigo }` de la sala nueva, con
    quien la pidió dentro. Solo jugadores de la sala (403 `no_en_sala`) y con la partida terminada: empezada y con
    algún `final` o `podio` (409 `no_termino`); 404/410 como las demás. La primera petición reserva en la sala vieja
    `siguiente` (código nuevo) y `siguienteHost` (id de quien la abrió) con escritura condicional; la sala nueva se
    crea una sola vez (`put` con sha `null`) con el mismo juego, opciones y bots, y `siguienteHost` de anfitrión.
    Peticiones a la vez caen en la misma sala. Unirse a la nueva sigue las reglas de `unirse` (409 `ya_empezo` o
    `sala_llena`, y 503 `conflicto_escritura` si no se guardó quien la pide; los tres con `codigo`). Publica en Realtime la sala vieja y la nueva. Detalle en el `design.md` del cambio.
  - `GET /juegos/sala/<código>`: sala, jugadores y `ahora` (hora del servidor), solo para sus jugadores y
    el admin. Caché de 2 s. Lleva `viendo` (cuántas personas espectan).
  - **Espectador** (cambio `espectador-partidas`, cambios marcados `// espectador`):
    `POST /juegos/sala/<código>/espectar` registra a una persona con cuenta de Juegos en
    `juegos/salas/<código>/espectadores/<id>.json` `{ id, t }` (subcarpeta: no cuenta para asientos, `MESAS`, `empezar`,
    podio, revancha ni ranking; `/respuesta` sigue respondiendo 403 `no_en_sala`). Cupo `MAX_ESPECTADORES` = 30 (409
    `espectadores_llenos`); quien ya juega recibe 409 `ya_en_sala`; `{ salir: true }` lo quita; al unirse como jugador
    deja de espectar. Quien especta (y el admin) recibe en el GET la **vista pública** (`vistaPublica`: la misma que
    publica el canal; sin `canal`, `secreto`, flotas ni elecciones de ppt sin revelar, y Dibuja sin la palabra) con
    `espectador: true`, `soyHost: false` y `viendo`; el `rt` solo en los juegos en vivo de `ESPECTADOR_EN_VIVO`
    (Karts, Fútbol, Futbolito Arena y Brigada Xalli), para escuchar `vivo` en solo escucha. Matriz de acceso y modelo
    de amenaza en el `design.md` del cambio.
  - Juegos permitidos (`JUEGOS_PARTIDA`):
    - de preguntas: `en-vocab`, `en-frases`, `en-tiempos` (⏳ Máquina del tiempo, cambio `juegos-ingles-gramatica`;
      tope individual 2,000 en el catálogo), `es-ortografia`, `cultura` y `mente-calculo`;
    - 📜 Línea del tiempo (`cultura-linea`, ver «Línea del tiempo en sala»);
    - Basta (es/en) y Lotería;
    - ¡Una!, póker, Brisca, Conquián y ajedrez;
    - Gato, Conecta 4, Piedra-papel-tijera, Ahorcado y Serpientes (cambio `clasicos-rapidos`; ver la sección propia).
    - Futbolito y Billar (cambio `futbolito-billar`), 1 vs 1 por tiros. Futbolito acepta `opciones.formato`
      `1v1` (por omisión) o `2v2` (otro valor → 400 `formato_invalido`; cambio `futbolito-equipos-controles`).
    - Golf (cambio `golf`), de 2 a 4 personas por turnos, sin bots.
    - Los juegos absorbidos en el Sprint 4 (`en-preguntas`, `es-acentos`, `es-sinonimos` y `mente-secuencias`, del
      cambio `juegos-fusion`) responden 400 `juego_no_permitido`, pero siguen en el catálogo para conservar sus
      puntos.
    `opciones.rondas` va en Basta (`5`, `10` por defecto o `12`; otro valor → 400 `rondas_invalidas`).
    `opciones.extra` va en Basta (cambio `basta-divertida-una-robo`): arreglo o texto `"a,b"` con hasta
    `MAX_EXTRAS_BASTA` (2) ids de `EXTRAS_BASTA`, sin repetir; se guarda como `"a,b"` y la revancha lo hereda.
    Un id desconocido, repetido o más de 2 → 400 `extras_invalidas`.
    `opciones.tema` va en `en-frases` (`todo` por defecto, `tobe`, `presente`, `pasado` o `futuro`; otro valor → 400
    `tema_invalido`); los demás juegos lo ignoran.
    `opciones.modo` va en Lotería (`linea` o `llena`), y `respuesta` con `{ loteria: true }` guarda la hora
    del primer grito.
  - ¡Una! (`una`): `respuesta` con `{ jugada: { n, accion, carta?, color?, una? } }` se guarda con `t`
    (hora del servidor). Si otro jugador ya tiene ese paso `n`, responde 409 `turno_tomado`. El servidor
    no reproduce la partida: la reconstruye cada cliente con la semilla.
    `robar` y `pasar` no llevan `carta` ni `color` (si los traen → 400 `jugada_invalida`): `robar` = robar hasta poder
    tirar, y las cartas salen del mazo de la semilla (cambio `basta-divertida-una-robo`).
    `{ una: { paso } }` guarda `unas[]` `{ paso, t }`, el botón UNA. El castigo por segundos se calcula al
    reproducir: ≤ 2 s 0, ≤ 3 s 1, ≤ 4 s 2, ≤ 5 s 3 y sin UNA 4.
  - `validarJugada(juego, jugada)` valida cada juego por turnos y guarda solo los campos permitidos (cambio
    `cartas-espanolas`):
    - Cupo y bots por juego: salen de la tabla `MESAS` (ver [Mesas de las partidas](#mesas-de-las-partidas-cambio-mesas-con-bots);
      antes eran `CUPO` y `BOTS_FIJOS`, que ya no existen):
      - ajedrez `{ max: 2, min: 2, bots: "nunca" }` y Brisca `{ max: 4, asientos: 4, min: 4, bots: "siempre" }`;
      - con la sala completa, quien intenta unirse recibe 409 `sala_llena`;
      - el ajedrez no empieza con menos de 2 personas: 409 `faltan_jugadores`.
    - Futbolito y Billar (cambio `futbolito-billar`): `{ n, accion: "rendirse" }` o un tiro con enteros —
      Futbolito `{ n, accion: "tiro", pos −150…150, angulo −60…60, fuerza 10…100 }`; Billar `{ n, accion: "tiro",
      angulo 0…3599 (décimas de grado), fuerza 1…100, efecto? −100…100 }`; los demás campos se descartan. Con algún
      `final` o `podio` ya registrado, una jugada nueva responde 409 `partida_terminada` (solo en estos dos juegos).
      El servidor no simula: cada cliente reproduce los tiros con los motores deterministas de `juegos/`.
    - Golf (cambio `golf`): `{ n, accion: "rendirse" }` o `{ n, accion: "tiro", angulo 0…3599 (décimas de grado),
      fuerza 1…100 }` con enteros; los demás campos se descartan. También responde 409 `partida_terminada` tras un
      `final` o `podio` (conjunto `FISICA` de `server/salas.ts`). Se juegan 3 hoyos elegidos con la semilla
      (`Golf.hoyosSala`); el servidor no simula.
    - Futbolito por equipos (cambio `futbolito-equipos-controles`, `server/futbolito.ts`): el tiro lleva `barra`
      (entero 0…7; obligatoria en `2v2`, opcional en `1v1`; otro valor → 400 `jugada_invalida`). El servidor reparte
      los asientos igual que `Futbolito.repartir` de `juegos/futbolito-motor.js` (personas por `unido` hasta el cupo y
      bots que completan; preferencias de equipo primero, luego personas alternadas, luego bots; con dos por equipo, el
      primero maneja medios + delanteros y el segundo portero + defensa) y responde 409 `no_es_tu_barra` si la barra no
      es del asiento de quien tira, o 403 `no_en_mesa` si esa persona no tiene asiento. `rendirse` no lleva barra.
      Preferencia de equipo: `POST /juegos/sala/<código>/unirse { equipo: 0 | 1 }` (también para quien ya está
      dentro) → `{ ok, codigo, equipo }`; solo en Futbolito `2v2` (si no, 409 `sin_equipos`) y antes de empezar (409
      `ya_empezo`); otro valor → 400 `equipo_invalido`; si ya hay 2 personas que pidieron ese equipo → 409
      `equipo_lleno`. `server/futbolito_equipos_test.ts` compara el reparto del servidor con el de la página.
    - Fútbol Estelar en línea (`futbol`, cambio `futbol-en-linea`, `server/futbol_linea.ts`): mesa 1 vs 1 sin bots.
      Táctica: `POST /juegos/sala/<código>/unirse { tactica }` (también para quien ya está dentro) → `{ ok, codigo,
      tactica }`; formación de la lista y deslizadores enteros 0–100 (los que falten valen 50), si no 400
      `tactica_invalida` (también en otros juegos); tras empezar, 409 `ya_empezo`. Resultado: `POST
      /juegos/sala/<código>/respuesta { futbol: { goles: [anfitrión, invitado], ms, corte? } }`; cuenta solo el primero
      de cada quien; 400 `resultado_invalido` si los goles salen de 0–30, suman más de 1 + ms/10 000, o `ms` es menor
      a 10 s, mayor a 20 min o mayor al tiempo desde el inicio de la sala + 5 s. La respuesta y `GET` de la sala traen
      `futbol: { estado: confirmado | disputa | anfitrion | invitado | pendiente, goles, puntos: { <id>: n } }`
      (coinciden → confirmado; difieren → el del anfitrión «en disputa»; solo uno → ese). Puntos como el partido
      rápido (300/120/40 + 60 por gol hasta 6 − 20 por gol recibido; 0–1000).
    - Futbolito Arena (`futbolito-arena`, cambio `futbolito-arena`, `server/arena.ts`; reglas en
      `juegos/arena-motor.js`, que el servidor importa): opciones al crear `{ formato: "1v1" | "1v2" | "2v2" (por omisión)
      | "3v3", arena: "normal" | "grande" (3v3 siempre grande), goles: "3" | "5" | "7" }` (si no, 400
      `formato_invalido` / `arena_invalida` / `goles_invalidos`); mesa por formato con bots que ceden su lugar. Asiento:
      `POST /unirse { equipo: 0 | 1 }` (400 `equipo_invalido`, 409 `equipo_lleno` si ya lo pidieron las que caben, 409
      `ya_empezo`) y `{ robot: 0 | 1 | 2 }` (color en su equipo; 400 `robot_invalido`, también en otros juegos). Resultado:
      `POST /respuesta { arena: { goles: [🌊 Mar, 🔥 Sol], ms, corte? } }`, solo el primero; 400 `resultado_invalido` si
      un marcador pasa los goles de la sala, si suman más de 1 + ms/2500, o si `ms` sale de 5 s–5 min o del tiempo desde
      el inicio + 5 s. La respuesta y `GET` de la sala traen `arena: { estado: confirmado | disputa | anfitrion |
      invitado | pendiente, goles, puntos: { <id>: n } }` (puntos por equipo, como Fútbol Estelar). En el ranking
      (`POST /juegos/partida` con `sala`) los puntos los pone ese resultado (409 `resultado_pendiente` si aún no hay).
    - Brigada Xalli (`brigada`, cambio `brigada-xalli`, `server/brigada.ts`; reglas en `juegos/brigada-motor.js`, que el
      servidor importa): opción al crear `{ mision: "1"…"4" }` ("1" por omisión; si no, 400 `mision_invalida`); mesa
      `{ max: 8, asientos: 4, min: 1 }` (sin bots de 1 a 8 personas; con bots, compañeros IA hasta 4 asientos);
      personaje por asiento como Karts y Axo. Resultado: `POST /respuesta { brigada: { mision, ms, completada,
      puntos: { <id>: n }, corte? } }`, solo el primero; 400 `resultado_invalido` si la misión no es la de la sala,
      `ms` sale de 20 s–40 min o del tiempo desde el inicio + 5 s, algún id no es de la sala o algún puntaje pasa el
      máximo posible de la misión con esos personajes. La respuesta y `GET` de la sala traen `brigada: { estado:
      confirmado | disputa | anfitrion | invitado | pendiente, mision, completada, puntos, ranking: { <id>: n }, equipo }`
      (ranking = puntos / 20, tope 1000). En el ranking (`POST /juegos/partida` con `sala`) los puntos los pone ese
      resultado (409 `resultado_pendiente` si aún no hay).
    - Personaje de Karts y Axo (`karts` y `plataformas`, cambio `personaje-en-salas`, `server/personajes.ts`):
      `POST /juegos/sala/<código>/unirse { personaje }` (también para quien ya está dentro; quien no está entra con él
      si hay lugar, si no 409 `sala_llena`) → `{ ok, codigo, personaje }`. El id se valida contra
      `juegos/personajes.js`, que el servidor importa (misma lista, sin copia); id desconocido o sala de otro juego →
      400 `personaje_invalido`; tras empezar, 409 `ya_empezo`.
    - Ajedrez (`ajedrez`, cambio `ajedrez`): acepta dos formas de jugada.
      - `{ n, accion: "mover", de, a, promo? }`, donde `de` y `a` son casillas `a1`–`h8` y `promo` es `q`, `r`, `b`
        o `n`.
      - `{ n, accion: "rendirse" }`.
      - `opciones.reloj` puede ser `5`, `10` o `15`; si no se indica, vale `10`.
    - Brisca (`brisca`): `{ n, accion: "jugar", carta: 0..39 }`.
    - Conquián (`conquian`):
      - `pasar`;
      - `tomar` o `bajar` con `con` (hasta 8 cartas distintas entre 0 y 39) y `a?` (0..20);
      - `descartar` con `carta`.
  - Póker (`poker`, cambio `poker`): misma `jugada { n, accion, monto? }`.
    - `accion` ∈ `retirarse | pasar | igualar | subir | todo`;
    - `monto` es un entero múltiplo de 5, de 5 a 1,000,000 (fichas de 5 a 100, cambio `poker-fichas`), y `subir` lo exige;
    - no se permite `carta` (400 `jugada_invalida`);
    - se permite `opciones.equipos: "1"` al crear la sala.
    - Al reproducir, cada cliente valida la jugada con `juegos/cartas.js`. Una jugada inválida se ignora y, al vencer
      los 30 s, el jugador pasa o se retira.
  - Al terminar, `respuesta` acepta `{ final }` de cada jugador y `{ podio }`, que solo guarda el del host.
  - Juegos de tablero (cambio `juegos-tablero`; `server/tablero.ts` y `server/naval.ts`, ganchos `// juegos-tablero`
    en `server/salas.ts`). En el catálogo, `damas` ("Damas") y `naval` ("Batalla naval") son de `mente`, y `domino`
    ("Dominó") y `parchis` ("Parchís") de `clasicos`; los 4 con tope 1000. Sus mesas están en `MESAS`.
    - `validarJugadaTablero` (400 `jugada_invalida` si no cuadra):
      - Damas: `{ n, accion: "mover", ruta: [2..13 casillas 0–31] }` o `{ n, accion: "rendirse" }`;
      - Dominó: `{ n, accion: "jugar", ficha: 0–27, lado: "i" | "d" }`;
      - Parchís: `{ n, accion: "mover", ficha: 0–3 }`.
    - Las reglas de esos 3 juegos se reproducen en cada navegador con `juegos/tablero.js`, como en los juegos de
      cartas.
    - **Batalla naval se arbitra en el servidor.** `respuesta` acepta:
      - `{ flota: [[c…]×5] }`: una sola vez; 400 `flota_invalida` o 409 `flota_lista`;
      - `{ jugada: { n, accion: "disparar", c: 0–99 } }`: el servidor calcula el turno (tras «agua» cambia) y guarda
        `r: "agua" | "tocado" | "hundido"` y, al hundir, `barco`. Errores: 409 `falta_flota`, `no_es_tu_turno`,
        `turno_tomado` (`n` distinto del siguiente paso) o `partida_terminada`, y 400 `ya_disparaste`;
      - `rendirse` y `reclamar`: este último solo si al rival le toca y lleva 90 s sin jugar; si no, 409 `aun_no`.
    - `vistaJugadores` quita la `flota` del rival en `GET /juegos/sala/<código>`. El broadcast de Realtime no lleva
      ninguna flota. Al terminar se revelan las dos. **Nunca agregues una ruta o un aviso que devuelva los archivos
      de jugador de una sala de `naval` sin pasar por `vistaJugadores`.**
  - Cada sala nueva se agrega al índice `juegos/salas-semana/<lunes>.json`.
- **`GET /juegos/admin/resumen?semana=`** (solo admin, 403 para los demás):
  - `jugadores`: todos los de la semana, con `total`, `totalIndividual`, `totalPartidas`, mejores, partidas y última vez;
  - `salas`: juego, anfitrión, fecha, jugadores con su `final` y el podio;
  - `catalogo`: nombre de cada juego.
  - No incluye correos.
  - Sincronía por reloj; los bots los calcula el cliente con la semilla.
  - La identidad del jugador se guarda en caché 60 s para no releer el registro de Inglés ni Notion (Secundaria) en
    cada sondeo. La lista de
    invitados siempre se lee fresca.
- **Avatar:**
  - `POST /juegos/avatar` `{ emoji, color }`, solo con valores de `AVATARES` (32) y `COLORES` (10); si no,
    400.
  - Se guarda en `juegos/perfiles/<id>.json`; mientras no se elige, hay uno por defecto a partir del id.
  - `/juegos/yo` incluye `jugador.avatar` y las listas.
  - El ranking, las salas y el resumen del admin incluyen `avatar`.
- **Foto como avatar** (`avatar-foto`):
  - `POST /juegos/foto` `{ imagen, acepto: true }`: `imagen` es un data URL JPEG (`FF D8 FF`) de hasta
    40 000 caracteres, ya reducido a 128×128 por el navegador. Sin `acepto` → 400 `debe_aceptar`; si no es
    JPEG o es grande → 400 `imagen_invalida`.
  - El avatar queda `{ emoji, color, foto: <token> }` (24 hex aleatorios). Subir otra foto, elegir
    personaje (`POST /juegos/avatar`) o que el admin la quite borra el archivo anterior.
  - `GET /juegos/foto/<token>`: sin correo (lo pide un `<img>`); bytes JPEG, `Cache-Control: max-age=3600`;
    404 si no existe.
  - Solo admin: `GET /juegos/fotos` (lista activa) y `POST /juegos/fotos/quitar` `{ id }` (403 para el
    resto; 404 si ese jugador no tiene foto).
- **Catálogo (`CATALOGO`):** con la fusión del Sprint 4 cambian dos títulos: `en-frases` es "Completa y responde" y `mente-calculo` es "Cálculo y secuencias". Los ids absorbidos se conservan para el historial. Arcade (`juegos-plataformas-karts`): `plataformas` ("Axo y los 12 mundos") y `karts` ("Karts Turbo"), categoría `arcade`, tope 2000; con `en-tiempos` (`juegos-ingles-gramatica`), 24 en el menú; con los clásicos rápidos (`clasicos-rapidos`: `gato`, `conecta4`, `ppt`, `ahorcado` y `serpientes`, categoría `clasicos`, tope 1000, títulos en `CATALOGO_CLASICOS_RAPIDOS`), 29; con los 4 de tablero (`juegos-tablero`: `damas`, `domino`, `parchis` y `naval`), 33; con las salas grandes (`juegos-salas-grandes`: `bingo` ("Bingo") y `blackjack` ("Blackjack (21)") en `clasicos` y `dibuja` ("Dibuja y adivina") en `ingles`, tope 1000), 36; con la 📜 Línea del tiempo (`cultura-linea`, `cultura-conocimiento`), 37; con `futbolito` ("Futbolito") y `billar` ("Billar bola 8"), categoría `arcade`, tope 1000 (cambio `futbolito-billar`), 39; con `golf` ("Golf", `arcade`, tope 1000, cambio `golf`), 40. Con `futbol` ("Fútbol Estelar 2010", `arcade`, tope 1000, cambio `futbol-estelar`) entra al menú y Futbolito sale de él (su id `futbolito` sigue en `CATALOGO` por el historial y las salas en curso): siguen 40 tarjetas. Juegos previos: 21 (`en-preguntas`, "Responde en inglés", tope 2000; `mente-sudoku`, "Sudoku", tope 2000, cambio `sudoku-niveles`; `dragon-run`, "Dragon Run", tope 2000, cambio `dragon-run`; categoría `arcade` desde `dragon-run-misiones`). Clásicos (`juegos-clasicos`): `basta-es` y `basta-en` (tope 1500),
  `una` y `loteria` (tope 1000).

**CORS y peticiones** (cambio `ahorro-peticiones`): las páginas mandan los POST con `Content-Type: text/plain` (petición
simple, sin verificación previa). El servidor lee JSON con `req.json()`/`req.text()` sin importar el `content-type`, y
`OPTIONS` responde con `Access-Control-Max-Age: 86400`. Al agregar rutas POST, no exijas `application/json`.

**Salas en tiempo real** (`server/realtime.ts`, cambio `salas-realtime`): con `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_KEY` (proyecto Supabase *Portafolio*, compartido con el portafolio):
  - cada sala nace con `canal` (24 hex secretos). Solo se entrega dentro de `rt: { url, key, topic }` en
    `GET /juegos/sala/<código>`, y solo a quien está en la sala (y a quien especta un juego en vivo, en solo escucha:
    cambio `espectador-partidas`);
  - tras `unirse`, `empezar` y `respuesta`, `publicarSala` hace un broadcast REST
    (`POST /realtime/v1/api/broadcast`, evento `estado`, payload `{ sala, jugadores, ahora }`, sin correos), con
    tope de 3 s. Si falla, se registra y la respuesta sigue igual;
  - la llave de servicio debe ser un JWT (`service_role`) o una `sb_secret_…` completa; nunca va al navegador ni al repo;
  - sin las tres variables no hay `rt` y las salas funcionan con sondeo.

**Salud y vigilancia** (`server/salud.ts`, `server/vigilancia.ts`, cambio `vigilancia-servidor`):
  - `GET /salud` (sin correo) responde `{ ok, estado, motivo?, github: { limite, usadas, restantes, reinicio }, revisado }`.
    `estado`: `ok`, `advertencia` (menos del 10 % restante) o `bloqueado` (0 restantes o el repo no responde, 503).
    Consulta `/rate_limit` de GitHub, que no cuenta contra el límite, y nunca expone el token.
  - El workflow `.github/workflows/vigilancia.yml` la revisa cada 30 min (cambio `ahorro-peticiones`). Si hay bloqueo o caída, abre un issue con la
    etiqueta `vigilancia` que menciona a @jalducin (GitHub le manda el correo) y lo cierra al recuperarse, sin repetir
    avisos. Para probarlo a mano: Actions → "Vigilancia del servidor" → Run workflow con `forzar`.

**Almacén y límite de GitHub** (`server/store.ts`, cambio `github-etag-cache`):
  - `GitHubStore.get` y `list` usan peticiones condicionales: guardan el `ETag` por ruta y mandan
    `If-None-Match`. Un 304 usa la copia en memoria y **no cuenta contra el límite** de 5,000 por hora.
  - Si GitHub responde por límite agotado (403/429 con `x-ratelimit-remaining: 0`, `retry-after` o el mensaje de
    *rate limit*), se sirve la última copia; sin copia se lanza `github_rate_limit` y `main.ts` responde
    `503 { error: "mucho_trafico" }`. Juegos e Inglés lo muestran como "Hay mucha actividad…".
  - `put` y `remove` invalidan la copia de la ruta y la lista de su carpeta. La caché es por instancia, con tope
    de 3,000 entradas.
  - Incidente que lo motivó (2026-10-02): las partidas consultan cada 2.5 s y cada consulta leía varios
    archivos; con varias instancias de Deno se superó el límite y cayeron todas las rutas.

**Caché y single-flight** (`server/cache.ts`, `server/http_cache.ts`, cambio `cache-estabilidad`; decisiones en su
`design.md`). Fuente canónica de las reglas de caché del servidor:
  - Toda caché en memoria nueva usa `crearMemo({ ttlMs, staleMs?, max? })`: vigencia, **single-flight** (las cargas
    simultáneas de una clave comparten una promesa) y, si se pide, la última copia cuando la fuente falla. `borrar(clave)`
    quita también la carga en vuelo. Para coalescer sin guardar, `unaALaVez()`. No escribas otro `Map` con `Date.now()`.
  - Vigencias: filas de Notion 60 s por base (copia hasta 10 min si Notion falla; marcar «Completado» las borra),
    usuarios de Notion 10 min, contenido de actividades 60 s, semana de Juegos 30 s, marcas de migración 60 s. Las
    lecturas de `GitHubStore` coalescen por ruta (además del ETag) y `put`/`remove` olvidan la lectura en vuelo.
  - `loadRows` entrega una copia (`structuredClone`): quien la recibe puede modificar sus filas.
  - Caché HTTP: `handler` pasa cada respuesta por `aplicarCacheHttp` con `politicaCache(ruta)`. Por omisión todo es
    `no-store` (datos personales: no se guardan en el aparato). Solo `GET` con 200 de estas rutas:
    `/config` → `public, max-age=600`; `/interruptores` → `public, max-age=60`; `/juegos/ranking` y `/juegos/ranking/juegos` → `private, no-cache`, `Vary: Authorization`, `ETag` débil y
    304 si `If-None-Match` coincide. Una ruta nueva entra a la lista solo si no lleva datos de una persona.

**Pronunciación** (`server/motor.ts`, cambio `pronunciacion`):
  - `similitudPronunciacion(frase, oido)`: LCS de palabras ÷ palabras de la frase, tras normalizar (minúsculas,
    sin acentos ni puntuación) y expandir contracciones (I've = I have, can't = can not…).
  - Correcta si ≥ `UMBRAL_PRONUNCIACION` (0.8); `auto:ok` cuenta como correcta y `auto:repetir` no. Respuesta ≤ 300
    caracteres. La revisión muestra lo reconocido y la frase.
  - El patrón de la ruta del profe incluye el viernes (pronunciación).

**Ordenar y emparejar** (`server/motor.ts`, cambio `ejercicios-ordenar-emparejar`):
  - `publicQuestion(e, semilla)`: `server/actividades.ts` pasa `"<id>|<slug o admin>|<intento>"`. `ordenar` publica
    `fichas` (`palabras` + `distractores`) y `emparejar` publica `izquierda` en orden y `derecha` barajada. Ambas se
    barajan con `mulberry32(hashSeed(semilla|id))` y nunca quedan en el orden correcto (si coincide, se rota una
    posición). Nunca salen `palabras`, `distractores`, `aceptadas` ni `pares`.
  - `ordenar`: la respuesta es un texto (≤ 300). Es correcta si `normalizeText` coincide con `palabras` unidas o con
    una de `aceptadas`.
  - `emparejar`: la respuesta es un arreglo del largo exacto de `pares`, con `""` (sin unir) u opciones de la
    derecha, y al menos un par. Si no cumple, se descarta completa. Es correcta solo si coinciden todos los pares.
  - Revisión: `ordenar` muestra lo armado y la oración correcta; `emparejar`, `"this → este / esta · that → — · …"`
    con los pares propios y los correctos.
  - `validateItem` revisa:
    - `ordenar`: al menos 2 `palabras`, sin fichas repetidas entre `palabras` y `distractores`;
    - `emparejar`: de 3 a 6 pares de 2 textos, sin textos repetidos en un mismo lado.

**Ruta `/ingles/profe/actividades[/<id>]`** (`handleProfe` en `server/actividades.ts`, cambio `ruta-profe`):
  - solo admin (si no, 403); atiende al admin como el alumno "Profe" (estado, intentos, corrección y guardado);
  - usa el ámbito `AMBITO_PROFE` (`contenido/profe/`); el listado agrega `plan` (`null` sin `plan.json`);
  - `semana` y `semanaSiguiente` son siempre las del grupo (cambios `profe-semanas-del-grupo` y
    `profe-grupo-y-ruta-ia`). Si el profe tiene ruta propia, la respuesta agrega `semanaPropia` y
    `semanaSiguientePropia` (misma forma `{ id, titulo, ids }`, solo cuando existen; el domingo la siguiente). Sin
    ruta propia no vienen y la respuesta queda igual; `/ingles/actividades` nunca las trae;
  - incluye además los elementos del grupo (`actividad`, `examen`, `refuerzo` de todas las semanas subidas y los
    exámenes sueltos; sin Meet) con `grupo: true`, abiertos ya y con fecha límite el día anterior a que abran para el
    grupo (`paraProfe`, cambio `profe-actividades-grupo`). Sus intentos van a `resultados/<id>/profe.json`, que
    `resultadosDe` excluye: el profe nunca cuenta como alumno en las vistas del grupo;
  - `handleActividades`, `loadItem`, `visibleItems` y `validarSemana` reciben el ámbito (por defecto
    `AMBITO_CLASE`). El grupo nunca ve los elementos del profe, ni en su lista ni por id.
  - Validar una semana del profe: `deno run --allow-read server/validar_semana.ts <datos> <lunes> --profe`
    (patrón lun actividad, mié examen, jue actividad, sáb examen).
  - Validar una semana de Secundaria: `deno run --allow-read server/validar_semana.ts <datos> <lunes> --secundaria`
    (`contenido/secundaria/`, sin patrón de días; cambio `secundaria-mis-clases`). `meta` deja pasar `materia`.
  - Adelantar en Secundaria (cambio `secundaria-adelantar`): `meta` deja pasar `dia` (día del horario; formato en
    docs/data-model.md) y `visibleItems` lista también las clases de semanas futuras que ya abrieron
    (`disponibleDesde` ≤ hoy), como la ruta del profe. El grupo de Inglés sigue viendo solo semanas iniciadas.

**Postgres de Inglés** (`server/db.ts`, `server/grupos.ts`, cambio `ingles-grupos`):
  - `createDb({ url, key, prefijo })` es un cliente PostgREST hecho con `fetch`:
    - operaciones `select`, `insert`, `upsert`, `update` y `remove`;
    - límite de 5 s por petición;
    - si falla, lanza `DbError`.
  - `PgStore(db, base, prefijos)` implementa `Store` para los prefijos activos:
    - `PREFIJOS_INGLES`: `alumnos.json`, `resultados/` y `avance/`;
    - `PREFIJO_JUEGOS`: `juegos/`.
    - Las demás rutas, como el contenido, van al almacén base.
    - Sin respaldo (cambio `cierre-tecnico`): los errores de Postgres se propagan y la ruta responde 503.
  - `getStore()` usa `PgStore` solo si existen `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`. Los prefijos se activan
    según las marcas, que se revisan cada 60 s:
    - `meta/migrado` activa Inglés;
    - `meta/migrado-juegos` activa `juegos/`.
    - Sin marcas, se usa GitHub como antes.
  - Inglés sin Notion (cambio `cierre-tecnico`): la fase 1 importó al registro a las personas de Notion con correo
    (`origen: "notion"`); desde la fase 2 Inglés ya no lee Notion y esa importación se retiró.
  - Rutas de grupos, solo admin:
    - `GET /ingles/grupos` → `{ grupos, miembros: { slug: grupo } }` (sin quienes están de baja de Inglés); cada
      grupo trae `ocultoAdmin` (boolean, columna `oculto_admin`);
    - `POST /ingles/grupos` crea o edita un grupo. Errores: `nombre_invalido`, `meet_invalido` (debe ser
      `https://`), `color_invalido`, `id_invalido`;
    - `POST /ingles/grupos/mover { alumno, grupo }` cierra la inscripción vigente y abre una nueva. Si es el mismo
      día, solo corrige el grupo. Error: `grupo_inexistente`.
    - `POST /ingles/grupos/ocultar { grupo, oculto: boolean }` (cambio `ingles-ocultar-grupos`): enciende o apaga
      `oculto_admin` con un `PATCH` de esa sola columna (editar el grupo con `POST /ingles/grupos` no la toca).
      Responde `{ ok, grupo }` o `{ ok, sinCambio: true, grupo }`. Errores: 403 `solo_admin`, 400 `json_invalido`,
      `oculto_invalido` (no boolean) y `grupo_inexistente`. No toca inscripciones ni datos de alumnos y alumnas: la
      bandera no viaja en `/ingles/actividades` ni la leen `/ingles/data` o `/perfil`.
    - Sin base migrada responden 503 `sin_base` (salvo `/baja` y `/reactivar`, que solo escriben `alumnos.json`).
    - `POST /ingles/grupos/baja { email }` y `POST /ingles/grupos/reactivar { email }` (cambio `ingles-baja-alumno`,
      `handleBajaIngles` en `server/alumnos.ts`): ponen o quitan `baja: "AAAA-MM-DD"` (hoy en CDMX) en su entrada de
      `alumnos.json`. Responden `{ ok, alumno: { email, nombre, alta, …, baja? } }`; si ya estaba así,
      `{ ok, sinCambio: true, alumno }` sin escribir. Errores: 403 `solo_admin`, 400 `json_invalido`, 404 `not_found`
      (correo fuera del registro), 503 `conflicto_escritura`. No borran resultados, avance, borradores ni
      inscripciones.
  - `POST /ingles/alumnos` acepta `grupo`, que inscribe a la persona desde su `inicio`.
  - `GET /ingles/actividades`, vista de alumno o alumna:
    - filtra por el `grupos` de cada semana;
    - devuelve `grupo { id, nombre, nivel, horario, meet_url, color }`.
  - En la vista de admin, cada elemento trae `grupos` cuando su semana los declara.

**Tablero del profe, racha y prórroga** (`server/resumen.ts`, cambio `ingles-pro`):
  - `GET /ingles/resumen?grupo=<id>` (solo admin; si no, 403 `solo_admin`) →
    `{ hoy, grupo, semana: { id, titulo }, columnas, filas, kpis, ocultos, avisos }`:
    - `columnas`: elementos con entrega de la semana actual (`{ id, tipo, titulo, disponibleDesde, fechaLimite }`);
    - `filas`: una por alumno o alumna del registro (sin el profe), en orden alfabético, con `grupo` y
      `celdas[id] = { estado, porcentaje?, fueraDeTiempo?, intentos?, prorroga? }`. `estado`: `hecho`, `atrasado`,
      `hoy`, `pendiente`, `proximamente` o `no-aplica` (la semana es de otro grupo, o vence antes de su lunes de inicio).
      Usa la fecha propia de cada quien (`prorrogas`);
    - `kpis`: `alumnos`, `aTiempo` (% de lo vencido o entregado que se entregó a tiempo; `null` si no hay nada),
      `promedio` (del mejor intento de lo entregado), `atrasos` y `sinEntregas` (nombres sin entregas esta semana que ya
      tienen algo abierto; no se registran visitas, así que "quién no ha entrado" se aproxima así).
    - `?grupo=` filtra solo con la base migrada (sin ella se ignora). Acepta `?hoy=` con `PERMITIR_HOY=1`.
    - Grupos ocultos del panel (cambio `ingles-ocultar-grupos`): por omisión quedan fuera de `filas` y `kpis` los
      alumnos y alumnas cuyo grupo efectivo tiene `oculto_admin`; `?ocultos=1` (o `?grupo=<id>` de ese grupo) los
      incluye. La respuesta trae `ocultos` (cuántos quedaron fuera).
    - Se calcula en el servidor sobre el almacén: con `PgStore`, `leerCarpeta` trae los resultados de cada columna en
      una sola consulta (`path=like.resultados/<id>/*`). No agrega tablas, vistas ni funciones a Postgres.
    - No se cae por una lectura (cambio `fix-ingles-admin`): no consulta Notion; cada columna lee sus resultados con
      un reintento y, si falla, queda fuera de `columnas` y de `kpis` con `avisos: ["resultados_incompletos"]`; si
      fallan los grupos, sale sin filtrar con `avisos: ["grupos_no_disponibles"]`. `avisos` siempre viene (vacío si
      todo se leyó).
**Panel del profe en una petición** (`server/panel.ts`, cambio `panel-profe-peticiones`):
  - `GET /ingles/panel[?grupo=<id>][&ocultos=1]` (solo admin; 403 `solo_admin` a cualquier otra persona, 401 sin
    sesión) → `{ grupos, alumnos, resumen, entregas, fallas }`, leído en paralelo con los mismos manejadores de las
    rutas sueltas (filtros, ocultos y bajas idénticos):
    - `grupos`: el cuerpo de `GET /ingles/grupos` (`{ grupos (con ocultoAdmin), miembros }`); sin la base migrada,
      `{ error: "sin_base" }` (no cuenta como falla);
    - `alumnos`: el registro como `[{ nombre, baja? }]`, **sin correos** (los correos solo en `GET /ingles/alumnos`);
    - `resumen`: el cuerpo de `GET /ingles/resumen` con los mismos `grupo` y `ocultos` (y `hoy` con `PERMITIR_HOY=1`);
    - `entregas`: `{ pendientes, porRevisar }` de la bandeja: el total de entregas listas (Inglés y Secundaria) y los
      slugs de las misiones de Inglés listas para evaluar; sin textos;
    - `fallas`: partes que fallaron. Cada una viaja como `{ error, detalle? }` (`detalle` ≤ 200 caracteres; solo lo
      recibe el admin) y las demás llegan completas.
  - `GET /ingles/data?incluir=panel`: si quien pide es el admin, el panel se arma en paralelo con las filas y viaja como
    `panel` en la misma respuesta (respeta `grupo` y `ocultos`). Para cualquier otra persona el parámetro se ignora.
  - Las rutas sueltas no cambian: el panel solo las junta para abrir más rápido.
  - Racha: `GET /ingles/actividades` (alumno o alumna) agrega `racha: { dias, hoy }`, calculada con `calcularRacha`
    (`motor.ts`) sobre los `enviadoEn` de sus intentos, en fecha de CDMX. Cuenta días seguidos hasta hoy o, si hoy aún no
    entrega, hasta ayer. No hay ruta `/ingles/racha`: viaja con la lista para no gastar otra petición.
  - `POST /ingles/actividades/<id>/prorroga` `{ alumno, fecha | null }` (solo admin) escribe `prorrogas[slug]` en el
    JSON del elemento (`contenido/actividades` o `contenido/examenes`, con su `sha`); `fecha: null` la quita. Errores:
    403 `solo_admin`, 400 `alumno_invalido` / `fecha_invalida` (formato o antes de `disponibleDesde`), 404, 503
    `conflicto_escritura`. La lista del admin trae `prorrogas` por elemento.

**Rutas `/ingles/alumnos`** (`server/alumnos.ts`, cambio `alta-alumnos`), solo admin (si no, 403):
  - `GET /ingles/alumnos` → `{ alumnos: [{ nombre, emails, origen: "registro", alta, inicio?, baja? }] }`: solo el registro
    (`handleAlumnos` recibe `filas: () => Promise.resolve([])`; Inglés ya no lee Notion);
  - alta nueva: `inicio` es el lunes siguiente en CDMX (`lunesDeInicio`). `GET /ingles/actividades` omite, para esa
    persona, lo que vence antes de `inicio` y devuelve `inicio` (cambio `inicio-lunes-alumnos`);
  - `POST /ingles/alumnos` `{ nombre, email }` → alta en `alumnos.json`. 400 `correo_invalido` o
    `nombre_invalido`; 409 `correo_en_uso` (ya tiene acceso) o `nombre_en_uso` (ese nombre ya tiene correo);
  - `POST /ingles/alumnos/quitar` `{ email }`: quita a una persona del registro (404 si no está).
  - El nombre "Profe" está reservado para la ruta del profe (409 `nombre_en_uso`).
  - `filasIngles()` = `aplicarAlumnos([], registro)` (fase 2 de `cierre-tecnico`): una fila de identidad
    `source: "registro"` (sin tarea) por persona del registro, sin consultar Notion. Portal, `/ingles/data`,
    actividades, resumen y Juegos la reconocen. `GET /ingles/data` devuelve solo esas filas.
  - Bajas de Inglés (cambio `ingles-baja-alumno`): `filasIngles()` (registro completo) sigue para identidad (`/perfil`,
    Juegos, `/juegos/registro`, `/auth/*`); `filasInglesActivas()` (sin `baja`, `sinBajas`) la usan `GET /ingles/data`,
    `GET /ingles/resumen` y `GET /ingles/actividades`. A la persona de baja: `GET /ingles/data` → 200
    `{ rows: [], isAdmin: false, baja: true }` (sin la fecha), `/ingles/actividades` → 403 `baja_ingles` y `/perfil`
    → `accesos.ingles: false` (nombre, Secundaria y Juegos sin cambio; su jugador sigue siendo `a-<slug>`).

**Ruta `GET /perfil`** (`server/perfil.ts`; correo de la sesión o, en la transición, `?email=`):
- Devuelve `{ email, isAdmin, nombre, conocido, invitado, accesos: { ingles, secundaria, juegos } }` para
  el portal. Un invitado registrado (`juegos/invitados.json`) llega con `invitado: true` y solo Juegos.
- Mismas reglas que `/ingles/data` y `/secundaria/actividades`; sin filas ni correos ajenos.

**Identidad de Secundaria** (cambio `secundaria-sin-notion`, `server/secundaria_registro.ts`):
- `filasSecundaria()` en `server/main.ts` la usan `/perfil`, `/secundaria/actividades`, Juegos, `/juegos/registro` y
  `/auth/*`. Filas del registro completo (`leerRegistro`, con bajas) con `secundaria: true` o con su slug en `alumnos`
  de algún elemento visible de Secundaria (`visibleItems(…, AMBITO_SECUNDARIA)`). Slug: `slugSecundaria`; si no, el
  canónico del contenido (el primero del arreglo `alumnos` donde aparece el slug de su `nombre`, `slugsExclusivos`);
  si no, el de `nombre`. Se pasa en `Identidad.slug`.
- Caída temporal (seguimiento: quitarla): si nadie tiene Secundaria, filas de Notion solo con `NOTION_TOKEN` o
  `ROWS_FIXTURE`, con aviso `console.warn` (≤ 1 cada 10 min por mensaje); si Notion falla → `[]`, nunca 500.
- `GET /secundaria/actividades` del admin: `alumnas: [{ nombre, slug }]`; con `?alumna=<slug>` (solo GET de la lista)
  la vista de esa alumna con `isAdmin: true` y `vistaDe`; desconocida → 404 `alumna_no_encontrada`. Para los demás
  el parámetro se ignora.
- `POST /ingles/grupos/secundaria { email, secundaria: boolean }` (solo admin, `handleSecundariaAlumno`): marca o quita
  `secundaria: true`; al marcar guarda `slugSecundaria` si su slug de Notion difiere; al quitar lo conserva.
  `GET /ingles/alumnos` incluye `secundaria: true`.
- Sin `email` responde 400.

**Ruta `/ingles/data/<pageId>/completado`**: retirada en la fase 2 de `cierre-tecnico` junto con
`server/completar.ts` (Inglés ya no tiene tareas de Notion); responde 404 `not_found`. Los `avance/<slug>.json` que
escribía quedan como historial.

**Pruebas:** `DATA_DIR=<copia del repo de datos> npx -y deno test --allow-env --allow-read` en `server/`
(sin `DATA_DIR` se omiten las de integración; `semana_test.ts` usa datos inline y corre siempre).

**Cargar una semana nueva:** skill `nueva-semana-ingles` (`ai-specs/skills/`). Se prepara el fin de
semana anterior, se valida con la CLI y se sube al repo de datos. Aparece sola su lunes.

### Misiones principales (cambio `rpg-fase2-misiones`, `server/misiones.ts`)

Formatos en [data-model.md](data-model.md) § «Misiones principales». Identidad por `personaMision` (`server/main.ts`):
admin, alumna de Secundaria, alumno activo de Inglés (con su grupo), de baja de Inglés o sin acceso. Matriz completa en
`openspec/changes/rpg-fase2-misiones/proposal.md`.

| Ruta | Quién | Respuesta |
|---|---|---|
| `GET /misiones[?alumna=<slug>]` | con sesión | `{ isAdmin, hoy, mundos o null, misiones: [{ …misión sin respuestas, ambito, entrega, evaluacion, xp }] }`. Admin: todas las de Secundaria sin entregas (o lo que ve una alumna). Baja: solo sus entregas, `soloLectura`. Sin acceso 403 |
| `POST /misiones/<id>/entrega` `{ paso, texto }` | alumna o alumno | 200 `{ ok, paso, tarde, completos, totalPasos, entrega }`. JSON (`application/json` o `text/plain`). 400 `tipo_no_permitido` con archivo, multipart o `tipo` ≠ texto; 400 `entrega_invalida` vacía, > 4 000 o paso inexistente; 404 ajena o aún no visible; 409 `ya_evaluado`; 403 admin, baja o sin acceso; 503 `sin_guardar` si falla el almacén o no hay Postgres |
| `GET /profe/entregas` | admin | `{ entregas: [{ mision, slug, nombre (de pila), estado (lista, correccion, en-progreso o evaluada), desde, pasos, evaluacion, historial, xp }], pendientes }`, de la más antigua a la más nueva |
| `POST /profe/entregas/<id>/<slug>/evaluar` `{ puntos: { <criterio>: n }, comentario? }` | admin | 200 `{ evaluacion }`; 400 `rubrica_invalida`; 409 `incompleta`; 404 |
| `POST /profe/entregas/<id>/<slug>/correccion` `{ pasos, motivo, privacidad }` | admin | reabre los pasos (borra el texto si `privacidad`) y quita la evaluación; 400 `correccion_invalida` |
| `POST /profe/entregas/<id>/<slug>/borrar`, `POST /profe/entregas/persona/<slug>/borrar` | admin | borran el texto y conservan la evaluación (la XP no cambia) |
| `POST /practica/comprobar` `{ itemId o misionId, practicaId, respuesta }` | con sesión | `{ correcta, pista }`; clases solo de Secundaria; misiones visibles para la persona (también de Inglés); 404 si no le es visible; 403 baja o sin acceso |

Toda `/profe/entregas*` responde 403 a quien no es admin y 401 sin sesión. Ninguna respuesta lleva correos; a
estudiantes la misión va sin `alumnos` ni `grupos`. Una entrega con el contenido borrado antes de evaluar ya no se puede
evaluar (409 `incompleta`). El
contenido de misiones y mundos va en caché 60 s por ámbito (`limpiarCacheMisiones`). La teoría de las clases se
publica con `teoriaPublica` (sin `correcta`/`aceptadas` de su práctica).

---

# Versión anterior: Supabase Edge Function

## 1. Fuente de verdad y despliegue

- El código de la función vive en `supabase/functions/tareas-estudio-secundaria/index.ts`.
  **Lo desplegado debe ser idéntico a lo versionado.** Prohibido editar y desplegar la función
  directamente (desde el dashboard o MCP) sin que el cambio esté en el repo.
- Despliegue (desde la raíz del repo):
  `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api`.
  Tras desplegar, anotar la versión resultante en el reporte del cambio.
- Archivos: `index.ts` (HTTP + llamadas a Notion), `rows.ts` (lógica pura: extracción y filtrado),
  `rows_test.ts` (pruebas).
- Pruebas: `npx -y deno test supabase/functions/tareas-estudio-secundaria/rows_test.ts`
  y verificación de tipos con `npx -y deno check supabase/functions/tareas-estudio-secundaria/index.ts`.

## 2. Configuración y secretos

- Secretos solo en variables de entorno de Supabase (`NOTION_TOKEN`). Nunca en el código ni en el repo.
- Correos de administración, IDs de bases y demás configuración sensible se leen de variables de
  entorno. El repo es **público**: un correo de admin escrito en el código funciona como llave pública.
- Documentar cada variable de entorno nueva en este archivo (§6).

## 3. Contrato HTTP

| Ruta | Método | Parámetros | Respuesta 200 |
|---|---|---|---|
| `/data` | GET | `email` (obligatorio) | `{ rows: SecundariaRow[], isAdmin: boolean, generatedAt: ISO }` |
| `/ingles/data` | GET | `email` (obligatorio), `incluir=panel` (opcional) | `{ rows: InglesRow[], isAdmin: boolean, panel?, generatedAt: ISO }` (`panel` solo para el admin con `incluir=panel`) |
| cualquier ruta | OPTIONS | — | 200 con CORS |
| cualquier otra | GET | — | `404 { error: "not_found" }` |

### Exámenes (`/ingles/examenes`)

| Ruta | Método | Quién | Respuesta |
|---|---|---|---|
| `/ingles/examenes` | GET | alumno / admin | Lista con `estado` (`proximamente`, `disponible`, `resuelto` + `resultado`); el admin recibe `resultados` de todos |
| `/ingles/examenes/<id>` | GET | alumno (desde `disponibleDesde`) / admin (vista previa) | Preguntas **sin** `correcta` ni `explicacion`; 403 `no_disponible`; 409 `ya_resuelto` |
| `/ingles/examenes/<id>` | POST `{ respuestas }` | alumno / admin | Calificación inmediata: porcentaje, `nivelSugerido`, temas con `estado` y `retroalimentacion`, `fortalezas` / `enProgreso` / `debilidades`, `revision`. El admin no guarda (`guardado: false`) |
| `/ingles/examenes/<id>/resultados/<alumno>` | DELETE | solo admin | Reinicia el intento de un alumno |

- Definiciones: `supabase/functions/tareas-estudio-secundaria/examenes/*.json` (formato en `docs/data-model.md`).
  Motor puro en `examenes.ts`; rutas en `examenes_http.ts`.
- Resultados: Supabase Storage, bucket privado `examenes`, `resultados/<id>/<alumno>.json`, un intento por
  alumno y sin correos. La función crea el bucket si no existe. `?prueba=1` (solo admin) escribe
  `_prueba-admin.json`, que se oculta de los listados.
- Fechas en hora de CDMX (`America/Mexico_City`): se puede resolver desde `disponibleDesde`; después de
  `fechaLimite` se acepta, pero se guarda con `fueraDeTiempo: true`.
- Riesgo aceptado: las respuestas están en el repo público; ver el cambio `examen-diagnostico-a1`.

Errores: `400 { error: "missing_email" }`, `500 { error: "upstream_error" }` (el detalle va al log con la ruta; solo
el admin lo recibe además en `detalle`, ≤ 200 caracteres; cambio `fix-ingles-admin`).
Las filas **no** incluyen `userIds` ni `userEmails`; solo `userNames`. Las filas de Inglés incluyen además `calificacion`, `dificultad` y `editadoEn`. Los campos de cada fila están en
`docs/data-model.md` y los tipos en `rows.ts`. Cambiar el contrato exige actualizar
este documento y todas las páginas consumidoras en el mismo cambio.

## 4. Seguridad y privacidad

- **Menor exposición posible**: la respuesta incluye solo los campos que la UI muestra. No devolver
  correos de otros usuarios a quien no sea admin.
- La autorización se decide **en el servidor**; el cliente no filtra por permisos.
- Riesgo conocido: hoy la identidad es "el correo que escribes", sin verificar. Cualquier cambio de acceso
  debe decir en su `design.md` si mantiene, mitiga o elimina ese riesgo.
- No registrar en logs correos ni contenido de filas.
- Los errores de Notion no deben filtrar el token ni detalles internos al cliente más allá de un código.

## 5. Código

- TypeScript con interfaces explícitas para cada forma de fila.
- Un solo helper de consulta paginada a Notion (`queryDatabase`) y un extractor por base; no duplicar
  el bucle de paginación.
- Las funciones puras (extracción de propiedades, filtrado por correo) se escriben de forma que se
  puedan probar con `deno test` sin llamar a Notion.

## 6. Variables de entorno

| Variable | Uso | Estado |
|---|---|---|
| `NOTION_TOKEN` | Token de la integración de Notion (lectura + correos de usuarios) | En uso |
| `SUPER_ADMIN_EMAIL` | Correo que ve todas las filas (`isAdmin: true`). Vacío o ausente ⇒ nadie es admin | En uso desde 2026-09-25 |

## 7. Verificación (Step N+2)

El agente ejecuta, como mínimo, contra la función desplegada:

```bash
BASE=https://xozsrcnjnugwbrrrwoeb.supabase.co/functions/v1/tareas-estudio-secundaria
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/data"                 # 400
curl -s "$BASE/data?email=no-existe@example.com" | head -c 200        # rows: []
curl -s "$BASE/ingles/data?email=no-existe@example.com" | head -c 200 # rows: []
```

Además, un correo de alumna asignada (sin escribirlo en el reporte: usar "alumna A") y el caso admin.

## Mesas de las partidas (cambio `mesas-con-bots`)

Cada juego de sala declara su mesa en `MESAS` de `server/salas.ts`, que debe ser igual a `juegos/mesas.js`:

- `max`: cupo de personas; al llenarse, `sala_llena`.
- `asientos`: lugares que se completan con bots; cada persona que entra quita un bot.
- `min`: mínimo para empezar, contando personas y bots; si falta, `faltan_jugadores`.
- `bots`: `siempre` o `nunca`; si se omite, lo decide quien crea la sala.

Mesas de `juegos-salas-grandes`: `bingo`, `en-memorama` y `mente-sopa` `{ max: 30, min: 1 }` (bots aparte);
`blackjack` `{ max: 6, asientos: 3, min: 1 }` (la banca no ocupa asiento: 1 persona + 2 bots, 2 + 1, 3 + 0); `dibuja`
`{ max: 12, min: 3, bots: "nunca" }`.

Karts (cambio `juegos-en-vivo`): `{ max: 8, asientos: 3, min: 1 }` (hasta 8 personas en vivo; con bots, 1 persona + 2
bots como antes, 2 + 1 y de 3 en adelante sin bots). El servidor no ve los mensajes en vivo: sigue validando el tiempo
de cada quien con `validarCarrera`.
Futbolito y Billar (cambio `futbolito-billar`): `{ max: 2, asientos: 2, min: 2 }` (con bots, 1 persona + 1 bot).
Golf (cambio `golf`): `{ max: 4, min: 2, bots: "nunca" }` (de 2 a 4 personas; sin bots: por qué, en su `design.md`).
Mesa por formato (cambio `futbolito-equipos-controles`): un renglón puede traer `formatos: { <opciones.formato>: { max,
asientos, min } }`; `mesaDe(juego, opciones)` (servidor) y `Mesas.de(juego, opciones)` (página) la aplican, y
`enMesa`, `botsEnMesa` y `textoMesa` reciben las `opciones` de la sala. Futbolito `2v2` → `{ max: 4, asientos: 4,
min: 2 }` (con bots, 1 persona + 3 bots, 2 + 2…; sin bots, 2 a 4 personas: 1 vs 1, 2 vs 1 o 2 vs 2).
`server/mesas_test.ts` comprueba que las dos tablas sean iguales. **Todo juego de sala nuevo agrega su renglón en los
dos archivos.**

## Clásicos rápidos en sala (cambio `clasicos-rapidos`)

`server/clasicos_rapidos.ts` reúne lo de servidor de Gato (`gato`), Conecta 4 (`conecta4`), Piedra, papel o tijera
(`ppt`), Ahorcado en inglés (`ahorcado`) y Serpientes y escaleras (`serpientes`); `server/salas.ts` y
`server/juegos.ts` solo tienen ganchos marcados con `// clasicos-rapidos`.

- Jugadas (`validarJugadaClasicos`; además de `n`, cualquier otro campo se descarta; si no, 400 `jugada_invalida`):
  - `gato`: `{ n, accion: "marcar", casilla: 0–8 }`;
  - `conecta4`: `{ n, accion: "soltar", col: 0–6 }`;
  - `ppt`: `{ n: ronda 0–4, accion: "elegir", eleccion: "piedra" | "papel" | "tijera" }` o `{ n, accion: "pasar" }`;
  - `ahorcado`: `{ n, accion: "letra", letra: a–z }` o `{ n, accion: "pasar" }`;
  - `serpientes`: `{ n, accion: "tirar" }` (el dado sale de la semilla y del paso).
- En `ppt` todos juegan la misma ronda: no aplica `turno_tomado` (`sinTurnoUnico`) y cuenta la primera elección.
- **Elección simultánea** (`ocultarJugadas`): en `GET /juegos/sala/<código>` la `eleccion` ajena de la ronda `r` sale
  como `"?"` si quien pregunta no tiene jugada en `r` y la ronda no está completa; lo publicado en Realtime oculta toda
  ronda incompleta. El cliente recuerda las elecciones que ya vio.
- `ahorcado` acepta `opciones.modo` = `compite` (por omisión) | `coop`; otro valor → 400 `modo_invalido`.
- Mesas (tabla `MESAS`): `gato` y `conecta4` `{ max: 2, asientos: 2, min: 2 }`, `ppt` `{ max: 8, asientos: 4, min: 2 }`,
  `ahorcado` `{ max: 8, min: 1 }` y `serpientes` `{ max: 4, asientos: 4, min: 2 }`.
- El servidor no reproduce la partida: valida forma y turno. Las reglas viven en `juegos/clasicos-rapidos.js` y las
  prueba `server/clasicos_rapidos_motor_test.ts`; el servidor, `server/clasicos_rapidos_test.ts`.
## Línea del tiempo en sala (cambio `cultura-conocimiento`)

- `cultura-linea` está en `JUEGOS_PARTIDA` y en `MESAS` como `{ max: 30, min: 1 }` (sin `asientos`: los bots se suman
  aparte, como en el quiz). En `CATALOGO` es de la categoría `cultura`, con tope individual de 3,000; los `es-*` también
  pasan a la categoría `cultura` (sus ids y topes no cambian).
- Al crear la sala, `opciones.cat` es el tema: `todos` (por omisión), `historia-mexico`, `historia-universal`,
  `inventos` o `ciencia` (`TEMAS_LINEA`); otro valor → 400 `tema_invalido`.
- `respuesta` usa la forma del quiz más `aciertos`: `{ q, correcta, puntos, ms, aciertos }`.
  - `q` de 0 a 4 (5 líneas), `correcta` booleano y `aciertos` entero de 0 a 6, obligatorio; si no → 400
    `respuesta_invalida`.
  - `ms` se recorta a 60,000 y `puntos` a `20 × aciertos + (correcta ? 80 : 0)` (máximo 200).
  - Solo cuenta la primera respuesta de cada línea. Los demás juegos de preguntas no cambian (10 preguntas, sin
    `aciertos`).
- Pruebas: `server/linea_tiempo_test.ts` (sala y funciones puras) y `server/cultura_datos_test.ts` (contenido).

## Ranking de Inglés (cambio `rpg-fase2-ingles`)

- **Interruptor:** general = llave `ranking` de `config/interruptores.json` (mecanismo de `rpg-privacidad`, 60 s de
  caché, `olvidar()` al cambiarlo aquí); por grupo = `gamificacion/config.json` (`gruposSinRanking`), leído en cada
  petición. `/ingles/actividades` agrega `ranking: true` solo si está encendido para su grupo. Apagado (o grupo apagado): `GET /gamificacion/perfil` → `{ ranking: false }`; `PUT` y
  `GET /gamificacion/ranking` → 404 `sin_ranking`.
- **Perfil:** `GET|PUT /gamificacion/perfil` (`{ aparecer: boolean }`) solo para alumnos y alumnas activas de Inglés
  (admin 403 `solo_alumnos`, baja 403 `baja_ingles`, solo Secundaria 404 `sin_ranking`, invitado 403, otra persona
  403 `ajeno`). Aparecer exige nick de Juegos (400 `sin_nick`) que pase `revisarNick` (400 `nick_invalido` con
  `motivo`: `correo`, `telefono`, `nombre`, `palabra`, `caracteres` o `repetido`, y un `mensaje` para mostrar).
  Ocultarse (`aparecer: false`) se acepta siempre, también con el ranking apagado.
- **Ranking:** `GET /gamificacion/ranking[?grupo=]` → `{ semana, lista: [{ posicion, nick, puntos }], yo? }`. Solo su
  grupo (otro → 403), por puntos de constancia de `comun/constancia.js` (función pura que el servidor importa), solo
  quien activó aparecer y tiene el nick aprobado. **Nunca** nombres, correos, slugs, XP, nivel ni calificaciones (lo
  revisa `server/gamificacion_ingles_test.ts` recorriendo el JSON). Falla del almacén → 503 `ranking_no_disponible`.
- **Moderación (solo admin):** `GET /profe/nicks[?grupo=]`, `POST /profe/nicks/aprobar { alumno, nick }` (409
  `nick_cambio` si cambió en Juegos), `POST /profe/nicks/rechazar { alumno, nick, motivo }` (1–200 caracteres) y
  `POST /profe/ranking { ranking? , grupo?, apagado? }`. Toda escritura invalida la caché del ranking.
- **Misiones en Inglés** (cambio `rpg-ingles-hero-card`): `/ingles/actividades` agrega `misiones: true` si la persona
  tiene misiones visibles (`hayMisionesVisibles` de `server/misiones.ts`), y el ranking suma 20 puntos por paso con
  `pasosEntregados(store, "ingles", slug)`.

