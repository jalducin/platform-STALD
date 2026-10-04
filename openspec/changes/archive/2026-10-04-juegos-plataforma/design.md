## Decisiones

### 1. Identidad del jugador (`server/juegos.ts`, lógica pura + almacén)
`resolverJugador(email, admin, filasIngles, filasSecundaria, invitados)` devuelve `{ id, nombre, tipo }` o
`null`:

| Quién | `id` | `nombre` | `tipo` |
|---|---|---|---|
| Admin | `admin` | Profe | `admin` |
| Con filas de Inglés | `a-<slugAlumno(Nombre)>` | Nombre | `alumno` |
| Solo Secundaria | `s-<slug(primer nombre)>` | primer nombre | `alumno` |
| Invitado registrado | `i-<sha256(email)[0..10]>` | apodo | `invitado` |

Si no es ninguno, `null`, y las rutas responden 403 `no_registrado`.

### 2. Catálogo y límites en el servidor
`CATALOGO` define cada juego: `id`, `categoria`, `titulo` y `max` (tope de puntos por partida). El
servidor rechaza un juego desconocido (400) y recorta los puntos a `[0, max]`. Como las partidas se juegan
en el navegador, no se puede evitar que alguien haga trampa; el tope limita el daño.

Juegos:
- **Inglés:** `en-vocab`, `en-spelling`, `en-frases`, `en-memorama`, `en-ordena`.
- **Español:** `es-ortografia`, `es-acentos`, `es-sinonimos`, `es-ordena`.
- **Cultura:** `cultura`.
- **Mente ágil:** `mente-calculo`, `mente-secuencias`, `mente-simon`, `mente-sopa`.

Tope general: 2000 puntos. `juegos-clasicos` agrega los suyos.

### 3. Partidas y ranking semanal
- **Semana:** lunes a domingo, hora de CDMX; id = el lunes (`AAAA-MM-DD`).
- **Archivo:** `juegos/semanas/<lunes>/<id>.json`, con
  `{ id, nombre, tipo, partidas: [{ juego, puntos, aciertos, total, segundos, en }], mejores: { juego: puntos }, total }`.
- **`total`** = suma del **mejor** puntaje de cada juego en la semana. Premia probar varios juegos y
  mejorar, no repetir el mismo sin fin.
- **Límite:** 100 partidas por jugador al día (429 `limite_diario`). `partidas` guarda las últimas 300.
- **Escritura:** con `sha` y hasta 3 reintentos, como los resultados.
- **`GET /juegos/ranking`:**
  - lee los archivos de la semana (caché de 30 s);
  - ordena por `total` y, en empate, por quien llegó primero;
  - devuelve el top 20 `{ pos, nombre, tipo, total, juegos }` y `yo: { pos, total, mejores }`.
  - Acepta `?semana=<lunes>` para semanas pasadas.

### 4. Invitados
- **`POST /juegos/invitado?email=`** con `{ nombre, acepto: true }`:
  - valida el correo, el apodo (2–20 caracteres, letras, números y espacios) y `acepto`;
  - si el correo ya es alumno, alumna o admin, responde `{ ya: true }` sin registrarlo;
  - si no, crea o actualiza `juegos/invitados.json`:
    `{ "<email>": { nombre, registradoEn, ultimaVisita, visitas } }`;
  - tope de 500 invitados (429);
  - sirve también de "entrada": actualiza `ultimaVisita` y `visitas`.
- **`GET /juegos/invitados`** (solo admin): lista con correo, apodo, fechas, visitas y puntos de la
  semana, para análisis.
- **`/perfil`** incluye a los invitados registrados: `conocido: true` e `invitado: true`, solo con el
  acceso `juegos`.

### 5. Página `juegos.html`
- Un archivo con CSS y JS propios. El **contenido** se carga de `juegos/datos/*.json` en el mismo sitio.
  Es la excepción a "HTML autocontenido": el contenido crece semana a semana y separarlo permite editarlo
  sin tocar el código. Sin CDN.
- **Motores reutilizables:**
  - `quiz` (opción múltiple, modo reloj o vidas): vocabulario, frases, ortografía, acentos, sinónimos,
    cultura, cálculo y secuencias;
  - `spelling` (voz del navegador en-US);
  - `memorama`, `ordena`, `simon` y `sopa`.
- **Resultado:** `POST /juegos/partida` y pantalla con puntos, aciertos, "¡Nuevo récord!" y posición en
  el ranking. Si el envío falla, los puntos se muestran igual con el aviso "no se guardó".
- **Sesión:** usa `stald_email` del portal. Sin sesión, pide correo, igual que el portal, y ofrece entrar
  como invitado.
- **Accesibilidad:** botones reales, teclado en el quiz (teclas 1–4), textos con `escapeHtml`, modo
  oscuro y diseño móvil primero.

### 6. Portal
- La tarjeta Juegos enlaza a `juegos.html`.
- Con un correo desconocido, el aviso ofrece "🎮 Entrar como invitado a Juegos": apodo y casilla de
  aceptación con el texto "Acepto que se guarde mi correo y mis puntos para registrar mi avance y mejorar
  la plataforma."
- Al aceptar, se registra, vuelve a pedir `/perfil` y muestra solo la tarjeta Juegos.
