## ADDED Requirements

### Requirement: Revancha con los mismos jugadores
Al terminar una partida multijugador, el podio SHALL ofrecer «🔁 Otra con los mismos» a cada jugador o jugadora de
la sala. El primero que lo toque SHALL abrir una sala nueva del mismo juego, con las mismas opciones, los mismos
bots y esa persona como anfitriona; la sala vieja SHALL guardar el código nuevo (`siguiente`) con escritura
condicional para que solo exista una sala nueva. Si varias personas lo tocan a la vez, SHALL caer todas en la misma
sala nueva. Los demás SHALL ver en su podio «🔁 {Nombre} abrió la revancha» y SHALL poder unirse con un toque. Solo
los jugadores de la sala SHALL poder pedirla y solo cuando la partida haya terminado. Aplica a todos los juegos de
sala.

#### Scenario: Abrir la revancha
- **WHEN** Marisol toca «Otra con los mismos» en el podio de una partida de Maratón de cultura con bots y categoría
  «todas»
- **THEN** entra a la sala de espera de una sala nueva de Maratón de cultura, con categoría «todas», con bots y con
  ella como anfitriona
- **AND** la sala vieja guarda el código nuevo

#### Scenario: Dos personas a la vez
- **WHEN** Marisol y Angel tocan «Otra con los mismos» casi al mismo tiempo
- **THEN** los dos quedan en la misma sala nueva y solo se crea una

#### Scenario: Unirse desde el aviso
- **WHEN** Marisol ya abrió la revancha y Jesús sigue viendo el podio
- **THEN** Jesús ve «🔁 Marisol abrió la revancha» con «Unirme» y, al tocarlo, entra a la misma sala nueva

#### Scenario: Recargar en el podio
- **WHEN** Laura recarga la página en el podio
- **THEN** el inicio de Juegos le ofrece la revancha de esa partida y puede unirse a la misma sala nueva

#### Scenario: Alguien que no jugó
- **WHEN** una persona que no está en la sala pide la revancha
- **THEN** el servidor responde 403 y no crea nada

#### Scenario: Partida sin terminar
- **WHEN** un jugador pide la revancha antes de que nadie haya llegado al podio
- **THEN** el servidor responde 409 `no_termino`

#### Scenario: La revancha ya empezó
- **WHEN** alguien pide unirse a la revancha después de que la anfitriona la empezó
- **THEN** el servidor responde 409 `ya_empezo` y la página muestra «La revancha ya empezó»

#### Scenario: Sala vencida o inexistente
- **WHEN** se pide la revancha de una sala que venció (3 h) o que no existe
- **THEN** el servidor responde 410 o 404

## MODIFIED Requirements

### Requirement: Volver a la partida al recargar
Al entrar a una partida multijugador, la página SHALL dejar el código en la URL (`?sala=CÓDIGO`, conservando los
demás parámetros) y SHALL guardar en el navegador la sala activa con su hora y el id del jugador, nunca el correo.
Al recargar o volver a abrir Juegos en menos de 3 h, la página SHALL regresar sola a esa sala, con su estado, sin
duplicar al jugador. Al salir de la sala o al terminar la partida, SHALL limpiar la URL y la sala guardada. Al
terminar, SHALL guardar solo una marca de revancha (código, hora e id del jugador) que vale 15 min, para ofrecer la
revancha si se recarga en el podio.

#### Scenario: Recargar a mitad de la partida
- **WHEN** una jugadora recarga la página mientras juega una partida de preguntas
- **THEN** vuelve a la misma sala, ve la pregunta en curso y sus respuestas anteriores, y la sala sigue con 2
  personas, no con 3

#### Scenario: Abrir Juegos sin el código en la URL
- **WHEN** alguien que estaba en una sala vigente abre `juegos.html` sin `?sala=`
- **THEN** la página reconecta a esa sala si el servidor confirma que sigue dentro; si no (403, 404 o 410), borra
  la sala guardada y muestra el inicio de Juegos sin error

#### Scenario: Otra persona en el mismo aparato
- **WHEN** quien abre Juegos no es el jugador que guardó la sala
- **THEN** la página no intenta entrar a esa sala

#### Scenario: Cerrar sesión
- **WHEN** alguien cierra sesión en cualquier página (portal, Inglés, Secundaria o Juegos)
- **THEN** se borran la sala guardada, la marca de revancha y la partida individual guardada, y al volver a entrar
  ve el inicio de Juegos

#### Scenario: Salir de la sala
- **WHEN** la jugadora sale con ✕ y recarga
- **THEN** ve el inicio de Juegos, la URL ya no trae `sala` y no vuelve a la sala

#### Scenario: Terminar la partida y recargar
- **WHEN** la jugadora llega al podio y recarga
- **THEN** la URL ya no trae `sala`, no vuelve a la sala y ve el inicio de Juegos con la oferta de revancha

#### Scenario: Volver a unirse en el servidor
- **WHEN** alguien que ya está en la sala vuelve a pedir unirse, aunque la partida ya empezó o la sala está llena
- **THEN** el servidor responde que sí, sin duplicarlo y sin borrar sus respuestas

#### Scenario: Basta por rondas tras recargar
- **WHEN** una jugadora recarga después de que cerraron rondas de Basta en las que ya envió palabras
- **THEN** esas palabras siguen en el servidor y la página no las reemplaza con un envío vacío

#### Scenario: Lotería tras recargar
- **WHEN** una jugadora recarga durante la Lotería en partida
- **THEN** ve marcadas las casillas que ya había marcado
