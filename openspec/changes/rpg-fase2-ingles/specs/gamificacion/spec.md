## ADDED Requirements

### Requirement: Tablero RPG en Inglés
La vista de alumnos y alumnas de `ingles.html` («🏠 Inicio») SHALL mostrar nivel, rango, XP del nivel, insignias y
racha calculados en el navegador con `comun/gamificacion.js` a partir de `/ingles/actividades` (reglas de XP y nivel de
la Fase 1, sin cambios), y el mundo actual de Inglés. SHALL NOT guardar nada nuevo ni quitar lo que ya existe en Inglés
(«Esta semana», «Para ponerte al día», la próxima clase por Meet, «Para hoy», «Material de estudio»). SHALL verse a
360 px sin scroll horizontal, en claro y oscuro.

#### Scenario: Alumna con actividades entregadas
- **WHEN** una alumna con 310 XP abre Inglés
- **THEN** ve «Nivel 2 · Aprendiz», «10 / 300» de XP, sus insignias de Inglés logradas y su racha

#### Scenario: Lo demás sigue igual
- **WHEN** abre «📅 Semana» o «📚 Material»
- **THEN** ve lo mismo que antes del tablero RPG

### Requirement: Interruptor general del ranking
El ranking de Inglés SHALL estar detrás de un interruptor general del profe, la llave `ranking` de los interruptores
públicos (`config/interruptores.json` en `stald_docs`, el mismo mecanismo que `privacidad`), **apagado por defecto**
(también si el documento no existe o no se puede leer), sin redeploy y con efecto en a lo más un minuto. El apagado por
grupo SHALL vivir en `gamificacion/config.json` (`gruposSinRanking`), con efecto inmediato. Con el
interruptor apagado o el grupo apagado, `GET /gamificacion/perfil` SHALL responder solo `{ ranking: false }`,
`PUT /gamificacion/perfil { aparecer: true }` y `GET /gamificacion/ranking` SHALL responder 404 `sin_ranking`, y la
página SHALL NOT mostrar nada del ranking (ni la tarjeta ni el botón para aparecer). Ocultarse
(`PUT { aparecer: false }`) SHALL aceptarse siempre, también con el ranking apagado.

#### Scenario: Recién publicado
- **WHEN** nadie ha encendido el interruptor y un alumno abre Inglés
- **THEN** ve su tablero RPG sin «🏆 Ranking de mi grupo» ni «Aparecer en el ranking», y el ranking responde 404

#### Scenario: El profe lo enciende
- **WHEN** el profe pulsa «▶️ Encender el ranking»
- **THEN** en la siguiente carga sus alumnos y alumnas ven «🏆 Ranking de mi grupo», con todos ocultos hasta que lo activen

#### Scenario: El profe lo apaga
- **WHEN** el profe lo apaga con alguien apareciendo
- **THEN** la siguiente petición al ranking responde 404 y la tarjeta desaparece

### Requirement: Nick de Juegos para el ranking
El ranking de Inglés SHALL usar el nick de Juegos de cada persona (spec `juegos`, sin cambios). Con el interruptor general encendido, un alumno o alumna
activo de Inglés SHALL poder pedir aparecer en el ranking con `PUT /gamificacion/perfil { aparecer: true }`. El
servidor SHALL aceptarlo solo si tiene nick de Juegos y ese nick no contiene correos, teléfonos, ningún nombre de pila
del registro de alumnos y alumnas ni palabras de la lista bloqueada, usa solo letras latinas y números (tras normalizar
letras de ancho completo y acentos) y ninguna otra persona tiene el mismo nick en Juegos; si no pasa, SHALL responder 400 con el motivo y
pedir cambiarlo en Juegos. El nick SHALL quedar «pendiente» hasta que el profe lo apruebe, y SHALL volver a
«pendiente» si la persona lo cambia en Juegos. El perfil (`gamificacion/perfiles/<slug>.json`) SHALL guardar la
preferencia de aparecer y el valor del nick aprobado, sin correo.

#### Scenario: Pide aparecer con un nick válido
- **WHEN** una alumna con el nick de Juegos «Estrella Azul» activa «Aparecer en el ranking»
- **THEN** queda pendiente y no aparece en el ranking hasta que el profe lo aprueba

#### Scenario: Nick con un nombre del registro
- **WHEN** un alumno cuyo nick de Juegos contiene el nombre de pila de un compañero pide aparecer
- **THEN** el servidor responde 400 `nick_invalido` con un mensaje que explica por qué y le pide cambiarlo en Juegos

#### Scenario: Sin nick de Juegos
- **WHEN** alguien sin nick de Juegos pide aparecer
- **THEN** el servidor responde 400 `sin_nick` y la vista le explica cómo ponerse uno en Juegos

#### Scenario: Cambia su nick en Juegos
- **WHEN** un alumno con nick aprobado lo cambia en Juegos
- **THEN** deja de aparecer en el ranking hasta que el profe apruebe el nick nuevo

#### Scenario: Perfil de otra persona
- **WHEN** alguien intenta cambiar el perfil de otra persona
- **THEN** el servidor responde 403

#### Scenario: Sin sesión
- **WHEN** se pide o se cambia el perfil sin sesión
- **THEN** el servidor responde 401

#### Scenario: Invitado de Juegos o persona de baja
- **WHEN** un invitado de Juegos o un alumno dado de baja de Inglés pide aparecer
- **THEN** el servidor responde 403

### Requirement: Ranking por grupo con nicks, sin calificaciones
`GET /gamificacion/ranking` SHALL devolver, solo para el grupo de Inglés de quien pregunta y para la semana actual
(lunes 00:00 a domingo 23:59, hora de la Ciudad de México), la posición, el nick de Juegos y los **puntos de
constancia** de quienes activaron aparecer, tienen su nick aprobado y están activos, más la posición propia aunque
esté oculto. Los puntos
de constancia SHALL contar esfuerzo, no calificaciones: 10 por actividad enviada a tiempo, 5 por enviada tarde y 20
por paso de misión entregado, según la fecha de envío. La respuesta SHALL NOT incluir nombres, correos, slugs, fotos,
XP, nivel ni calificaciones. Por defecto cada persona SHALL estar oculta: SHALL aparecer solo si lo activa y su nick
está aprobado, y SHALL poder ocultarse o volver a aparecer en cualquier momento. La caché del ranking SHALL invalidarse al cambiar un nick, su
aprobación o la preferencia de ocultarse. El profe SHALL poder apagar el ranking de un grupo, y el ranking SHALL responder solo si el interruptor general
está encendido (requisito «Interruptor general del ranking»). Secundaria SHALL NOT tener ranking. Una actividad SHALL
contar una sola vez, por su primer envío.

#### Scenario: Alumno del grupo
- **WHEN** un alumno del grupo 1 abre el ranking
- **THEN** ve nicks y puntos de constancia de su grupo y su propia posición, sin nombres, correos, XP ni
  calificaciones

#### Scenario: Oculto por defecto
- **WHEN** un alumno con nick aprobado nunca activó «Aparecer en el ranking»
- **THEN** no aparece en la lista de los demás y él ve su propia posición en privado

#### Scenario: Alumna que se oculta
- **WHEN** una alumna que aparecía activa «No aparecer en el ranking»
- **THEN** desaparece de la lista de los demás en la siguiente carga y ella sigue viendo su posición en privado

#### Scenario: Persona de baja
- **WHEN** un alumno está dado de baja de Inglés
- **THEN** no aparece en el ranking de su antiguo grupo

#### Scenario: Otro grupo
- **WHEN** un alumno pide `?grupo=` de un grupo que no es el suyo
- **THEN** el servidor responde 403

#### Scenario: Secundaria
- **WHEN** la alumna de Secundaria pide el ranking
- **THEN** el servidor responde 404 `sin_ranking` y su vista no muestra ranking («tu mejor semana» queda para un cambio
  de Secundaria)

#### Scenario: Ranking apagado
- **WHEN** el profe apagó el ranking del grupo
- **THEN** el servidor responde 404 `sin_ranking` a sus integrantes

#### Scenario: Sin sesión
- **WHEN** se pide el ranking sin sesión
- **THEN** el servidor responde 401

#### Scenario: Falla de Postgres
- **WHEN** Postgres no responde al calcular el ranking
- **THEN** el servidor responde 503 y la vista dice «El ranking no está disponible ahora» sin afectar el resto

#### Scenario: Admin
- **WHEN** el profe pide `GET /profe/nicks?grupo=`
- **THEN** ve por persona su nombre de pila, nick de Juegos, estado de aprobación y si pidió aparecer (respuesta solo
  para el admin, sin correos)
