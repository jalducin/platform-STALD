## ADDED Requirements

### Requirement: Brigada Xalli en Arcade
El catálogo SHALL tener «🦎 Brigada Xalli» (id `brigada`) en 🕹️ Arcade, con tope de 1000 puntos por misión en el
servidor. El juego SHALL ser de acción 2D con desplazamiento horizontal, original, de tono caricaturesco y sin
violencia realista: enemigos robots, drones, máquinas y alienígenas que revientan en engranes o confeti, nunca sangre;
armas de juguete con nombres propios. Los protagonistas SHALL ser los 8 personajes de `juegos/personajes.js` con sus
colores y equipo visible (casco, mochila y lanzaburbujas). No SHALL usar nombres, personajes, arte, sonidos ni niveles
de terceros.

#### Scenario: Tarjeta en Arcade
- **WHEN** alguien abre la categoría 🕹️ Arcade
- **THEN** ve «🦎 Brigada Xalli» y al tocarla se abre el juego en el marco de Arcade con su avance

#### Scenario: Personaje con equipo
- **WHEN** una alumna elige a Tona y empieza una misión
- **THEN** juega con Tona en sus colores, con casco, mochila y lanzaburbujas

### Requirement: Jugabilidad de Brigada Xalli
El personaje SHALL correr con inercia, saltar (salto variable), agacharse y disparar en 8 direcciones (4 con toques).
SHALL lanzar globos de confeti (X) que revientan en un área, recoger armas (ráfaga, abanico, láser) y escudo, cambiar de
arma (Y), rescatar animalitos de jaulas robóticas (puntos y un premio) y subirse al vehículo «Armadillo». Los golpes
SHALL quitar corazones (3 por vida, 3 vidas); al perder todas: misión fallida y reintento desde el punto de control, o,
con compañeros, burbuja que un compañero revive.

#### Scenario: Rescate
- **WHEN** el personaje dispara a una jaula robótica
- **THEN** el animalito queda libre, suma 500 puntos y suelta un premio

#### Scenario: Ráfaga
- **WHEN** se mantiene B con la Ráfaga turbo
- **THEN** sale una burbuja cada 0.07 s y baja la munición; al acabarse vuelve al lanzaburbujas

### Requirement: Misiones de Brigada Xalli
El juego SHALL tener 4 misiones de dificultad creciente (Selva de Ceibas, Desierto de Saguaros, Ciudad de Colores y
Estación Orbital) con puntos de control, minijefes desde la misión 2 y un jefe con patrones de semilla al final. Cada
misión SHALL dar puntos, 1 a 3 estrellas (completar, rescatar a todos, sin reintentos) y récord; las misiones SHALL
desbloquearse en orden. Los escenarios SHALL respetar las culturas, sin caricaturas.

#### Scenario: Desbloqueo
- **WHEN** alguien termina la misión 1 por primera vez
- **THEN** ve sus estrellas y su récord, y la misión 2 queda disponible

#### Scenario: Misión terminable
- **WHEN** el piloto automático juega cualquiera de las 4 misiones
- **THEN** la termina venciendo al jefe

### Requirement: Avance de Brigada Xalli
El avance SHALL guardarse en `/juegos/progreso/brigada` con la forma exacta y versionada `{ ver: 1, desbloqueada,
personaje, misiones, companeros, totales }`. El servidor SHALL rechazar con 400 `progreso_invalido` una forma distinta,
una misión por encima de la desbloqueada o un récord imposible para la misión.

#### Scenario: Récord imposible
- **WHEN** una página manda un récord mayor que el máximo posible de la misión
- **THEN** el servidor responde 400 `progreso_invalido` y no guarda nada

### Requirement: Controles de Brigada Xalli
SHALL funcionar con toques (joystick a la izquierda; A = saltar, B = disparar (mantener = ráfaga), X = globo, Y =
cambiar arma a la derecha), con el mando común de Arcade, con controles físicos y con teclado. Se SHALL recomendar el
celular de lado.

#### Scenario: Toques reales
- **WHEN** una alumna arrastra el joystick a la derecha, toca A y mantiene B
- **THEN** su personaje corre, salta y dispara burbujas seguidas

#### Scenario: Teclado y control físico
- **WHEN** alguien usa flechas, K y J, o la palanca y los botones A y B de un control
- **THEN** el personaje se mueve, salta y dispara igual que con los toques

### Requirement: Modo individual con compañeros IA
El modo individual SHALL permitir jugar solo o con 1 o 3 compañeros IA, que avanzan, disparan, rescatan y reviven. La
dificultad SHALL subir con el número de personajes.

#### Scenario: Compañeros
- **WHEN** alguien elige 3 compañeros IA
- **THEN** juega con 4 personajes y los enemigos y el jefe tienen más vida

### Requirement: Cooperativo en vivo de Brigada Xalli
«Crear partida» SHALL ofrecer «🦎 Brigada Xalli» para 1 a 8 personas, sin bots o con compañeros IA hasta 4 asientos, y
la misión a jugar. La mesa SHALL ser la misma en el servidor y en la página. El anfitrión SHALL simular enemigos,
proyectiles y jefe y mandar fotos por el canal en vivo; cada invitado SHALL predecir su personaje y mandar su entrada;
los golpes SHALL resolverse en el anfitrión. Todos SHALL ver la misma ventana (cámara compartida con liga). Si alguien
se desconecta, la IA SHALL manejar su personaje; sin canal en vivo SHALL ofrecerse jugar solo.

#### Scenario: Mismos enemigos
- **WHEN** 4 personas juegan la misma misión en vivo
- **THEN** las 4 ven los mismos enemigos y cuando alguien vence al jefe todas ven la misión cumplida

#### Scenario: Desconexión
- **WHEN** una persona deja de mandar su entrada 3 s
- **THEN** la IA maneja su personaje, se avisa a las demás y al volver recupera el control

#### Scenario: Sin canal
- **WHEN** la sala de varias personas no tiene canal en vivo
- **THEN** se ve «La misión en vivo no está disponible en esta sala» y un botón para jugar solo

### Requirement: Resultado de la misión en sala
Cada persona SHALL reportar una vez el resultado que vio (misión, tiempo, completada y puntos por persona). El servidor
SHALL rechazar con 400 `resultado_invalido` un reporte implausible (misión distinta a la de la sala, tiempo fuera de
rango o mayor que el transcurrido, puntos mayores que el máximo posible) y SHALL dar los puntos de ranking por persona
a partir del resultado aceptado (confirmado, en disputa, del anfitrión o del invitado). La página SHALL mostrar el
podio con los puntos de cada persona y del equipo, con `Emocion.podio` y revancha.

#### Scenario: Puntos imposibles
- **WHEN** un reporte trae más puntos que el máximo de la misión
- **THEN** el servidor responde 400 `resultado_invalido`

#### Scenario: Podio
- **WHEN** termina la misión en sala
- **THEN** todas las personas ven el podio con sus puntos, los del equipo y el botón de revancha

### Requirement: Rendimiento de Brigada Xalli
El juego SHALL mantener 60 fps (mínimo 50 en la prueba) con CPU ×4 en celular con 8 personajes y enemigos en pantalla,
usando *pools* de objetos y dibujando solo lo visible.

#### Scenario: Ocho personajes
- **WHEN** el anfitrión simula 8 personajes en combate con CPU ×4
- **THEN** la página mide al menos 50 fps
