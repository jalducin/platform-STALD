## MODIFIED Requirements

### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Español, Maratón de cultura, Mente ágil, Clásicos
(desde juegos-clasicos) y Arcade (desde juegos-plataformas-karts), cada uno con su ícono y su descripción.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos; los de Arcade muestran el resultado de cada nivel o carrera dentro del juego.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

#### Scenario: Categoría Arcade
- **WHEN** un alumno abre el inicio de Juegos
- **THEN** ve la categoría «🕹️ Arcade» con «Axo y los 12 mundos», «Karts Turbo» y «Dragon Run», con su ícono y su
  descripción, y Dragon Run ya no aparece en «⚡ Mente ágil»

### Requirement: Dragon Run
Juegos SHALL ofrecer el juego individual **Dragon Run** en Arcade (categoría `arcade` en el catálogo de la página y
del servidor):
- un dragón corre y salta (con doble salto) para esquivar obstáculos y juntar monedas, con 3 vidas, hasta un
  castillo a 600 m;
- al terminar, los puntos (metros + monedas × 10, más 200 si llega al castillo) SHALL sumarse a los ⭐ individuales
  de la semana, con el mismo tope de 2000.

#### Scenario: Jugar y sumar
- **WHEN** Sofy juega Dragon Run y pierde sus 3 vidas a los 250 m con 12 monedas
- **THEN** ve su resultado con 370 puntos, que se suman a sus ⭐ individuales

#### Scenario: Llegar al castillo
- **WHEN** llega a los 600 m
- **THEN** gana el bono de 200 y el resultado dice "¡Llegaste al castillo!"

#### Scenario: Doble salto
- **WHEN** salta y vuelve a presionar en el aire
- **THEN** el dragón da un segundo salto, pero no un tercero

#### Scenario: Está en Arcade
- **WHEN** alguien abre el inicio de Juegos
- **THEN** encuentra Dragon Run en «🕹️ Arcade» y el servidor lo reporta con categoría `arcade`

### Requirement: Progreso individual de juegos en el servidor
El sistema SHALL exponer `GET /juegos/progreso/<juego>` y `PUT /juegos/progreso/<juego>` para los juegos con
avance (`plataformas`, `karts` y `dragon-run`), guardados en `juegos/progreso/<juego>/<id-jugador>.json` como
`{ v, datos, actualizado }`, sin correos.
- Cada jugador SHALL leer y escribir solo su propio progreso (el id sale de la sesión); no hay forma de leer el de
  otra persona, tampoco para el admin.
- `GET` responde `{ juego, v, datos, actualizado }`, con `v = 0` y `datos = null` si aún no hay avance.
- `PUT { v, datos }` SHALL escribir solo si `v` es la versión guardada (escritura condicional) y responde
  `{ ok: true, v: v + 1 }`. Si no coincide, SHALL responder 409 `version_vieja` con la versión y los datos actuales.
- SHALL validar el tamaño (≤ 4096 bytes, si no 413 `progreso_grande`) y la forma exacta de `datos` según el juego
  (400 `progreso_invalido`). Un juego sin avance responde 400 `juego_sin_progreso`; otro método, 405.
- Para `dragon-run`, la forma exacta es `{ totales, mejorRacha, dias, diaria, cumplidas, premios, equipo }`, con
  enteros en rango, fechas reales `AAAA-MM-DD`, premios conocidos sin repetir y un equipo (color y estela)
  desbloqueado.

#### Scenario: Primer guardado y lectura
- **WHEN** Marisol guarda `{ v: 0, datos }` de plataformas y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos

#### Scenario: Pestaña vieja
- **WHEN** una pestaña con `v: 1` intenta guardar después de que otra ya guardó la versión 2
- **THEN** responde 409 `version_vieja` con `v: 2` y el avance guardado, sin pisarlo

#### Scenario: Forma inválida o demasiado grande
- **WHEN** alguien manda `vidas: 500`, una llave desconocida o una pieza que no desbloqueó
- **THEN** responde 400 `progreso_invalido` y no cambia nada
- **WHEN** manda un avance de más de 4096 bytes
- **THEN** responde 413 `progreso_grande`

#### Scenario: Cada quien su progreso
- **WHEN** Angel pide el progreso de plataformas después de que Marisol guardó el suyo
- **THEN** recibe `v: 0` y `datos: null`

#### Scenario: Sin registro
- **WHEN** un correo que no es alumno, alumna, admin ni invitado pide su progreso
- **THEN** responde 403 `no_registrado`

#### Scenario: Avance de Dragon Run
- **WHEN** Marisol guarda un avance de `dragon-run` con forma válida y luego lo pide
- **THEN** recibe `v: 1` y los mismos datos
- **WHEN** manda una fecha inexistente, `mejorRacha: 5000`, un premio desconocido o el color `dorado` sin haberlo
  desbloqueado
- **THEN** responde 400 `progreso_invalido` y no cambia nada

## ADDED Requirements

### Requirement: Misiones de Dragon Run
Dragon Run SHALL tener misiones y premios cosméticos sin valor real, guardados con el progreso individual
(`/juegos/progreso/dragon-run`):
- **Misiones diarias:** 3 al día, elegidas de una bolsa fija (recorrer metros, juntar monedas, esquivar obstáculos
  seguidos, llegar al castillo, dobles saltos, número de carreras y monedas en una sola carrera). SHALL ser las mismas
  para la misma fecha (día en la Ciudad de México) y el mismo jugador, en cualquier dispositivo, y cambiar al día
  siguiente.
- **Logros permanentes** con niveles 🥉 bronce, 🥈 plata y 🥇 oro: Explorador (metros totales), Coleccionista
  (monedas totales), Esquivador (obstáculos esquivados seguidos en una carrera), Conquistador (castillos) y
  Constante (días seguidos jugando).
- **Premios cosméticos:** colores del dragón y estelas que se desbloquean con logros y misiones. SHALL cambiar solo
  la apariencia: no dan puntos, vidas ni ventajas, y no se canjean.
- Antes de correr SHALL mostrarse la pantalla de misiones (misiones del día con su avance, logros con su medalla y
  premios para elegir; los bloqueados dicen cómo conseguirlos). Al cumplir una misión SHALL aparecer el aviso
  «¡Misión cumplida!», y el resultado final SHALL repetir las misiones y logros cumplidos en esa carrera.
- Los puntos del ranking SHALL seguir las reglas de siempre (metros + monedas × 10 + bono, tope 2000).
- La pantalla SHALL leerse completa en un celular de 390 px y respetar `prefers-reduced-motion` (sin sacudidas,
  menos partículas, aviso sin animación).

#### Scenario: Mismas misiones en otro celular
- **WHEN** Sofy abre Dragon Run en su celular y luego en la computadora el mismo día
- **THEN** ve las mismas 3 misiones con el mismo avance

#### Scenario: Cumplir una misión diaria
- **WHEN** la misión del día es «Junta 50 monedas» y Sofy junta la moneda 50 durante una carrera
- **THEN** aparece «¡Misión cumplida!», el resultado lo repite y, al volver a la pantalla de misiones, la misión
  sale como cumplida ✅

#### Scenario: Subir de nivel un logro y estrenar un color
- **WHEN** Angel suma 1,000 m en total
- **THEN** obtiene Explorador 🥉, se desbloquea el color azul y puede elegirlo antes de correr

#### Scenario: Racha de días
- **WHEN** Marisol juega el lunes, el martes y el miércoles
- **THEN** su racha de días es 3 y obtiene Constante 🥉; si no juega el jueves, el viernes la racha vuelve a 1

#### Scenario: El avance se recupera
- **WHEN** Sofy cumple una misión, elige el dragón azul y recarga la página
- **THEN** la misión sigue cumplida y su dragón sigue azul

#### Scenario: Sin conexión al cargar
- **WHEN** no se pudo leer el avance
- **THEN** puede jugar igual, ve un aviso y el avance se guarda cuando vuelve la conexión
