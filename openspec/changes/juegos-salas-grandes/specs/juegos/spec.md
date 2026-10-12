## ADDED Requirements

### Requirement: Bingo
Juegos SHALL ofrecer en Clásicos el **🎱 Bingo** (`bingo`) con 75 números y un cartón de 5×5 (columnas B 1–15,
I 16–30, N 31–45, G 46–60 y O 61–75) con la casilla del centro libre.
- En individual se juega contra 2 bots; en partida, con hasta 30 personas y, si se activan, 2 bots.
- Al crear la partida se elige la figura (`opciones.figura`): `linea` (fila, columna o diagonal), `esquinas`
  (cuatro esquinas) o `lleno` (cartón lleno). Otra figura SHALL responder 400 `figura_invalida`.
- El servidor SHALL cantar un número cada 4.5 s desde el inicio, en un orden que sale de la semilla de la sala; todos
  los dispositivos ven el mismo número y cada persona tiene su propio cartón, también por semilla.
- Al tocar «¡Bingo!», el servidor SHALL validar la figura del cartón de esa persona con los números ya cantados a su
  hora: si la cumple guarda `bingo: { t, n }`; si no, SHALL responder 409 `bingo_falso` sin registrar el bingo.
- Gana el bingo válido más temprano (los bots gritan 1.5 s después de completar); todos ven el mismo ganador y podio.
- Puntos: quien gana 300 (línea), 400 (esquinas) o 600 (lleno) más 5 por cada número que faltaba cantar (tope
  1000); los demás, 10 por cada número de su cartón que salió.

#### Scenario: Bingo verdadero
- **WHEN** Marisol completa una línea con números ya cantados y toca «¡Bingo!»
- **THEN** el servidor guarda su bingo y todas las personas de la sala ven «¡Bingo de Marisol!» con el mismo podio

#### Scenario: Bingo falso
- **WHEN** Angel toca «¡Bingo!» antes de tener la figura con los números cantados
- **THEN** el servidor responde 409 `bingo_falso`, no registra su bingo y la página le avisa que todavía no tiene bingo

#### Scenario: Mismo canto para todos
- **WHEN** tres personas siguen la misma partida
- **THEN** las tres ven el mismo número cantado en el mismo momento y cartones distintos

### Requirement: Blackjack con fichas sin valor
Juegos SHALL ofrecer en Clásicos el **🂡 Blackjack (21)** (`blackjack`) con fichas de juego sin valor real, 500 fichas
y 8 manos.
- En cada mano se apuesta con fichas de 5, 10, 20, 50 y 100 (múltiplos de 5, de 5 hasta las fichas que tengas); luego
  cada quien puede **pedir**, **plantarse** o **doblar** (solo con 2 cartas y fichas suficientes); 21 o pasarse
  termina el turno.
- La banca SHALL pedir mientras tenga menos de 17. Ganar paga el doble de la apuesta, el empate la devuelve y el
  blackjack natural paga 3 a 2 (en múltiplos de 5).
- Individual contra la banca; en partida, hasta 6 personas contra la banca en una mesa de 3 asientos: con bots, cada
  persona que entra quita un bot (1 persona + 2 bots, 2 + 1); turnos de 30 s (al vencer: apuesta mínima o plantarse).
- En partida, el servidor SHALL aceptar solo `apostar`, `pedir`, `plantarse` y `doblar`; `apostar` SHALL traer un
  `monto` entero, múltiplo de 5 y de al menos 5, y las demás acciones no llevan monto; si no, 400 `jugada_invalida`.
- Puntos: las fichas con que terminas (tope 1000).
- La pantalla SHALL aclarar que las fichas no se compran, no se cambian y no tienen valor real.

#### Scenario: Plantarse y ganarle a la banca
- **WHEN** Laura apuesta 20, se planta con 19 y la banca termina con 18
- **THEN** recibe 40 fichas (su apuesta más 20)

#### Scenario: Monto inválido en partida
- **WHEN** alguien envía `apostar` con `monto: 7` o sin monto
- **THEN** el servidor responde 400 `jugada_invalida`

#### Scenario: Cada persona que entra quita un bot
- **WHEN** Marisol crea una sala de Blackjack con bots y luego entra Angel
- **THEN** la sala de espera pasa de «1 persona + 2 bots» a «2 personas + 1 bot»

#### Scenario: Mesa compartida
- **WHEN** dos personas y un bot juegan en la misma sala
- **THEN** todos ven las mismas cartas, apuestas y resultados de cada mano

### Requirement: Dibuja y adivina
Juegos SHALL ofrecer en Inglés **🎨 Dibuja y adivina** (`dibuja`), una partida por turnos de 3 a 12 personas, sin
bots.
- Empezar con menos de 3 personas SHALL responder 409 `faltan_jugadores`; la sala admite hasta 12.
- Cada persona dibuja una vez, en orden de llegada, una palabra del vocabulario de inglés de
  `juegos/datos/ingles.json`. El turno dura 60 s, termina antes si todas las demás personas adivinan, y le siguen
  5 s en los que se revela la palabra.
- La palabra SHALL salir de un secreto que solo conoce el servidor: solo quien dibuja la recibe (en el GET de la sala)
  durante su turno; ni el cuerpo de la sala, ni los archivos de jugadores, ni Realtime la contienen. Al terminar el
  turno se revela a todos.
- El trazo SHALL viajar como puntos simplificados (enteros de 0 a 255, de 2 a 64 puntos por trazo, color y grosor)
  en el archivo de quien dibuja, y llegar a los demás por Supabase Realtime, con el sondeo de respaldo.
- El servidor SHALL aceptar trazos solo de quien dibuja en su turno, con máximo 6 trazos por envío, 200 trazos y 8000
  números por turno (413 `dibujo_lleno`) y un envío cada 300 ms (429 `muy_rapido`).
- Las demás personas escriben en inglés; el servidor SHALL validar la respuesta (sin importar mayúsculas, acentos ni
  la «s» final) y dar 100 a 200 puntos según la rapidez; quien dibuja gana 50 por cada acierto. Un intento fallido se
  muestra a todos, salvo si contiene la palabra (se guarda sin texto). Quien dibuja no puede adivinar; un intento
  cada 700 ms (429 `muy_rapido`); fuera del turno → 409 `turno_cerrado`.
- Práctica individual opcional: adivinar la palabra en inglés mientras su dibujo se aclara.

#### Scenario: Una dibuja y otro adivina
- **WHEN** Marisol dibuja en su turno y Angel escribe la palabra correcta
- **THEN** el servidor responde `correcta: true` con sus puntos, y todos ven que Angel adivinó sin ver la palabra

#### Scenario: La palabra no se filtra
- **WHEN** Laura (que no dibuja) pide el estado de la sala durante el turno de Marisol
- **THEN** recibe cuántas letras tiene la palabra pero no la palabra

#### Scenario: Trazo de alguien que no dibuja o demasiado grande
- **WHEN** Angel envía un trazo en el turno de Marisol, o Marisol envía un trazo con 65 puntos
- **THEN** el servidor lo rechaza sin guardarlo

#### Scenario: Pocas personas
- **WHEN** el anfitrión intenta empezar con 2 personas
- **THEN** responde 409 `faltan_jugadores`

### Requirement: Memorama y Sopa de letras en partida
🃏 Memorama (`en-memorama`) y 🔎 Sopa de letras (`mente-sopa`) SHALL poderse jugar también en partida, contra bots y
amigos, con 180 s de límite.
- Todas las personas de la sala resuelven el mismo tablero (misma semilla).
- Memorama: al crear se elige si gana el **menor tiempo** (`opciones.gana = tiempo`, por omisión) o **menos errores**
  (`errores`); el otro criterio desempata. Otro valor → 400 `criterio_invalido`.
- Sopa de letras: carrera por encontrar las palabras; todos ven cuántas lleva cada quien; gana quien encuentra más y,
  a la par, quien termina antes.
- Cada quien envía `resultado` al servidor, que SHALL validarlo contra el reloj del servidor (no más de 3 s adelante ni
  20 s atrás) y sus límites; un resultado imposible → 400 `resultado_invalido`. Tras el resultado final se ignoran
  los siguientes.
- Podio cuando todas las personas terminan o se vence el límite; puntos por lugar (600, 480, 400…).

#### Scenario: Mismo tablero
- **WHEN** Marisol y Angel entran a la misma partida de Memorama
- **THEN** ven las mismas cartas en el mismo orden y el podio los ordena por tiempo

#### Scenario: Tiempo imposible
- **WHEN** alguien envía haber terminado la sopa en 2 s a los 40 s de empezar
- **THEN** el servidor responde 400 `resultado_invalido`

### Requirement: Puntos de los juegos de salas grandes
`bingo`, `blackjack` y `dibuja` SHALL estar en el catálogo del servidor con su título (para el ranking «🔥 Juegos») y
tope de 1000 por partida individual; en partida, cuentan en los 👥 puntos de partidas con el tope de sala.

#### Scenario: Ranking de juegos
- **WHEN** alguien termina un Bingo
- **THEN** «Bingo» aparece en el ranking de los juegos más jugados de la semana
