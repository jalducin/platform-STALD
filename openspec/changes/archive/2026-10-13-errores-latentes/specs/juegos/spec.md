## ADDED Requirements

### Requirement: Escrituras de las salas que no se guardan
Las rutas de salas SHALL responder 503 `conflicto_escritura` en lugar de `ok` cuando no se guarda su escritura.
Aplica a `POST /juegos/sala` (crear), `/unirse`, `/empezar` y `/revancha`, tras sus reintentos con escritura
condicional, y el estado guardado SHALL quedar consistente: sin jugador «medio unido», sin sala «medio empezada» y sin sala
creada sin anfitrión. `/empezar` SHALL reintentar con la versión fresca de la sala, responder con la sala ya empezada
si otra petición la empezó antes, y responder 404 `sala_no_existe` si la sala ya no existe. `juegos.html` SHALL
mostrar un mensaje claro en lugar del código del error.

#### Scenario: Unirse sin que se guarde
- **WHEN** alguien se une a una sala y la escritura de su archivo falla las 3 veces
- **THEN** el servidor responde 503 `conflicto_escritura`, esa persona no aparece entre los jugadores de la sala y la
  página muestra «No se pudo entrar a la sala, intenta de nuevo.»

#### Scenario: Empezar sin que se guarde
- **WHEN** el anfitrión toca «Empezar» y la escritura de la sala falla las 3 veces
- **THEN** el servidor responde 503 `conflicto_escritura`, la sala sigue sin `inicio`, la página muestra «No se pudo
  empezar la partida, intenta de nuevo.» y el botón «Empezar» vuelve a quedar activo

#### Scenario: Empezar cuando otra petición ya la empezó
- **WHEN** la escritura choca porque otra petición del anfitrión ya fijó `inicio`
- **THEN** el servidor responde `ok` con la sala ya empezada (mismo `inicio`), sin escribirla otra vez

#### Scenario: Crear sin que se guarde
- **WHEN** alguien crea una partida y no se puede guardar la sala o su archivo de jugador
- **THEN** el servidor responde 503 `conflicto_escritura`, no queda una sala sin anfitrión y la página muestra «No se
  pudo crear la partida, intenta de nuevo.»

#### Scenario: Revancha sin que se guarde quien la pide
- **WHEN** alguien pide la revancha y su archivo de jugador en la sala nueva no se puede guardar
- **THEN** el servidor responde 503 `conflicto_escritura` con el `codigo` de la revancha y la página muestra «No se
  pudo entrar a la revancha, intenta de nuevo.»

### Requirement: Respuestas y parámetros incompletos no rompen el juego
Los juegos de `juegos.html` SHALL tolerar una respuesta del servidor sin los campos esperados, y los generadores de
preguntas SHALL tolerar parámetros inválidos, sin errores de JavaScript ni bucles sin fin.

#### Scenario: Disparo de Batalla naval sin jugadas en la respuesta
- **WHEN** en una sala de Batalla naval llega la respuesta `ok` de un disparo sin el campo `jugadas`
- **THEN** la página no tiene errores de JavaScript, el tablero queda como está y se sincroniza con el siguiente sondeo

#### Scenario: Cálculo y secuencias con un número de pregunta inválido
- **WHEN** `genCalculo` o `genSecuencia` reciben `n` que no es un entero ≥ 0 (`NaN`, negativo, `undefined`, texto) o
  un `aleatorio` que no es función
- **THEN** terminan y devuelven una pregunta válida (4 opciones distintas con la correcta entre ellas), igual que con
  `n = 0`
