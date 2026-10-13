## ADDED Requirements

### Requirement: Pistas mesoamericanas de Karts
«Karts Turbo» SHALL ofrecer, además de sus 4 pistas originales, 4 pistas inspiradas en civilizaciones de México, cada
una con un trazado cerrado y manejable, su cielo de 360° con una silueta reconocible, su escenario, su minimapa, su
nombre y una descripción corta en el selector, y al menos una mecánica determinista propia:
- **Calzadas de Tenochtitlan** (mexica): calzadas sobre el lago, canales, chinampas y el Templo Mayor en el
  horizonte; una trajinera cruza el canal y hace girar a quien choca con ella.
- **Calzada de los Muertos** (Teotihuacan): la calzada entre las pirámides del Sol y de la Luna con cabezas de
  serpiente emplumada en las orillas; rampas de velocidad que dan un turbo corto.
- **Sacbé de Chichén Itzá** (maya): selva, El Castillo al fondo y un tramo por el juego de pelota; una rampa salta
  sobre el cenote y, sin salto, el agua del cenote frena.
- **Selva de La Venta** (olmeca): selva húmeda, cabezas colosales junto a la pista y un río; zonas de lodo que frenan.
La representación SHALL ser respetuosa (sin caricaturas) y sin marcas de terceros. Las definiciones de las pistas
SHALL vivir en `juegos/karts-pistas.js`. Las partidas en sala SHALL ofrecer las 8 pistas (cambio `juegos-en-vivo`). Cada
pista nueva SHALL sostener 60 cuadros por segundo en un celular con el CPU 4 veces más lento.

#### Scenario: Elegir una pista nueva
- **WHEN** alguien abre «Carrera rápida»
- **THEN** ve las 8 pistas agrupadas por copa, cada una con su nombre, su descripción corta, su récord y su meta

#### Scenario: Trajinera en Tenochtitlan
- **WHEN** su kart choca con la trajinera que cruza el canal
- **THEN** su kart gira y pierde 2 monedas, igual que con una cáscara

#### Scenario: Salto sobre el cenote
- **WHEN** pasa por la rampa de Chichén Itzá a buena velocidad
- **THEN** su kart salta sobre el cenote sin frenarse; si pasa sin saltar, el agua lo frena

#### Scenario: Lodo en La Venta
- **WHEN** su kart entra a una zona de lodo
- **THEN** su velocidad punta baja mientras siga en el lodo

#### Scenario: Vuelta completa en una pista nueva
- **WHEN** un kart recorre completa cualquiera de las pistas nuevas
- **THEN** el contador marca la vuelta siguiente y el minimapa muestra el trazado completo

#### Scenario: Sala con las pistas nuevas
- **WHEN** alguien crea una partida de Karts en sala
- **THEN** el selector de mapa ofrece las 8 pistas, igual que el servidor (cambio `juegos-en-vivo`)

### Requirement: Copa Mesoamericana
«Karts Turbo» SHALL ofrecer la **Copa Mesoamericana** (La Venta, Teotihuacan, Chichén Itzá y Tenochtitlan) junto a la
Copa Fiesta, con las mismas reglas (4 carreras, puntos por lugar, bono y piezas). La copa en curso SHALL guardarse con
su identificador, el mejor resultado de cada copa por separado y los récords por pista, con la misma forma de
progreso; un progreso guardado antes de este cambio SHALL seguir funcionando (una copa en curso sin identificador es
la Copa Fiesta).

#### Scenario: Empezar la Copa Mesoamericana
- **WHEN** elige «Copa Mesoamericana» en el menú
- **THEN** la carrera 1 de 4 es en la Selva de La Venta

#### Scenario: Continuar tras recargar
- **WHEN** recarga después de la primera carrera de la Copa Mesoamericana
- **THEN** puede continuarla en la carrera 2 de 4 (Calzada de los Muertos) con los mismos puntos

#### Scenario: Progreso anterior
- **WHEN** abre Karts con una Copa Fiesta en curso guardada antes de este cambio
- **THEN** puede continuarla como siempre
