## Decisiones

### 1. Sincronía por reloj, sin tiempo real
- **Al empezar:** el servidor fija `inicio` = ahora + 5 s. Cada respuesta de sala trae `ahora`, la hora
  del servidor, y el cliente calcula su desfase.
- **Preguntas:** el cliente sabe qué pregunta toca con el reloj:
  - pregunta `i` en `[inicio + i·19 s, inicio + i·19 s + 15 s)`;
  - revelación en los 4 s siguientes;
  - fin en `inicio + 10·19 s`.
- **Basta:**
  - ventana de `[inicio, inicio + 60 s)`;
  - un "¡Basta!" válido en `t` cierra en `t + 3 s`;
  - el cierre final es el mínimo entre `inicio + 60 s` y el primer "¡Basta!" + 3 s.
- Así no hace falta un canal en tiempo real: cada cliente sondea el estado cada 2.5 s, solo para ver
  jugadores, respuestas y "¡Basta!".

### 2. Contenido y bots deterministas (cliente)
- **Semilla:** `seed` numérica al crear la sala. Se usa `mulberry32` con sub-semillas por etiqueta (hash
  FNV de `seed|etiqueta`).
- **Preguntas:** `preguntasPartida(juego, rnd, datos, opciones)` arma 10 preguntas con los mismos datos
  de `juegos/datos`. Todos ven las mismas preguntas y en el mismo orden de opciones.
- **Bots en preguntas:** por pregunta, `rnd` decide si aciertan (Ajolote 0.60, Colibrí 0.45), el tiempo
  (2 a 13 s) y la opción equivocada. Sus puntos siguen la misma fórmula.
- **Bots en Basta:** por categoría, con probabilidad 0.75 eligen al azar una palabra del diccionario con
  la letra; si no, dejan vacío. No gritan "¡Basta!".
- Los bots **no escriben** en el servidor: cada cliente los calcula igual.

### 3. Servidor (`server/salas.ts`)
- **Archivos:**
  - `juegos/salas/<código>/sala.json`:
    `{ codigo, juego, opciones, seed, host, creada, inicio|null, bots }`;
  - `juegos/salas/<código>/<id-jugador>.json`:
    `{ id, nombre, tipo, unido, respuestas: { <q>: { correcta, puntos, ms } }, palabras?, basta? }`.
  - Cada jugador escribe **solo su archivo**, así que no hay choques entre jugadores.
- **Código:** 4 letras de `ABCDEFGHJKLMNPQRSTUVWXYZ`, reintentando si ya existe.
- **Validaciones:**
  - juego de partida permitido (400);
  - sala inexistente (404);
  - vencida a las 3 h (410);
  - `empezar` solo del host (403);
  - unirse tras empezar o con la sala llena en 30 (409);
  - `respuesta` solo de jugadores de la sala: `q` de 0 a 9, `puntos` de 0 a 200 y solo la primera
    respuesta de cada pregunta;
  - `palabras`: hasta 10, de 40 caracteres como máximo;
  - `basta` se guarda con la hora del servidor.
- **`GET`:** caché de 2 s por sala, que se invalida al escribir. Solo ven la sala sus jugadores y el
  admin.

### 4. Puntos y ranking
- Al terminar, cada cliente envía su total a `POST /juegos/partida` con el id del juego (p. ej.
  `cultura`, `basta-es`), así que cuenta en el ranking semanal con los topes existentes.
- La escala por pregunta (hasta 200 × 10 = 2000) coincide con el tope de los juegos de preguntas.

### 5. Puntuación de Basta en sala (cliente, determinista)
Por categoría, se normalizan las palabras de todos, incluidos los bots:

| Palabra | Única | Repetida |
|---|---|---|
| Verificada (en el diccionario) | 100 | 50 |
| No verificada (3+ letras y la letra correcta) | 25 | 10 |
| Inválida o vacía | 0 | 0 |

### 6. Límites de uso
Una partida de 5 personas hace unas 500 peticiones a GitHub:
- **Estado:** hasta (N + 2) lecturas cada 2 s mientras dura.
- **Respuestas:** 2 peticiones por cada una.
