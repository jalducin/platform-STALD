## ADDED Requirements

### Requirement: Reversa en Karts
«Karts Turbo» SHALL tener una acción `reversa` en su capa de entrada `KartsEntrada`. Mientras se mantiene, el carro
SHALL ir hacia atrás a baja velocidad (entre 35 % y 40 % de su punta) con aceleración suave; si iba hacia adelante,
SHALL frenar primero. Con la reversa el giro SHALL quedar invertido, como un carro real. La reversa SHALL activarse:
- en el celular con el botón «⏪ REVERSA», visible en los controles Botones, Joystick y Sensor sin encimarse con los
  demás en vertical ni en horizontal; con «Acelerar: Automático» la reversa SHALL mandar mientras se mantiene;
- con el mando clásico, manteniendo B estando parado;
- con el teclado, manteniendo ↓/S estando parado, o con la tecla R.

La reversa SHALL NOT usarse con el motor ahogado, girando por un golpe, cayendo, con el dron, al terminar la carrera,
en el piloto de prueba ni por los bots. El tutorial de controles SHALL mostrar la reversa.

#### Scenario: Botón de reversa en el celular
- **WHEN** en la carrera mantiene «⏪ REVERSA» con el dedo
- **THEN** su carro va hacia atrás despacio y al soltarlo deja de retroceder

#### Scenario: Mando: B estando parado
- **WHEN** con el mando clásico mantiene B hasta detenerse y lo sigue manteniendo
- **THEN** su carro empieza a ir hacia atrás

#### Scenario: Teclado
- **WHEN** mantiene ↓ estando parado, o mantiene R
- **THEN** su carro va hacia atrás

#### Scenario: Volante invertido
- **WHEN** en reversa gira a la izquierda
- **THEN** la trompa del carro gira hacia la derecha, como un carro real

### Requirement: Vueltas justas al cruzar la meta en reversa
Cruzar la meta hacia atrás SHALL restar una vuelta del marcador y dejarla pendiente; volver a cruzarla hacia adelante
SHALL solo reponerla, sin aviso ni sonido de vuelta. Ir y venir sobre la meta SHALL NOT sumar vueltas ni terminar la
carrera. En sala, el kart SHALL mandar su estado como siempre.

#### Scenario: Reversa sobre la meta no cuenta vuelta
- **WHEN** cruza la meta hacia adelante, retrocede sobre ella y la vuelve a cruzar hacia adelante varias veces
- **THEN** su marcador termina con una sola vuelta más que antes de llegar a la meta
