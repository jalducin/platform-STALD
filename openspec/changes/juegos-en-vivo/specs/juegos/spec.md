## ADDED Requirements

### Requirement: Juego en vivo entre navegadores
Las salas con Realtime SHALL permitir mensajes de navegador a navegador por el canal secreto de la sala con el evento
`vivo` (distinto del `estado` que publica el servidor), mediante el módulo `juegos/en-vivo.js`. Cada mensaje SHALL
llevar el id de jugador de la sala, un número de secuencia y la hora del emisor; la página SHALL ignorar los mensajes
de ids que no están en su sala, los repetidos y los que llegan después de uno más nuevo del mismo tipo. El módulo
SHALL limitar el ritmo de envío por tipo de mensaje, avisar quién está conectado, medir la latencia, detectar a quien
deja de mandar mensajes 3 s y reconectar con espera creciente. Si el canal no conecta en 5 s o no hay Realtime, SHALL
avisar el respaldo. Por el canal SHALL NOT viajar correos ni otros datos personales; el nombre que se pinta sale de la
sala. El resultado final SHALL validarlo el servidor.

#### Scenario: Mensaje fuera de orden
- **WHEN** llega el estado 12 de un compañero después del 13
- **THEN** el 12 se descarta y se conserva el 13

#### Scenario: Mensaje de alguien ajeno a la sala
- **WHEN** llega un mensaje con un id que no está en la sala
- **THEN** se ignora

#### Scenario: Compañero desconectado
- **WHEN** un compañero deja de mandar mensajes 3 s
- **THEN** el módulo avisa que ya no está presente, y vuelve a avisar si regresa

#### Scenario: Canal que no conecta
- **WHEN** el canal no conecta en 5 s
- **THEN** el módulo pasa a respaldo y el juego sigue sin vivo

### Requirement: Karts en vivo
En una sala de Karts con Realtime, cada persona SHALL mandar el estado de su kart (posición, ángulo, velocidad, vuelta,
avance, turbo/estrella/derrape y personaje) 15 veces por segundo con hasta 4 personas y 10 con 5 a 8. Las demás SHALL
verlo en la vista pseudo-3D y en el minimapa con su personaje y su nombre de la sala, interpolado y con extrapolación
acotada. La posición y una clasificación en vivo SHALL calcularse por avance contando personas y fantasmas. Los
choques entre personas SHALL ser un empuje local del kart propio; los ítems no afectan a otras personas. Si alguien se
desconecta, su kart SHALL desvanecerse con un aviso. Los bots SHALL seguir como fantasmas y el podio SHALL seguir
saliendo del servidor con el tiempo de cada quien. Sin Realtime, o si el canal no conecta en 5 s, la carrera SHALL
correr como antes (fantasmas y comparación de tiempos) con un aviso claro.

#### Scenario: Ver el kart de un compañero
- **WHEN** Marisol y Angel corren en la misma sala con Realtime
- **THEN** cada quien ve el kart de la otra persona moverse en la pista y en el minimapa, con su nombre encima

#### Scenario: Clasificación en vivo
- **WHEN** Angel rebasa a Marisol
- **THEN** la posición y la clasificación en vivo de las dos pantallas cambian

#### Scenario: Compañero que se desconecta
- **WHEN** Angel cierra su pestaña a media carrera
- **THEN** a Marisol le aparece «👋 Angel perdió la conexión» y su kart se desvanece

#### Scenario: Sin Realtime
- **WHEN** la sala no tiene Realtime
- **THEN** la carrera corre contra fantasmas con el aviso «Sin conexión en vivo» y el podio compara tiempos

## MODIFIED Requirements

### Requirement: Carreras de Arcade en partida
Las partidas (salas) SHALL permitir `plataformas` y `karts` como reto sin guardar avance:
- todos SHALL jugar el mismo nivel o pista, guardado en `sala.opciones.mapa` (lo elige quien crea la sala o el
  servidor al azar; 400 `mapa_invalido` si no existe), y la carrera empieza a la hora de inicio del servidor;
- cada persona SHALL enviar su tiempo con `POST /juegos/sala/<código>/respuesta { carrera: { ms, monedas } }`
  (`ms: null` si no terminó); solo cuenta el primero; el servidor SHALL rechazar con 400 `carrera_invalida` un
  tiempo fuera del mínimo y el límite del juego o que no cuadre con su reloj;
- BOT-VACHIRA y BOT-ISAGII, si la sala tiene bots, SHALL tener tiempos simulados creíbles, iguales en todos los
  dispositivos (semilla);
- una sala de `karts` SHALL admitir hasta 8 personas; con bots, los bots SHALL completar 3 lugares y cada persona que
  entra SHALL quitar uno (1 persona + 2 bots, 2 + 1, 3 o más sin bots);
- el podio SHALL ordenarse por tiempo cuando todas las personas terminaron o al vencer el límite, y los puntos por
  lugar se guardan como partida de sala; el progreso individual SHALL NOT cambiar.

#### Scenario: Podio con bots
- **WHEN** Marisol termina la carrera de su sala con bots en 20 s
- **THEN** ve el podio con su tiempo y los de BOT-VACHIRA y BOT-ISAGII, y sus puntos se suman a 👥 partidas

#### Scenario: Tiempo imposible
- **WHEN** alguien envía `ms: 5000` cuando la carrera empezó hace 60 s
- **THEN** responde 400 `carrera_invalida`

#### Scenario: Revancha con el mismo mapa
- **WHEN** termina una carrera de karts en «Lago Helado» y alguien toca «Otra con los mismos»
- **THEN** la sala nueva usa la misma pista

#### Scenario: La partida no guarda progreso
- **WHEN** alguien juega Karts Turbo en una sala
- **THEN** su progreso individual de karts no cambia

#### Scenario: Sala de Karts llena
- **WHEN** ya hay 8 personas en una sala de Karts y entra una más
- **THEN** responde 409 `sala_llena`

#### Scenario: Cada persona quita un bot
- **WHEN** entran 2 personas a una sala de Karts con bots
- **THEN** corren 2 personas y 1 bot

### Requirement: Partidas en tiempo real con Supabase Realtime
Cuando hay configuración de Supabase, cada sala SHALL tener un canal secreto. El servidor SHALL publicar el estado de la
sala en ese canal tras cada cambio, y las páginas de los jugadores SHALL recibirlo sin consultar periódicamente; solo
harán una consulta de respaldo cada 30 s. Si el canal falla, la página SHALL volver al sondeo normal. Sin configuración,
todo SHALL funcionar como antes. Los navegadores de la sala SHALL poder mandarse mensajes por el mismo canal con el
evento `vivo` (requisito «Juego en vivo entre navegadores») sin cambiar la configuración de Supabase.

#### Scenario: Ver un cambio al instante sin sondear
- **WHEN** Angel responde una pregunta en la sala de Sofy
- **THEN** la página de Sofy recibe el nuevo estado por Realtime, sin haber consultado al servidor

#### Scenario: Canal privado de la sala
- **WHEN** alguien que no está en la sala intenta obtener su canal
- **THEN** el servidor no se lo da (403), y el canal no se puede adivinar

#### Scenario: Avisos fuera de orden
- **WHEN** dos jugadores escriben casi al mismo tiempo y el aviso más viejo llega después del nuevo
- **THEN** la página conserva la versión más nueva de cada jugador (contador `v`) y no regresa una sala ya empezada

#### Scenario: Realtime caído
- **WHEN** la conexión con Realtime falla
- **THEN** la página vuelve a consultar cada 2.5–5 s y la partida sigue

#### Scenario: Sin configuración
- **WHEN** el servidor no tiene las variables de Supabase
- **THEN** no se entrega `rt` y las salas funcionan con sondeo, como hoy

#### Scenario: Mensajes en vivo por el mismo canal
- **WHEN** dos navegadores de la sala se mandan el evento `vivo`
- **THEN** cada uno recibe el del otro y el evento `estado` del servidor sigue llegando igual
