## ADDED Requirements

### Requirement: Copa completa de Karts en sala
Al crear una sala de `karts`, quien la crea SHALL poder elegir «Una carrera» (como siempre) o «Copa completa» con Copa
Fiesta, Copa Mesoamericana o Copa mixta (2 pistas de cada copa al azar con la semilla de la sala). En una copa, la sala
SHALL correr las 4 carreras seguidas con el mismo calendario en el servidor y en cada aparato
(`juegos/karts-copa.js`): la carrera 1 empieza a la hora de inicio de la sala; cada carrera cierra cuando todas las
personas esperadas mandaron su resultado o al vencer el límite de su pista más la gracia; la siguiente empieza 10 s
después, sola, para todos, mientras se ve la tabla con su cuenta regresiva. Cada persona SHALL mandar el resultado de
cada carrera con `POST /juegos/sala/<código>/respuesta { copa: { carrera, ms, monedas } }`, validado como una carrera
suelta (mínimo y límite de su pista y reloj desde el inicio de esa carrera); el servidor SHALL rechazar con 409
`carrera_fuera_de_turno` una carrera que todavía no toca y con 409 `carrera_cerrada` una que ya cerró. Los puntos por
carrera SHALL ser los del modo individual (15, 12, 10, 8, 6, 4, 2, 1); no terminar SHALL valer 0. Quien se desconecta
SHALL sumar 0 en las carreras que falte y, si vuelve, SHALL entrar en la siguiente; al salir a media carrera la página
SHALL avisar `{ copa: { carrera, abandono: true } }` para que nadie lo espere. Los bots SHALL completar la mesa como
siempre con su tiempo simulado de cada pista y sumar sus propios puntos. El personaje elegido en la sala SHALL valer
para toda la copa y el canal en vivo SHALL seguir abierto entre carreras (sin canal, fantasmas). Al terminar, todos
SHALL ver el podio de la copa con suspenso, la tabla de las 4 carreras y la revancha; los puntos de partida SHALL ser
la suma de los puntos por lugar de cada carrera, con tope 2000 y sin pasar de lo que calcula el servidor.

#### Scenario: Copa en sala con tabla entre carreras
- **WHEN** Marisol crea una sala de Copa Fiesta, Angel entra y los dos terminan la carrera 1 en la Pradera
- **THEN** ambos ven la tabla con sus puntos y los del bot y «Siguiente carrera en N s», y a los 10 s empieza sola la
  carrera 2 en el Cañón del Desierto

#### Scenario: Orden de las carreras
- **WHEN** alguien manda el resultado de la carrera 3 mientras la sala va en la 2
- **THEN** el servidor responde 409 `carrera_fuera_de_turno`

#### Scenario: Se acaba el tiempo
- **WHEN** Angel no llega a la meta antes del límite de la pista
- **THEN** la carrera cierra, Angel suma 0 («NT») y la siguiente empieza sola

#### Scenario: Desconexión y regreso
- **WHEN** Laura cierra la pestaña a media carrera 1 y vuelve durante la carrera 2
- **THEN** nadie la espera en la 2, suma 0 en ellas y corre desde la carrera 3

#### Scenario: Podio de la copa
- **WHEN** termina la carrera 4
- **THEN** cada quien ve el podio de la copa con suspenso, la tabla de las 4 carreras, «Otra con los mismos» y sus
  puntos de partida (tope 2000)

#### Scenario: Una carrera, como siempre
- **WHEN** alguien crea una sala de Karts con «Una carrera» en el Lago Helado
- **THEN** la sala corre esa sola carrera como antes de este cambio
