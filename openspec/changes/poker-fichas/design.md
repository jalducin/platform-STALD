## Contexto
El póker (`openspec: poker`) usa el motor sin DOM `juegos/cartas.js`; la página solo pinta y envía jugadas. En sala,
todos reconstruyen la mesa desde la semilla y la lista de jugadas validadas por el servidor (`estadoPoker()`), así
que cualquier regla nueva vive en el motor y la página la comparte entre el modo individual y la sala.

## Decisiones

### 1. Fichas iniciales y ciegas
- `Cartas.FICHAS_INICIALES = 500`; `pokerNueva` lo usa por omisión y la página ya no escribe el número.
- `CIEGAS = [[5, 10], [10, 20], [20, 40], [40, 80]]`, por niveles de 4 manos (igual que antes).
- Justificación: con 1,000 fichas y 10/20 la ciega grande era el 2 % de la pila (50 ciegas grandes). Con 500 y 5/10
  se conserva el 2 % y las 50 ciegas: la partida dura lo mismo y las decisiones pesan igual. Partir las ciegas a la
  mitad deja todas en múltiplos de 5, así que siempre se pueden pagar con las fichas del selector (75/150 habría
  pasado a 37.5/75; se usa 40/80). En 10 manos se juegan los niveles 5/10, 10/20 y 20/40; 40/80 queda para
  partidas más largas.
- Alternativa descartada: dejar 10/20 con 500 fichas (25 ciegas grandes): la partida se vuelve de puro «todo».

### 2. Todo en múltiplos de 5
- Las pilas, las ciegas y las subidas de los bots (redondeadas a 10) ya son múltiplos de 5. Lo único que rompía la
  regla era el reparto de un pozo empatado («lo que sobra, de 1 en 1»). Ahora la parte de cada quien se redondea
  hacia abajo a múltiplos de 5 y lo que sobra se da **de 5 en 5** a partir del primero después del botón (si un pozo
  no fuera múltiplo de 5, el último pedazo va completo).
- `pokerActuar` rechaza `subir` con un monto que no sea múltiplo de 5, salvo que sea exactamente `maxSubir` (ir con
  todo con lo que se tenga). Como las pilas son múltiplos de 5, en la práctica `maxSubir` también lo es.
- Con este invariante, cualquier subida legal se puede componer con fichas de 5, 10, 20, 50 y 100.

### 3. Puntos y bono
- Antes: `min(1000, fichas ÷ jugadores)`; con 1,000 fichas, quien se lleva todo junta 1,000 (el tope).
- Ahora: `min(1000, fichas × 2 ÷ jugadores)` (factor `1000 / FICHAS_INICIALES`). Quien termina igual que empezó
  recibe los mismos puntos que antes (500 × 2 ÷ 4 = 250 con 4 jugadores) y quien se lleva todo sigue llegando a
  1,000. Por eso el bono de **+150** por equipo o pareja ganadora no cambia: pesa lo mismo frente a la base. El
  tope del servidor para `poker` sigue en 1,000.

### 4. Selector de fichas
- Botonera: 🏳️ Retirarme, ✋ Pasar / 🤝 Igualar, ⬆️ Subir y 🔥 Todo (2 columnas en celular, 4 desde 480 px).
  «⬆️ Subir» (`data-pk-abrir`) solo aparece si se puede subir algo menos que todo (`minSubir < maxSubir`); si no,
  queda «🔥 Todo».
- Al tocarlo se despliega `#pk-subir` (región con `aria-label`) con:
  - encabezado: aumento acumulado `#pk-aum` («+0», `aria-live="polite"`) y «Tu apuesta: N» `#pk-total`;
  - pila visual `#pk-pila` de lo que se lleva (una columna por color, con animación de caída al agregar);
  - 5 botones `.pk-ficha[data-pk-ficha]` de 5, 10, 20, 50 y 100, con `aria-label="Ficha de 20"`;
  - ayuda «Mínimo +X · máximo +Y» y los botones «↺ Limpiar» (`data-pk-limpiar`) y «✅ Apostar» (`data-pk="subir"`).
- El aumento es lo que se pone **encima** de la apuesta más alta: `monto = apuestaMax + aumento`. Límites tomados de
  `Cartas.opciones`: mínimo `minSubir − apuestaMax` y máximo `maxSubir − apuestaMax`.
- Una ficha se deshabilita si `aumento + valor > máximo`; «✅ Apostar» está deshabilitado mientras
  `aumento < mínimo`. Así no se puede mandar una subida ilegal desde la página (el motor y el servidor lo validan
  de todas formas).
- El estado del selector vive en el DOM (`data-aum`); un escucha único en `document` maneja abrir, fichas y limpiar,
  así sirve igual en individual y en sala. En sala la mesa no se redibuja durante tu turno (la clave de vista no
  cambia), así que el selector no se pierde mientras eliges.
- Las fichas son CSS puro: `radial-gradient` (centro y anillo) + `repeating-conic-gradient` (franjas del canto) y
  sombras; colores clásicos de casino: 5 rojo, 10 azul, 20 verde, 50 naranja, 100 negro con letra dorada. Animación
  `pk-toque` al tocar y `pk-cae` al caer a la pila; ambas se apagan con `prefers-reduced-motion`.

### 5. Pozo y apuestas con pilas
- `pkPilaHtml(monto, chica)` descompone el monto de mayor a menor (100, 50, 20, 10, 5) y dibuja una columna por
  color, hasta 6 fichas visibles por columna. Se usa en el pozo de la mesa y en la apuesta de cada asiento. Es
  decorativa (`aria-hidden`): el número sigue escrito al lado.

### 6. Servidor y repetición determinista
- `validarJugada` (póker): `subir` exige `monto` entero, de 5 a 1,000,000 y múltiplo de 5; si otra acción trae
  monto, también debe ser múltiplo de 5. La validación de reglas (mínimo, máximo) sigue en el motor que corre en
  cada cliente.
- La repetición no cambia: misma semilla, mismos bots (`pbot<paso>`). Una partida que estuviera en curso durante el
  despliegue se vería con las reglas nuevas en los clientes que recarguen; las salas duran a lo más 1 h.

## Riesgos
- Que las fichas no quepan a 390 px: se revisa con capturas de 390×844 y de escritorio.
- Que un pozo dividido deje un monto raro: cubierto por la prueba de reparto en múltiplos de 5 y por las 200 partidas
  de bots, que ahora también comprueban que toda pila sea múltiplo de 5.
