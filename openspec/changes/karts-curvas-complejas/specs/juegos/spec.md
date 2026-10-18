## ADDED Requirements

### Requirement: Trazados técnicos en las pistas del Espacio y de Reinos Antiguos
Las 4 pistas de la Copa del Espacio y las 4 de la Copa Reinos Antiguos SHALL tener trazados técnicos: cada pista SHALL
tener al menos 4 curvas de más de 120° y al menos una espiral (giro de 360° o más en un solo sentido), un sacacorchos
(270° o más) o un laberinto (4 o más giros de 60° a 120° seguidos), además de chicanas u horquillas. La complejidad SHALL
medirse con una función pura de las definiciones (`KartsPistas.complejidad`). Cada trazado SHALL seguir siendo cerrado,
sin encimarse en el mismo plano, con todas sus curvas de radio ≥ 100 px, la meta en una recta, el minimapa legible
(tramos lejanos ≥ 6 px en 104×72) y una vuelta de largo parecido a la de antes (±15 %). Cada pista SHALL conservar su
identidad y sus mecánicas (compuertas, huecos, portales, gravedad baja, trampas, interiores), colocadas en los tramos
nuevos. Los bots y el piloto de prueba SHALL completar la vuelta con su línea de carrera. Cada pista SHALL sostener 60
cuadros por segundo en un celular con el CPU 4 veces más lento y 8 karts.

#### Scenario: Complejidad medible
- **WHEN** las pruebas recorren las 8 pistas rediseñadas
- **THEN** cada una tiene 4 o más curvas de más de 120° y al menos una espiral, un sacacorchos o un laberinto

#### Scenario: Trazado manejable
- **WHEN** un kart recorre completa una pista rediseñada con el piloto de prueba
- **THEN** el contador marca la vuelta siguiente sin atorarse y los bots terminan la carrera

#### Scenario: Mecánicas en los tramos nuevos
- **WHEN** se colocan las mecánicas de una pista rediseñada
- **THEN** quedan sobre el camino, lejos de la meta, los huecos y plataformas en recta y los portales dentro de la
  misma mitad de la vuelta

#### Scenario: Límites de sala recalculados
- **WHEN** alguien crea una sala en una pista rediseñada
- **THEN** el servidor usa la referencia, el mínimo y el límite calculados con el largo nuevo de esa pista

### Requirement: Récords por trazado
Cuando una pista cambia de trazado, sus récords de antes SHALL archivarse como «trazado anterior» sin compararse con los
nuevos. El progreso de Karts SHALL guardar `pistasV: 3`, `recordsV1` (pistas chicas) y `recordsV2` (trazado anterior
de las pistas con `trazado: 3`). Las copas ganadas, las piezas, el equipo, la copa en curso y los récords de las pistas
que no cambiaron SHALL conservarse. El servidor SHALL aceptar la forma nueva y seguir aceptando las anteriores (pestañas
viejas) y SHALL rechazar `recordsV2` con otra versión.

#### Scenario: Progreso del trazado anterior
- **WHEN** alguien con `pistasV: 2` y récord en la Estación Orbital abre Karts
- **THEN** su récord de la Estación pasa a `recordsV2`, el de Pradera se queda en `records`, ve el aviso de las curvas
  nuevas y en «Carrera rápida» la Estación dice «Sin récord · trazado anterior m:ss»

#### Scenario: Forma inválida
- **WHEN** llega un progreso con `recordsV2` pero `pistasV: 2`
- **THEN** el servidor lo rechaza
