## Context

- Salas de Arcade (`juegos-plataformas-karts`, `juegos-en-vivo`, `karts-copa-en-sala`): la sala tiene una hora de
  inicio del servidor (`sala.inicio`); el iframe de Karts recibe `inicioEn = sala.inicio − ahoraServidor()` y arranca
  en `performance.now() + inicioEn`. Su tiempo (`ms`) se mide desde esa salida local y se manda una vez
  (`{ carrera: { ms, monedas } }`); la página arma el podio ordenando por `ms`.
- `ahoraServidor() = Date.now() + sala.offset`, y `sala.offset = ahora − Date.now()` con la **última** muestra: la
  respuesta de `GET /juegos/sala` (con `ahora` sellado al empezar la petición) o el aviso de Realtime (`Date.now()` del
  servidor al publicar).
- Kart: ≈ 28 × 22 px; velocidad punta ≈ 200 px/s. Las pistas se muestrean cada 8 px (`muestrearPista`, también en las
  pistas grandes de `karts-pistas-grandes`).

## Goals / Non-Goals

- Meta: que en una sala todos salgan juntos y pegados, que el 1.º en cruzar la meta sea el 1.º del podio y que el
  servidor calcule los puntos, con lugares estrictamente decrecientes.
- Fuera: reescribir partidas ya guardadas; cambiar los puntos del modo individual (allí las monedas suman, pero no se
  compite contra otra persona); copas de Axo.

## Decisions

### 1. Diagnóstico confirmado

- **Parrilla**: `nuevoKart` usa `i = N − 4 − fila·5` y `lado = ±0.42·mitad`. Como las muestras van cada 8 px, eso da
  filas a 40 px y lados a ±23–25 px en las 8 pistas: la geometría NO crecía con las pistas grandes. En vivo, las
  personas toman los lugares 0…n−1 (orden de la sala) y los fantasmas detrás: tampoco se mezclaban.
- **Reloj**: el desfase sale de la última muestra. Con `GET /juegos/sala`, `ahora` se sella al **empezar** la
  petición, así que el desfase queda corto por el procesamiento (sesión, lecturas de Postgres) más la bajada; con
  Realtime, solo por la latencia del aviso. En producción, una petición sin sesión ya tarda 0.2–0.6 s (medido con curl
  el 2026-10-14); con sesión y lecturas, más, y en celular más aún. Cada aparato arranca tarde por **su** error (0.2–2 s,
  distinto por aparato y por muestra): 1 s ≈ 200 px de separación en la salida (la queja 1).
- **Ganador**: el `ms` de cada quien es su duración desde **su** salida. Si Montecillo arrancó a tiempo y el profe
  1.5 s tarde, Montecillo cruza primero en todas las pantallas, pero si el profe llega menos de 1.5 s después, su `ms`
  es menor y el podio (por `ms`) lo pone 1.º con 500 contra 425 (la queja 2). Los puntos de sala NO mezclaban monedas
  (`puntosLugar` por lugar), pero el servidor aceptaba los puntos de la página (hasta 10 000).
- **Copa**: la tabla ordena por puntos de copa (15, 12, 10…), pero los puntos de ranking eran la suma de
  `puntosLugar` por carrera (lineal): con 3 personas, 1.º-1.º-3.º-3.º (50 de copa), 3.º-3.º-1.º-1.º (50) y 2.º en las
  4 (48) reciben los 3 lo mismo (1700); con 8 lugares, 1.º-1.º-1.º-6.º (49 de copa, 1625) contra 2.º en las 4 (48,
  1700) gana la copa y recibe menos. Además `puntosLugar(7) = puntosLugar(8) = 50`.

### 2. Reloj común de la sala (`juegos/reloj-sala.js`)

- Cada `GET /juegos/sala` da una muestra con `t0` (antes de pedir), `t1` (al llegar), `ahora` (sello del servidor al
  empezar) y `reloj` (sello nuevo, al armar la respuesta). Como el servidor selló entre `t0` y `t1`:
  `reloj − t1 ≤ desfase ≤ ahora − t0`. El aviso de Realtime da solo la cota inferior `ahora − t_recibido`.
- Se guarda la intersección de las muestras de los últimos 120 s (máx. 24): cota inferior = la mayor, superior = la
  menor; desfase = punto medio (o la cota inferior si no hay superior). Si la intersección queda vacía (el reloj del
  aparato saltó), se usa solo la muestra más reciente. Error ≈ media latencia de la red de la mejor muestra (decenas de
  ms), sin el tiempo de procesamiento.
- Alternativas: (a) promedio o mediana de desfases: arrastran el sesgo del procesamiento; (b) sellar solo al responder:
  sigue sumando la bajada; (c) una ruta de hora dedicada: más peticiones sin ganar precisión frente a (2).
- Aplica a todas las salas (todas usan `ahoraServidor()`): cuentas regresivas y cierres más parejos.

### 3. Parrilla (`Arcade.parrilla(slot)`)

- `{ atras, lado }` en px: `atras = 32 + fila·48` detrás de la meta (fila = ⌊slot/2⌋), `lado = ±24` del centro. Se
  convierte a muestras con el paso de la pista (`M.paso`, 8 px). La usan `nuevoKart` y las casillas pintadas.
- Sala en vivo: personas en el orden de la sala (lugares 0…n−1), fantasmas detrás. Respaldo sin canal: tú en el 0 y
  los fantasmas detrás (las demás personas no se dibujan). Individual: tú en el 5 (fila 3), como siempre.
- Prueba en las 8 pistas: las 8 casillas a ≤ 200 px de la meta, filas a 48 px y lados a 48 px, sobre el camino
  (|lado| + medio kart < medio ancho) y lejos de las mecánicas (turbo, salto, cenote, lodo, trajinera).

### 4. Podio y puntos de una carrera suelta (`Arcade.podioCarrera`, `Arcade.puntosLugar`)

- Orden: quienes terminaron por `ms` (con el reloj común, `ms` = hora de cruce − inicio: orden de llegada); empate
  por `t` (hora del servidor al recibirlo) y luego id. Después, quienes no terminaron, por `avance` (‰ de la carrera,
  mayor primero; sin dato = −1) y id.
- Puntos: `puntosLugar(l) = max(20, 500 − 60·(l − 1))` → 500, 440, 380, 320, 260, 200, 140, 80 (estrictamente
  decrecientes en los 8 lugares posibles); no terminar = 0.
- **Monedas fuera del puntaje de sala**. Se descartó un bono acotado (p. ej. +2 por moneda, máx. 50 < 60 de diferencia
  entre lugares): no aporta a la queja, complica explicar el podio y tienta a recoger monedas en lugar de correr. Las
  monedas siguen en el modo individual y como dato (`aciertos`) de la partida.
- `avance`: en `{ carrera: { ms: null, monedas, avance } }`, entero 0–999, opcional (si falta, −1). El juego lo manda
  al vencer el límite: `⌊1000 · (vuelta·N + idx) / (vueltas·N)⌋`.

### 5. El servidor calcula los puntos

- `POST /juegos/partida` con `sala` de `karts` (carrera suelta) o `plataformas`: `rankingCarreraSala` lee la sala y
  los asientos, arma participantes (personas por `unido` + bots con `Mesas.botsEnMesa` o 2 sin mesa) y aplica
  `podioCarrera`. Cerrada = todas las personas reportaron o `ahora ≥ inicio + límite + gracia`. Abierta → 409
  `carrera_en_curso` (no se guarda nada). Cerrada → `puntos` = los del podio del servidor, sin importar lo que mande la
  página.
- La página pinta el podio solo cuando el **servidor** ya tiene los tiempos de todas las personas (no con su propio
  envío aún en camino) o venció el límite; ante 409 `carrera_en_curso` reintenta cada 2.5 s (hasta 8 veces).
- Copa: `topeRankingCopa` ya usaba la tabla del servidor; lo que cambia es la tabla (§6).

### 6. Copa: ranking por lugar final

- `KartsCopa.estado`: tabla por puntos de copa, desempate por tiempo total y nombre (sin cambios); `ranking` =
  `min(2000, 4 · puntosLugar(lugar en la tabla))` si sumó puntos, si no 0 → 2000, 1760, 1520… Siempre en el mismo
  orden que el podio. Cada carrera sigue dando 15, 12, 10… por orden de llegada.

## Risks / Trade-offs

- Si todas las muestras de un aparato son lentas y asimétricas, el error queda en media latencia (igual que NTP).
- `reloj` usa `Date.now()` del servidor aunque las pruebas fijen `ahora`; solo lo usa la página para el reloj.
- Partidas de sala ya guardadas con los puntos anteriores se quedan como están (no se reescribe la historia).
- Cambiar `puntosLugar` cambia los puntos del 2.º al 8.º en las salas nuevas de Karts y Axo (440 en vez de 425…).
