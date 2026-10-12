## MODIFIED Requirements

### Requirement: Karts
Juegos SHALL ofrecer en Arcade el juego **«Karts Turbo»** (`karts`), de carreras con vista pseudo-3D (cámara detrás
del carro) sobre una simulación en un mapa 2D:
- al menos 4 pistas y 8 corredores (la persona y 7 bots);
- derrape con mini-turbo de 3 niveles (azul, naranja, morado), turbo de salida si se acelera o derrapa con buen
  tiempo, monedas (hasta 10, suben la velocidad punta) e ítems que dependen de la posición (quien va más atrás recibe
  mejores);
- una copa de 4 carreras con puntos por lugar (15, 12, 10, 8, 6, 4, 2, 1), además de carrera rápida y un taller
  con piezas que se desbloquean;
- bots cuya dificultad se ajusta de forma acotada a cómo le va a la persona, sin trampas exageradas;
- en modo individual SHALL guardarse en el servidor la copa en curso, las copas ganadas, los mejores tiempos por
  pista y las piezas; cada carrera terminada SHALL sumar sus puntos a los ⭐ individuales (tope 2000).

#### Scenario: Carrera de copa
- **WHEN** Angel termina la primera carrera de la Copa Fiesta en 3.er lugar
- **THEN** ve la tabla de la copa con sus 10 puntos y sus ⭐ individuales suben

#### Scenario: Continuar la copa
- **WHEN** recarga después de la primera carrera y vuelve a abrir Karts Turbo
- **THEN** puede continuar la copa en la carrera 2 de 4 con los mismos puntos

#### Scenario: Mini-turbo morado
- **WHEN** mantiene un derrape girando más de 2.1 s y lo suelta
- **THEN** recibe el turbo morado, el más largo

## ADDED Requirements

### Requirement: Vista pseudo-3D de Karts
«Karts Turbo» SHALL dibujar la carrera en pseudo-3D (Mode-7 en canvas 2D): una cámara detrás del carro que sigue su
rumbo con suavidad; el piso proyectado por líneas hacia el horizonte con asfalto, orillas tipo piano rojo y blanco,
línea de meta a cuadros y pasto con franjas alternas según la distancia; un cielo con montañas de 360° que se mueve
al girar; escenario propio de cada pista (pradera, desierto, hielo y volcán, con su paleta); rivales como sprites
escalados por distancia, ordenados por profundidad, con su color y su número; monedas, cajas e ítems sobre la pista;
y el carro de la persona abajo al centro, inclinándose al girar y derrapar, con humo y chispas del mini-turbo. La
cámara SHALL calcularse con la posición y el ángulo del carro en el mapa 2D, de modo que las reglas, los tiempos, el
mensaje de sala y el progreso guardado no cambien. SHALL sostener 60 cuadros por segundo en celular y respetar
`prefers-reduced-motion` (sin vibración ni inclinación del carro, menos partículas). Los personajes y marcas SHALL
ser originales y los textos SHALL estar en español de México.

#### Scenario: Ver la pista hacia adelante
- **WHEN** alguien empieza una carrera en el celular
- **THEN** ve su carro de espaldas abajo al centro, la pista en perspectiva hasta el horizonte y a los rivales con su
  número, más chicos mientras más lejos están

#### Scenario: Girar mueve la cámara
- **WHEN** mantiene ⬅ durante medio segundo
- **THEN** el carro gira a la izquierda y la cámara gira con él (el cielo y la pista se desplazan)

#### Scenario: Vuelta completa
- **WHEN** un carro recorre la pista completa en la vista 3D
- **THEN** el contador marca la vuelta siguiente igual que antes

### Requirement: Controles de Karts con botones y acciones
En un aparato táctil, «Karts Turbo» SHALL usar por omisión botones grandes ⬅ ➡ a la izquierda y DERRAPE, 🎁 y FRENO a
la derecha, con toques por dedo (touch events no pasivos, multitáctil) y sin que nada quede fuera de la pantalla
desde 320 px, en vertical y horizontal. El selector del menú SHALL ofrecer Botones, Joystick y Sensor, y
«Acelerar: Automático / Con botón»; con «Con botón» SHALL aparecer ACELERAR y el carro solo avanza mientras se
mantiene. Si el sensor no se puede usar, SHALL regresar a Botones con un aviso. En teclado: flechas o WASD (↑/W
acelera, ↓/S frena), ESPACIO derrape, E o Shift ítem y P o Esc pausa. Al empezar cada carrera SHALL mostrarse
durante 3 s un tutorial con los controles del aparato. La entrada SHALL pasar por una capa de acciones (acelerar,
frenar, izquierda, derecha, derrape, ítem, pausa y un eje de giro) a la que se pueden registrar fuentes nuevas, como
un mando físico, sin cambiar las reglas. En horizontal dentro de Juegos, el juego SHALL usar casi toda la altura de
la pantalla.

#### Scenario: Botones por omisión
- **WHEN** alguien abre Karts Turbo por primera vez en el celular
- **THEN** el selector muestra «Botones» y «Automático» elegidos, y en la carrera ve ⬅ ➡ grandes y DERRAPE, 🎁 y FRENO

#### Scenario: Acelerar con botón
- **WHEN** elige «Con botón» y empieza una carrera sin tocar ACELERAR
- **THEN** su carro no avanza hasta que mantiene ACELERAR

#### Scenario: Tutorial
- **WHEN** empieza una carrera
- **THEN** ve por 3 s cómo girar, derrapar, usar el ítem y frenar, y después el aviso desaparece solo

#### Scenario: Celular de 320 px
- **WHEN** juega en un celular de 320 px de ancho dentro de Juegos
- **THEN** ve completos ⬅ ➡, DERRAPE, 🎁 y FRENO sin que el minimapa los tape

#### Scenario: Celular en horizontal
- **WHEN** abre Karts Turbo con el celular en horizontal (844×390)
- **THEN** el juego ocupa casi toda la altura de la pantalla y los botones no tapan el centro de la pista
