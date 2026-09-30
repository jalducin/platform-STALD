## ADDED Requirements

### Requirement: Catálogo de juegos
`juegos.html` SHALL mostrar los juegos por categoría: Inglés, Español, Maratón de cultura y Mente ágil.
Cada tarjeta muestra el mejor puntaje de la semana del jugador. Cada juego SHALL terminar en una pantalla
de resultado con puntos y aciertos.

#### Scenario: Jugar y ver el resultado
- **WHEN** una alumna termina "Vocabulario contra reloj"
- **THEN** ve sus puntos, sus aciertos y su posición en el ranking de la semana

### Requirement: Guardar partidas con tope
El sistema SHALL exponer `POST /juegos/partida?email=` con `{ juego, puntos, aciertos, total, segundos }`.
- Solo acepta juegos del catálogo, y recorta los puntos al tope del juego.
- Guarda la partida en la semana (lunes a domingo, CDMX) del jugador.
- Actualiza el mejor puntaje de ese juego y el total de la semana, que es la suma de los mejores por
  juego.

#### Scenario: Primera partida
- **WHEN** Marisol envía 850 puntos en `en-vocab`
- **THEN** responde 200 con `total` 850 y `nuevoRecord` verdadero

#### Scenario: Partida peor no baja el total
- **WHEN** después envía 400 en `en-vocab`
- **THEN** su mejor puntaje en `en-vocab` sigue en 850

#### Scenario: Puntos fuera de rango
- **WHEN** envía 999999 puntos
- **THEN** se guardan como el tope del juego

#### Scenario: Juego inexistente o correo sin registro
- **WHEN** el juego no está en el catálogo
- **THEN** responde 400
- **WHEN** el correo no es alumno, alumna, admin ni invitado registrado
- **THEN** responde 403 `no_registrado`

#### Scenario: Límite diario
- **WHEN** un jugador ya envió 100 partidas hoy
- **THEN** la siguiente responde 429 `limite_diario`

### Requirement: Ranking semanal
El sistema SHALL exponer `GET /juegos/ranking?email=`, con el top 20 de la semana `{ pos, nombre, tipo,
total, juegos }` y la posición propia. SHALL mostrar solo nombres de pila o apodos, nunca correos.

#### Scenario: Orden
- **WHEN** Marisol tiene 1200 y Angel 900
- **THEN** Marisol aparece en la posición 1 y Angel en la 2

#### Scenario: Semana nueva
- **WHEN** empieza otra semana
- **THEN** el ranking empieza vacío y la semana anterior se puede consultar con `?semana=`

### Requirement: Invitados
El sistema SHALL permitir que un correo que no está en las clases se registre como invitado con
`POST /juegos/invitado`, dando un apodo y aceptando el aviso de uso de su correo. Así puede jugar y
aparecer en el ranking como "invitado". Su correo SHALL guardarse solo en el repo privado. Solo el admin
SHALL poder listar a los invitados con sus correos (`GET /juegos/invitados`).

#### Scenario: Registro
- **WHEN** alguien con un correo desconocido se registra con el apodo "Leo" y acepta
- **THEN** puede enviar partidas y aparece en el ranking como "Leo (invitado)"

#### Scenario: Sin aceptar
- **WHEN** no acepta el aviso o el apodo no es válido
- **THEN** responde 400 y no se registra

#### Scenario: Alumno que intenta registrarse
- **WHEN** un correo de alumno o alumna usa el registro de invitado
- **THEN** responde `{ ya: true }` y no se crea un invitado

#### Scenario: Lista para análisis
- **WHEN** el admin consulta `/juegos/invitados`
- **THEN** ve correo, apodo, fechas, visitas y puntos de la semana
- **WHEN** lo consulta alguien más
- **THEN** responde 403
