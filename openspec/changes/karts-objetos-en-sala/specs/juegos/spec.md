## ADDED Requirements

### Requirement: Ítems entre personas en sala de Karts
En una partida de «Karts Turbo» en sala con canal en vivo, las cajas SHALL dar los mismos ítems que en el modo
individual (🍌 cáscara, 🟢 bola, 🌶️ turbo, 🚀 cohete, ⭐ estrella, 🪙 monedas y ⚡ rayo) con una tabla por lugar en la
que quien va más atrás recibe mejores, un poco más suave que la individual. Cada aparato SHALL seguir mandando solo
sobre su kart: quien usa un ítem SHALL avisar por el canal de la sala (sin correos ni nombres) y cada aparato SHALL
dibujar el objeto con la misma simulación determinista y revisar los golpes solo contra su kart; quien recibe un golpe
SHALL girar en su pantalla y avisar para que los demás quiten el objeto y lo vean girar. El rayo SHALL frenar a
quienes iban adelante de quien lo usó a esa hora de la carrera (reloj común de la sala). La estrella SHALL dar
inmunidad. Cada aparato SHALL descartar eventos repetidos, viejos (más de 4 s o número ya visto), de quien no es
participante o de más de 1 ítem por segundo de la misma persona, y tras un golpe de ítem SHALL dar 4 s de gracia para
que el tiempo siga dentro del límite de la pista. Sin canal en vivo, la sala SHALL usar la tabla reducida (monedas,
turbo y estrella) y los fantasmas no SHALL recibir ítems. En la copa en sala SHALL aplicar igual, carrera por carrera.
Con 8 karts en vivo e ítems la carrera SHALL sostener 60 cuadros por segundo con el CPU 4 veces más lento.

#### Scenario: Cohete a quien va adelante
- **WHEN** Marisol, en 2.º lugar, usa un 🚀 cohete en la sala
- **THEN** el cohete persigue a quien va 1.º, que gira en su pantalla al alcanzarlo, y Marisol lo ve girar

#### Scenario: Cáscara en la pista
- **WHEN** Marisol suelta una 🍌 cáscara y Angel pasa encima
- **THEN** Angel gira en su pantalla y la cáscara desaparece en todas las pantallas

#### Scenario: Rayo
- **WHEN** quien va último usa el ⚡ rayo
- **THEN** quienes iban adelante a esa hora de la carrera se frenan y quien lo usó no

#### Scenario: Estrella
- **WHEN** alguien con ⭐ estrella recibe un cohete o pisa una cáscara
- **THEN** no gira

#### Scenario: Red lenta o con pérdida
- **WHEN** el aviso de un ítem llega dos veces, tarde o desordenado
- **THEN** cada aparato dibuja un solo objeto y descarta el aviso repetido o de más de 4 s

#### Scenario: Demasiados ítems
- **WHEN** llegan dos ítems de la misma persona con menos de 1 s de diferencia
- **THEN** el segundo se descarta

#### Scenario: Sala sin canal en vivo
- **WHEN** la sala corre en respaldo con fantasmas
- **THEN** las cajas solo dan monedas, turbo o estrella y los fantasmas no reciben ítems
