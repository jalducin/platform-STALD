## Context

- Salas de Arcade (`juegos-plataformas-karts`): la sala tiene una hora de inicio del servidor, cada persona manda su
  tiempo una vez (`{ carrera }`, validado por `server/carreras.ts` con el reloj) y la página arma el podio con los
  tiempos de las personas y los simulados de los bots (`Arcade.tiempoBot`). No hay proceso en el servidor que avance
  una partida: todo se deduce del estado guardado y de la hora.
- Karts en vivo (`juegos-en-vivo`): el iframe abre el canal por el puente de la página; sin canal, fantasmas.
- Límites por pista y 2 vueltas (`karts-pistas-grandes`): una carrera dura ≈ 2–2.5 min; límite 300–340 s.

## Goals / Non-Goals

- Meta: copas de 4 carreras en una sala, con tabla entre carreras, arranque automático, puntos como el individual,
  tolerantes a desconexiones y validadas en el servidor.
- Fuera: copas de Axo; elegir pistas a mano para la copa mixta; reintentar una carrera.

## Decisions

### 1. Calendario deducido, igual en el servidor y en cada aparato
`juegos/karts-copa.js` (script clásico sin DOM; lo importa el servidor como `juegos/personajes.js`) calcula, con la
sala y los reportes de cada asiento (`copa: [{ k, ms, monedas, t, abandono? }]`):
- carrera 0: empieza en `sala.inicio`;
- esperados de la carrera k: todas las personas en la 0; desde la 1, quienes reportaron la k−1 sin abandonarla;
- cierre de la k: la hora del último reporte si ya reportaron todas las esperadas; si no, al vencer `limite + gracia`
  de su pista (quien no reportó: no terminó, 0 puntos). Los reportes tardíos se rechazan (409 `carrera_cerrada`);
- inicio de la k+1 = cierre + 10 s (`INTERPODIO_MS`: la tabla con su cuenta; el juego quita la tabla 3 s antes de la
  salida para su 3-2-1).
- Alternativas descartadas: (a) horario fijo por carrera (todos esperarían el límite completo: +3 min por carrera);
  (b) que el anfitrión avance la copa (si se desconecta, la copa se detiene).
- Por qué no se espera para siempre a quien se fue: al salir de la sala o cerrar la pestaña (`pagehide`), la página
  manda `{ copa: { carrera, abandono: true } }` (con `keepalive`); al volver a media carrera, también, y espera la
  siguiente. Sin ese aviso (se fue la red), cuenta el límite de la pista.

### 2. Servidor (`server/karts_copa.ts`)
- `POST /juegos/sala` de karts: `opciones.modo` `"copa"` (+ `copa` ∈ fiesta, mesoamerica, mixta; si no, 400
  `copa_invalida`), `"carrera"` o nada; otro valor 400 `modo_invalido`. `opciones.mapa` = 1.ª pista de la copa (la vista
  de una carrera y el registro siguen funcionando); la revancha copia las opciones y vuelve a sortear la mixta.
- `POST /respuesta { copa }`: llaves exactas; `carrera` 0–3; solo la abierta y ya empezada (409
  `carrera_fuera_de_turno` antes de tiempo o adelantada; 409 `carrera_cerrada` si ya cerró); el tiempo con
  `validarCarrera` desde el inicio de esa carrera y con su pista (400 `carrera_invalida`); solo cuenta el primero de
  cada carrera. En una sala de copa, `{ carrera }` suelta es 400 `carrera_invalida`; en una de una carrera, `{ copa }`
  es 400 `copa_invalida`.
- Vista: `GET /sala`, la respuesta de `/respuesta` y Realtime llevan `copa` = `KartsCopa.estado(...)` (fase,
  carrera, `inicioSig`, calendario, resultados por carrera y tabla).
- `POST /partida` con `sala` de copa: `puntos ≤ ranking` de la persona en la tabla del servidor (0 si la copa no ha
  terminado). Así nadie suma más de lo que ganó.

### 3. Puntos
- Por carrera: personas y bots ordenados por tiempo; `PUNTOS_COPA[lugar]` (15, 12, 10, 8, 6, 4, 2, 1); no terminar o
  abandonar = 0 y sin lugar. Tabla: puntos acumulados; desempate por tiempo total (no terminar cuenta el límite) y nombre.
- Ranking de partidas: suma de `Arcade.puntosLugar(lugar)` de cada carrera (500, 425, 350…), tope 2000 (el de Karts en
  el catálogo), en lugar del 500 de una carrera suelta: una copa son 4 carreras. **Reemplazado por
  `karts-salida-y-puntos`**: la suma podía quedar al revés que la tabla; ahora es 4 × `puntosLugar(lugar final)`.
- Bots: los de la mesa de siempre (`asientos: 3`: 1 persona + 2 bots, 2 + 1, 3 o más sin bots), con
  `Arcade.tiempoBot('karts', pista, seed, bot)` de cada pista.

### 4. Página e iframe
- Formulario: `#p-kformato` («Una carrera» o una de las copas); con copa se oculta la pista.
- `pintarCopaSala` (juegos/app/arcade.js): abre el iframe una sola vez; con el calendario manda `inicio` de cada carrera
  (`copa: { k, nombre, tabla }`, bots con su tiempo de esa pista, personas, personaje y `vivo`) en cuanto se conoce su
  hora, y `copa-tabla` (quién falta, cuenta) mientras se espera. Al llegar `meta` manda `{ copa }` y vuelve a pedir la
  sala. Fase final: `pintarFinalSala` (podio con suspenso y revancha) con los puntos de ranking y la tabla de las 4
  carreras («NT» = no terminó).
- `karts.html`: `empezarSala` con `copa` reutiliza el canal en vivo abierto (ritmo de espera 2 Hz) y el personaje de la
  carrera 1; la tabla (`#ov-copa`) se ve hasta 3 s antes de la salida; el tutorial solo en la carrera 1; cada mensaje en
  vivo lleva `d[9]` = carrera y se ignoran los de otra; al llegar, `meta` lleva `carrera`.

## Risks / Trade-offs

- Sin aviso de abandono (red caída), los demás esperan hasta el límite de la pista (≤ 340 s + 10 s). Aceptado: es raro y
  acotado; la tabla dice a quién se espera y cuánto falta.
- El reloj de cada aparato se corrige con `ahoraServidor()`; una diferencia de ±1 s solo mueve la cuenta regresiva.
