## ADDED Requirements

### Requirement: Salto en Karts
«Karts Turbo» SHALL tener una acción `salto` en `KartsEntrada`: un brinco corto (entre 0.35 y 0.45 s en el aire) con
sombra en el piso y un aplastón al caer, con enfriamiento de al menos 0.5 s después de caer. En el aire el giro SHALL
ser suave (sin volantazos). El salto SHALL activarse:
- en el celular con el botón «⤴ SALTO», visible en Botones, Joystick y Sensor sin encimarse con los demás en vertical
  ni en horizontal;
- con el mando clásico, presionando R o L (mantener girando sigue siendo derrape);
- con el teclado, presionando ESPACIO (mantener girando sigue siendo derrape).

El tutorial de controles SHALL mostrar el salto.

#### Scenario: Botón de salto en el celular
- **WHEN** en la carrera toca «⤴ SALTO»
- **THEN** su carro sube y vuelve a bajar en menos de medio segundo

#### Scenario: Sin spam
- **WHEN** toca «⤴ SALTO» otra vez justo al caer
- **THEN** no brinca hasta que pasa el enfriamiento

#### Scenario: Salto y giro = derrape
- **WHEN** mantiene «⤴ SALTO» y gira al caer, con velocidad
- **THEN** empieza el derrape y al soltarlo recibe su mini-turbo

### Requirement: El salto es justo
El salto SHALL esquivar la cáscara y la bola en el piso si las pasa en lo alto del brinco. El salto SHALL NOT
esquivar el cohete, el rayo, los bloques que caen ni la roca rodante, SHALL NOT acelerar, SHALL NOT evitar el freno
del lodo ni del cenote, SHALL NOT cruzar los huecos del espacio sin rampa (si no hay piso, cae y llega el dron) y
SHALL NOT cambiar el conteo de vueltas.

#### Scenario: Esquiva una cáscara
- **WHEN** brinca justo antes de una cáscara
- **THEN** pasa sin golpe y la cáscara sigue en la pista

#### Scenario: No cruza un hueco del espacio
- **WHEN** brinca sobre un hueco del espacio sin usar la rampa
- **THEN** cae al vacío y el dron lo regresa

### Requirement: Salto en vivo
En sala en vivo, el estado del kart SHALL incluir su altura para que las demás personas vean el brinco.

#### Scenario: La otra persona ve el brinco
- **WHEN** una persona brinca en una sala en vivo
- **THEN** en el aparato de la otra su kart sube y baja
