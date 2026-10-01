## Why

El usuario pidió (2026-09-30) que **¡Una!** (cartas tipo UNO) también se pueda jugar en partida. Es el
último juego que faltaba para jugar entre varias personas.

## What Changes

- **¡Una! en partida:**
  - 2 o más personas, con los 2 bots opcionales, por turnos y con las reglas del modo solitario (Salta,
    Reversa, +2, Comodín, +4 y robar).
  - **Sin servidor de tiempo real:** cada jugador guarda sus jugadas (número de paso, acción, carta, color
    y "¡Una!").
  - Todos los dispositivos **reconstruyen la partida igual** a partir de la semilla (mazo y reparto) y de
    las jugadas en orden.
  - **Bots:** juegan 1.5 s después de que empieza su turno, con una estrategia determinista.
  - **Tiempo por turno:** 30 s. Si alguien no juega, roba una carta y se pasa el turno, así la partida no
    se traba si alguien se va.
  - **Botón UNA:** con 2 cartas, hay que presionar el botón **UNA** antes de tirar la penúltima; si no, se
    roban 2. En solitario y en partida, los textos dicen "presiona el botón UNA" en lugar de "grita"
    (pedido del usuario).
  - Etiquetas y voz en español o inglés, a elección de cada dispositivo.
  - **Podio:** quien gana recibe 400 + 10 por carta que les quedó a los demás, con tope de 1000; los demás,
    5 por carta jugada.
- **Avatar en el portal** (pedido durante el cambio):
  - el saludo muestra el avatar de Juegos ("Hola, Sofy 🦊");
  - el enlace "🎨 Cambiar avatar" abre directo el selector (`juegos.html?avatar=1`).
- **Servidor:**
  - `una` como juego de partida;
  - `respuesta` acepta `{ jugada: { n, accion, carta?, color?, una? } }` y la guarda con la hora del
    servidor;
  - rechaza un paso `n` que ya tenga otro jugador (409 `turno_tomado`).

- **Post-apply (pedido del usuario, 2026-09-30): castigo por segundos en UNA**, en solitario y en partida.
  - Al tirar la penúltima carta, se presiona el botón **UNA**.
  - El castigo depende de cuánto se tarde: ≤ 2 s ninguno; 2–3 s +1; 3–4 s +2; 4–5 s +3; sin presionar en
    5 s +4.
  - En partida, el siguiente turno espera a que se resuelva (máx. 5 s). Los bots presionan UNA entre 0.8 y
    1.8 s.
  - Reemplaza al interruptor 📣 previo.

## Capabilities

### Modified Capabilities
- `juegos`: ¡Una! en partida.

## Impact

- **Superficies:** `juegos.html`, `index.html` (portal) y `server/salas.ts`.
- **Límites:** una partida de ¡Una! dura más que una de preguntas (unas 60 a 120 jugadas). Se escribe una
  vez por jugada humana y se sondea cada 2 s, dentro del presupuesto de GitHub para un grupo escolar.
- **Riesgo aceptado:** como la partida se reconstruye en el cliente, alguien con herramientas de
  desarrollo podría ver las cartas de los demás. Para un juego escolar es aceptable.
- **Acciones externas:** redeploy al hacer merge (el agente verifica y limpia la sala de prueba).

## Matriz de acceso

Sin cambios respecto a `juegos-partidas`. Cada jugador solo escribe sus jugadas.
