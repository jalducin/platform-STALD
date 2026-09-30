## Decisiones

### 1. Basta
- **Normalización:** mayúsculas, minúsculas y acentos se comparan sin distinción; la "ñ" cuenta como
  letra propia.
- **Validez:** la palabra debe empezar con la letra y tener al menos 2 caracteres.
- **Puntos por categoría:**

  | Caso | Puntos |
  |---|---|
  | La palabra está en el diccionario de su categoría | 100 |
  | Tiene 3 o más letras y empieza con la letra, pero no está en el diccionario | 50, "no la conozco" |
  | Vacía, con otra letra o repetida en otra categoría | 0 |

- **Bono:** si todas las categorías están llenas al presionar "¡Basta!", se suman los segundos que
  quedan × 5.
- **Resultado:** una tabla por categoría con la palabra, el estado y los puntos, y un ejemplo del
  diccionario cuando la respuesta no fue válida.
- **Topes en el servidor:** `basta-es` y `basta-en`, 1500.

### 2. ¡Una!
- **Mazo de 108 cartas:** 4 colores × (0, dos de cada 1–9, dos Salta, dos Reversa, dos +2), cuatro
  Comodín y cuatro +4.
- **Reglas:**
  - Se juega carta del mismo color o del mismo número o símbolo.
  - Comodín y +4 eligen color.
  - +2 y +4 hacen robar al siguiente y le quitan el turno.
  - Reversa cambia el sentido; con 2 jugadores funciona como Salta.
- **Sin carta jugable:** se roba 1; si la robada sirve, se puede jugar.
- **"¡Una!":** al jugar la penúltima carta hay 3 s para presionar "¡Una!"; si no, se roban 2. Los bots
  siempre lo dicen.
- **Bots:**
  - juegan primero números del color en turno y guardan los comodines para el final;
  - solo a veces (40 %) castigan con Salta, Reversa, +2 o +4 a quien tiene 2 cartas o menos;
  - en los comodines eligen el color que más tienen.

  Ajuste tras la verificación: con castigo siempre, el jugador casi nunca llegaba a "¡Una!" (0 de 20
  partidas en la prueba). El objetivo es que sea retador pero ganable.
- **Modo inglés:** cambia etiquetas y anuncios, por voz y en texto (colors, numbers, "Skip", "Reverse",
  "Draw two", "Wild").
- **Puntos:**
  - si ganas, 400 + 10 × las cartas que les quedan a los bots, con tope de 1000;
  - si pierdes, 5 × las cartas que jugaste.

### 3. Lotería
- **Tablas:** la tuya y las de 2 bots, de 16 cartas distintas al azar cada una.
- **Gritón:**
  - canta una carta cada 4.5 s (en pruebas se acelera con el mismo gancho `__TIEMPO_JUEGOS`);
  - muestra la carta grande con emoji, nombre y verso, y el historial de las últimas;
  - habla con la voz del navegador en `es-MX`, en `en-US` o en ambas.
- **Marcar:**
  - tocar una casilla la marca solo si su carta ya salió;
  - si no ha salido, la casilla "tiembla" y no cuenta.
- **Modos:** Línea (fila, columna o diagonal) y Tabla llena.
- **"¡Lotería!":** es válido si tu tabla cumple el modo.
- **Bots:** marcan solos. Cuando completan, gritan 1.5 s después, lo que te deja ganar si ya habías
  completado.
- **Puntos:**
  - si ganas: en Línea, 300 + 10 × las cartas que faltaban de salir; en Tabla llena, 500 + 10 × esas
    cartas; tope de 1000;
  - si pierdes, 10 × tus casillas bien marcadas.

### 4. Catálogo del servidor
Se agregan `basta-es`, `basta-en`, `una` y `loteria` (categoría `clasicos`) con sus topes. El resto no
cambia.
