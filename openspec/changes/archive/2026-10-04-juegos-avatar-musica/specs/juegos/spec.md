## ADDED Requirements

### Requirement: Avatar del jugador
Cada jugador SHALL tener un avatar: un personaje de una lista cerrada con un color de fondo. Mientras no
elija, SHALL tener uno por defecto. SHALL poder cambiarlo desde Juegos, y el avatar SHALL verse en el
ranking, en las partidas y en el resumen de juegos del admin. El servidor SHALL rechazar valores fuera de
la lista.

#### Scenario: Cambiar avatar
- **WHEN** Sofy elige 🦊 con color morado y guarda
- **THEN** su chip, el ranking y las partidas muestran 🦊 en morado

#### Scenario: Valor no permitido
- **WHEN** se envía un emoji o color que no está en la lista
- **THEN** responde 400 y no cambia

#### Scenario: Avatar por defecto
- **WHEN** un jugador nuevo entra sin haber elegido
- **THEN** tiene un avatar válido que no cambia entre visitas

### Requirement: Música de fondo
`juegos.html` SHALL ofrecer música de fondo generada en el navegador, con los estilos Alegre, Relajante y
Fiesta, dos volúmenes y la opción Apagada. SHALL empezar solo tras un gesto del usuario, bajar mientras
suena una voz y recordar la preferencia en el dispositivo.

#### Scenario: Elegir estilo
- **WHEN** el jugador elige "😌 Relajante"
- **THEN** suena la música relajante y la preferencia se recuerda al volver

#### Scenario: Apagar
- **WHEN** elige "Apagada"
- **THEN** la música se detiene
