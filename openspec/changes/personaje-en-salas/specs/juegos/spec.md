## ADDED Requirements

### Requirement: Personaje en las salas de Karts y Axo
En la sala de espera de una partida de `karts` o `plataformas`, cada persona SHALL poder elegir cualquiera de los 8
personajes de `juegos/personajes.js` en una tarjeta «🏁 Tu piloto» (Karts) o «🦎 Tu personaje» (Axo) con retrato,
nombre y, en Karts, peso, en una cuadrícula de 4×2 sin desplazamiento horizontal en un celular de 390 px. La tarjeta
SHALL preseleccionar el personaje del asiento o, si no tiene, el de `localStorage.arcade_personaje` (o Xalli). Al
elegir, la página SHALL guardarlo en `localStorage.arcade_personaje` (compartido con el modo individual) y en el
asiento con `POST /juegos/sala/<código>/unirse { personaje }`. El servidor SHALL validar el id contra la misma lista
de `juegos/personajes.js` y responder 400 `personaje_invalido` si el id no existe o la sala no es de Karts ni Axo, y
409 `ya_empezo` si la sala ya empezó. La lista de jugadores de la sala de espera SHALL mostrar, junto al nombre de
cada persona, su personaje. Al empezar, la página SHALL mandar al juego el personaje propio y el de cada persona; el
juego SHALL usarlo (si falta, `localStorage` y luego Xalli). En Karts en vivo cada kart remoto SHALL dibujarse con el
personaje de su dueño desde la salida, y los fantasmas de los bots SHALL usar personajes que no eligió ninguna
persona cuando alcancen.

#### Scenario: Elegir piloto en la sala de espera
- **WHEN** Marisol entra a la sala de espera de Karts y toca «Tona»
- **THEN** la tarjeta marca a Tona, `localStorage.arcade_personaje` vale `tona` y su asiento guarda `personaje: "tona"`

#### Scenario: Ver el personaje de los demás
- **WHEN** Angel elige Kinich en la misma sala
- **THEN** en la pantalla de Marisol aparece «Kinich» junto al nombre de Angel en la lista de jugadores

#### Scenario: Personaje inválido
- **WHEN** alguien manda `{ personaje: "pikachu" }`
- **THEN** el servidor responde 400 `personaje_invalido` y el asiento no cambia

#### Scenario: Sala ya empezada
- **WHEN** alguien manda `{ personaje: "itzae" }` después de que la sala empezó
- **THEN** el servidor responde 409 `ya_empezo`

#### Scenario: Sala de otro juego
- **WHEN** alguien manda `{ personaje: "itzae" }` en una sala de Fútbol Estelar
- **THEN** el servidor responde 400 `personaje_invalido`

#### Scenario: Persona que todavía no está en la sala
- **WHEN** Laura, que no está en la sala, manda `{ personaje: "yahui" }` y hay lugar
- **THEN** entra a la sala con `personaje: "yahui"`; si la sala está llena, 409 `sala_llena`

#### Scenario: Carrera en vivo con personajes distintos
- **WHEN** Marisol (Tona), Angel (Kinich) y Laura (Yahui) corren una sala de Karts en vivo
- **THEN** cada quien corre con el suyo, ve a los otros dos con su personaje desde la salida y los fantasmas usan
  personajes que nadie eligió

#### Scenario: Nivel de Axo con el personaje elegido
- **WHEN** Marisol elige Xolo en la sala de espera de Axo y empieza la partida
- **THEN** el nivel arranca con Xolo

#### Scenario: Preferencia recordada entre el modo individual y la sala
- **WHEN** alguien elige Itzae en el menú individual de Karts y luego entra a una sala de Axo
- **THEN** la tarjeta de la sala de espera aparece con Itzae marcado
