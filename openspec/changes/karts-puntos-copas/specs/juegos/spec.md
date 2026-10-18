## ADDED Requirements

### Requirement: Los puntos de cada copa de Karts se guardan o se avisa por qué no
En el modo individual, ganar (o terminar) una carrera de cualquier copa de `KartsPistas.COPAS` SHALL sumar los puntos
por lugar (15, 12, 10, 8, 6, 4, 2, 1) a la copa en curso, mostrarlos en la tabla de resultados y guardarlos en el
servidor de forma que sobrevivan a recargar la página. El juego SHALL anotar como récord solo tiempos que el servidor
acepta (de 10 s a 15 min), de modo que una carrera muy larga nunca impida guardar la copa. El servidor SHALL validar
las copas, el tope de puntos, los corredores de la copa y el rango de los récords con las definiciones de
`juegos/karts-pistas.js`, sin listas copiadas. Si el servidor no guarda el avance, el juego SHALL avisarlo con el
motivo y dejarlo escrito en los resultados. En la copa en sala, si el servidor rechaza tu tiempo de una carrera, el
juego SHALL avisarlo con el motivo. El menú SHALL mostrar tus puntos y tu lugar en la copa en curso.

#### Scenario: Copa Reinos Antiguos, carrera 1 en 1.er lugar
- **WHEN** alguien con podio en otra copa gana la carrera 1 de la Copa Reinos Antiguos
- **THEN** la tabla dice +15 y Copa 15, el servidor guarda la copa en curso con 15 y, tras recargar, el menú ofrece
  «Continuar Copa Reinos Antiguos · Carrera 2 de 4 · ⭐ 15 pts»

#### Scenario: Las demás copas
- **WHEN** se gana la carrera 1 de la Copa Fiesta, la Mesoamericana o la del Espacio
- **THEN** pasa lo mismo que en la Copa Reinos Antiguos

#### Scenario: Carrera de más de 15 minutos
- **WHEN** una carrera de copa termina después de 15 minutos (pestaña oculta o atorado)
- **THEN** no se anota récord, la copa en curso suma sus puntos y el servidor acepta el avance

#### Scenario: El servidor rechaza el avance
- **WHEN** el servidor responde un error al guardar el avance
- **THEN** el juego avisa «No se guardó tu avance de la copa (motivo)» y lo deja escrito en los resultados

#### Scenario: Copa en sala con el tiempo rechazado
- **WHEN** el servidor rechaza el tiempo de una carrera de la copa en sala
- **THEN** el juego avisa que no se guardó ese tiempo y el motivo

#### Scenario: Copa que no existe
- **WHEN** llega un avance con una copa que no está en `KartsPistas.COPAS`
- **THEN** el servidor lo rechaza con `400 progreso_invalido`
