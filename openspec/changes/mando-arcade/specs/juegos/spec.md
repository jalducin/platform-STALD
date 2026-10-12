## ADDED Requirements

### Requirement: Mando de Arcade
Juegos SHALL ofrecer un módulo compartido `juegos/mando.js`, sin dependencias externas, que cualquier juego de
Arcade cargue dentro de su iframe para tener un **mando de consola portátil** («🎮 Mando clásico»):
- a la izquierda, una cruceta de 4 direcciones con diagonales y, si el juego lo pide, una palanca analógica con zona
  muerta; a la derecha, los botones A, B, X y Y en rombo; arriba, los gatillos L y R; al centro abajo, START y SELECT;
- con aspecto de consola (bordes redondeados, sombras y letras en los botones) que se distinga del juego;
- solo SHALL mostrar los botones que el juego usa, y el juego SHALL poder ocultarlo para usar sus controles propios;
- SHALL caber completo desde 320 px de ancho, en vertical (debajo del juego) y en horizontal (encimado en las
  esquinas, sin tapar el centro del juego);
- la interfaz SHALL NOT nombrar marcas de consolas; SHALL usar español de México y respetar
  `prefers-reduced-motion`.

#### Scenario: Celular de 320 px en vertical
- **WHEN** alguien juega Axo en un celular de 320 px de ancho
- **THEN** ve la cruceta, A, B y START completos debajo del juego, sin desplazamiento horizontal

#### Scenario: Botones que el juego no usa
- **WHEN** un juego declara solo las acciones de A y START
- **THEN** el mando muestra solo A y START, y no aparecen la cruceta, B, X, Y, L, R ni SELECT

#### Scenario: Celular en horizontal
- **WHEN** alguien gira el celular a horizontal
- **THEN** la cruceta queda abajo a la izquierda y los botones abajo a la derecha, encimados con transparencia, y
  todos quedan dentro de la pantalla

### Requirement: Toques del mando de Arcade
El mando SHALL atender los toques con *touch events* no pasivos (`preventDefault`), siguiendo cada dedo por su
`identifier`, de modo que el navegador no los convierta en desplazamiento, zoom ni selección de texto, también
dentro del iframe de `juegos.html`. SHALL permitir varios dedos a la vez; deslizar un dedo de un botón a otro SHALL
cambiar el botón presionado; una diagonal de la cruceta SHALL presionar las dos direcciones. Los *pointer events*
SHALL usarse solo para mouse y pluma (o si no hay *touch events*). Perder el foco SHALL NOT soltar los botones
táctiles; `touchcancel` sí suelta ese dedo. Al presionar un botón con el dedo SHALL dar una vibración corta si el
aparato la tiene y el juego no la desactiva.

#### Scenario: Moverse y saltar a la vez
- **WHEN** en Axo alguien mantiene la derecha de la cruceta con un dedo y toca A con otro
- **THEN** Axo avanza a la derecha y salta al mismo tiempo

#### Scenario: Deslizar de un botón a otro
- **WHEN** un dedo presiona A y, sin levantarlo, se desliza hasta B
- **THEN** A se suelta y B queda presionado

#### Scenario: El navegador no desplaza la página
- **WHEN** alguien arrastra el dedo sobre la cruceta dentro de Juegos
- **THEN** la página no se desplaza y el botón no se suelta

### Requirement: Teclado del mando de Arcade
En la PC el mando SHALL leer el teclado con este mapeo por omisión: flechas o WASD = cruceta; J = A, K = B, U = X,
I = Y; Q = L, E = R; Enter = START; Shift derecho o Backspace = SELECT. Cada juego SHALL poder modificarlo. Solo SHALL
interceptar las teclas de los botones que el juego usa, y no SHALL interceptar Enter ni Espacio sobre botones,
enlaces o campos. Un botón «⌨️ Controles» SHALL mostrar la guía de cada acción con su botón del mando, sus teclas y
su botón en un control físico.

#### Scenario: Jugar con el teclado
- **WHEN** en Axo, en la PC, alguien mantiene → y presiona J
- **THEN** Axo avanza y salta

#### Scenario: Ver la guía de controles
- **WHEN** toca «⌨️ Controles»
- **THEN** ve una tabla con cada acción del juego, su botón del mando, sus teclas y su botón del control, y la cierra
  con «Cerrar» o con Esc

### Requirement: Control físico en Arcade
Si alguien conecta un control físico (USB o Bluetooth) que el navegador reporte con la Gamepad API, el mando SHALL
leerlo con el mapeo estándar por posición: botón de abajo = A, derecho = B, izquierdo = X, de arriba = Y, gatillos
izquierdos = L, derechos = R, Select/Vista = SELECT, Start/Menú = START, cruceta = cruceta y palanca izquierda = eje
analógico (y cruceta pasado la mitad). Al conectarse SHALL avisar «🎮 Control conectado».

#### Scenario: Conectar un control
- **WHEN** alguien conecta un control y lo usa en Axo
- **THEN** ve «🎮 Control conectado», mueve a Axo con la cruceta o la palanca y salta con el botón de abajo

### Requirement: API del mando para los juegos
`juegos/mando.js` SHALL publicar `Mando.crear(opciones)` con `acciones` (acción → botón o lista de botones),
`analogico`, `contenedor`, `teclas`, `nombres`, `zonaMuerta`, `vibrar`, `visible` y `botonesControl`, y la instancia
SHALL ofrecer `presionado(accion)`, `eje()` (`{x, y}` en [−1, 1]), `al(accion, fn)`, `alSoltar(accion, fn)`,
`mostrar(bool)`, `activar(bool)`, `botonGuia()`, `mostrarGuia()`, `soltarTodo()`, `destruir()` y `estado()`. La
lógica sin DOM (mapeo, cruceta, zona muerta, dedos, control físico y guía) SHALL estar probada con Deno. La API
SHALL quedar documentada en `docs/frontend-standards.md` («Mando de Arcade») para que otros juegos la adopten sin
cambiarla.

#### Scenario: Acción declarada por el juego
- **WHEN** un juego crea el mando con `acciones: { saltar: 'A' }` y alguien presiona A (táctil, J o el botón de
  abajo del control)
- **THEN** `presionado('saltar')` es verdadero y el manejador de `al('saltar', fn)` corre una sola vez

#### Scenario: Botón desconocido
- **WHEN** un juego declara una acción con un botón que no existe
- **THEN** `Mando.crear` lanza un error que nombra el botón

### Requirement: Mando en Axo y Dragon Run
«Axo y los 12 mundos» SHALL usar el mando con cruceta = moverse, A = saltar, B = fuego y START = pausa, y SHALL
ofrecer «🎮 Mando clásico» y «🔘 Botones» (sus controles de antes) en la portada y en la pausa. «Dragon Run» SHALL
usar A = saltar (y doble salto) y START = pausa, con una pausa nueva («⏸ Pausa» y «SEGUIR») que también se activa
al ocultar la pestaña, y SHALL ofrecer «🎮 Mando clásico» y «👆 Tocar la pantalla» (su control de antes) en la
pantalla de misiones. Cada juego SHALL recordar la elección en `localStorage` (`plataformas_control`,
`dragon_control`); por omisión, el mando.

#### Scenario: Preferencia recordada
- **WHEN** alguien elige «🔘 Botones» en Axo y vuelve a abrir el juego
- **THEN** ve los botones de antes y no el mando

#### Scenario: Pausa con START en Dragon Run
- **WHEN** a mitad de una carrera de Dragon Run alguien presiona START
- **THEN** la carrera se detiene con «⏸ Pausa» y, al presionar START otra vez o «SEGUIR», continúa donde iba
