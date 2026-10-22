## ADDED Requirements

### Requirement: Reglas de XP y nivel de la Fase 1 como invariante
El sistema SHALL calcular la XP de cada clase como su mejor porcentaje (0 a 100) más 20 si se entregó a tiempo, con el
mini examen 🎯 contando doble, y el nivel como floor(XP / 300) + 1, tal como lo implementa la Fase 1 (la forma exacta
del doble, incluido si el bono de 20 también se duplica, es la de `comun/gamificacion.js` de la Fase 1). Las fases 2 a
4 SHALL NOT cambiar estas reglas; solo SHALL sumar XP de misiones principales al mismo total. La XP SHALL NOT ser
negativa ni restarse como castigo (clases vencidas o errores); solo SHALL cambiar hacia abajo si el profe corrige una
calificación.

#### Scenario: Clase a tiempo
- **WHEN** una alumna saca 85 % en una clase sin tema 🎯 y la envía antes de su `fechaLimite`
- **THEN** esa clase le da 105 XP

#### Scenario: Mini examen tardío
- **WHEN** un alumno saca 70 % en el mini examen 🎯 después de la fecha límite
- **THEN** ese mini examen le da 140 XP

#### Scenario: Subir de nivel
- **WHEN** su XP total pasa de 290 a 310
- **THEN** su nivel pasa de 1 a 2

#### Scenario: Clase vencida sin intento
- **WHEN** una clase vence sin ningún intento
- **THEN** da 0 XP, no resta XP y aparece en «por recuperar»

### Requirement: Estado de gamificación derivado de los resultados
XP, nivel, rango, racha, insignias automáticas, estado de mundos y árbol de habilidades SHALL calcularse con una sola
función pura a partir de los resultados y del contenido, la misma en el navegador y en el servidor. El sistema SHALL
NOT guardar XP acumulada en Postgres. Del estado de gamificación solo SHALL guardarse en `stald_docs` lo que no se
puede derivar: nick, estado del nick, preferencia de ranking e insignias manuales (`gamificacion/perfiles/<slug>.json`)
y la configuración del ranking por grupo (`gamificacion/config.json`). El perfil SHALL borrarse 30 días después de la
baja de la persona.

#### Scenario: El profe corrige una calificación
- **WHEN** el profe reinicia un intento o da una prórroga y la calificación cambia
- **THEN** la XP y el nivel reflejan el cambio en la siguiente carga sin ninguna migración

#### Scenario: Navegador y servidor coinciden
- **WHEN** se calculan los 10 casos fijos de prueba (XP, nivel y racha) en el navegador y en el servidor
- **THEN** ambos dan los mismos valores

### Requirement: Mundos, zonas y capítulos
El año escolar SHALL organizarse en mundos (bloque temático de una materia), zonas (bloques de 2 semanas) y capítulos
(clases). El catálogo SHALL vivir en `contenido/<ámbito>/mundos.json` del repo privado con `id`, `materia`, `nombre`,
`emoji`, `desde`, `hasta` y `misionPrincipal` opcional. Una clase SHALL pertenecer al mundo indicado en su campo
opcional `mundo` o, si no lo trae, al mundo de su `materia` cuyo rango de fechas contiene su `disponibleDesde`. Sin
catálogo, el sistema SHALL usar la derivación de la Fase 1. Un mundo SHALL estar bloqueado antes de su `desde`, en curso
dentro de su rango, completado tras su `hasta` con su misión principal evaluada, y dominado si además su promedio y su
misión principal son ≥ 80 %. Un mundo ya pasado SHALL poder abrirse para repasar.

#### Scenario: Clase dentro de un mundo
- **WHEN** una clase de Matemáticas abre el 2026-11-03 y Aritmética va del 2026-10-26 al 2026-11-22
- **THEN** la clase aparece como capítulo de la zona 1 del mundo «Valle de los Números»

#### Scenario: Mundo futuro
- **WHEN** la alumna abre el mapa el 2026-11-10 y Geometría empieza el 2026-11-23
- **THEN** el mundo de Geometría se ve bloqueado con su fecha de inicio

#### Scenario: Catálogo inválido
- **WHEN** `mundos.json` trae dos mundos de la misma materia con fechas que se enciman
- **THEN** el validador lo marca como error y no se publica

#### Scenario: Catálogo ilegible
- **WHEN** el repo de datos no responde al leer `mundos.json`
- **THEN** la vista usa la derivación de la Fase 1 y el resto del dashboard sigue funcionando

### Requirement: Misiones diarias y semanales derivadas
El sistema SHALL mostrar misiones diarias («Completa tus clases de hoy»: las de `disponibleDesde` = hoy, hora de la
Ciudad de México) y semanales («Termina las clases de la semana», «Avanza un paso de tu misión principal», «Mejora un
tema en debilidad») calculadas a partir de las clases y resultados, sin captura manual. SHALL dar solo
reconocimiento (insignias y progreso visible) y SHALL NOT dar XP.

#### Scenario: Día completo
- **WHEN** la alumna envía las 2 clases que abrieron hoy
- **THEN** la misión diaria se ve 2/2 completada y la racha cuenta el día

#### Scenario: Semana completa
- **WHEN** termina las 15 clases de la semana
- **THEN** gana la insignia «🗓️ Semana completa» y su XP total no cambia por la insignia

### Requirement: Árbol de habilidades por materia
Cada materia SHALL tener un árbol cuyos nodos son los temas de sus clases agrupados por mundo. El estado de cada nodo
SHALL salir de la retroalimentación por tema del último intento: aún no visto, en progreso, a reforzar (`debilidad`)
o dominado (`fortaleza` o ≥ 80 % en el tema). Un nodo a reforzar SHALL ofrecer el repaso de ese tema cuando exista.

#### Scenario: Tema débil
- **WHEN** el último intento de «Porcentajes» tiene retroalimentación `debilidad`
- **THEN** el nodo se ve «a reforzar» con el botón «Reforzar»

#### Scenario: Tema aún no visto
- **WHEN** un tema solo aparece en clases que aún no abren
- **THEN** el nodo se ve bloqueado y no muestra calificación

### Requirement: Retroalimentación inmediata y accesible
Al enviar una clase o una misión, la vista SHALL mostrar en el mismo momento la XP ganada, el avance de la barra de
nivel, la subida de nivel y las insignias nuevas. Las respuestas correctas de cualquier pregunta SHALL seguir sin
llegar al navegador: la práctica con revisión inmediata de los pasos de teoría SHALL comprobarse en el servidor
(`POST /practica/comprobar`), que solo devuelve si es correcta y una pista. La vista SHALL respetar
`prefers-reduced-motion`, SHALL tener el sonido apagado por defecto, botones de al menos 44 px, modo claro y oscuro, y
SHALL verse a 360 px sin scroll horizontal. Los mensajes al estudiante SHALL ser en positivo y SHALL NOT decir «en
riesgo» ni «atrasado».

#### Scenario: Sube de nivel al enviar
- **WHEN** un alumno envía una clase que lo lleva de 595 a 610 XP
- **THEN** ve «+N XP» y «¡Subiste a nivel 3!» sin recargar la página

#### Scenario: Práctica de teoría
- **WHEN** la alumna responde una pregunta de práctica del paso de teoría
- **THEN** ve al instante si es correcta y una pista, y la respuesta correcta nunca estuvo en el JSON que recibió

#### Scenario: Movimiento reducido
- **WHEN** el aparato tiene activado reducir movimiento
- **THEN** la subida de nivel se muestra sin animaciones grandes

### Requirement: Nick de Juegos para el ranking
El ranking de Inglés SHALL usar el nick de Juegos de cada persona (spec `juegos`, sin cambios). Un alumno o alumna
activo de Inglés SHALL poder pedir aparecer en el ranking con `PUT /gamificacion/perfil { aparecer: true }`. El
servidor SHALL aceptarlo solo si tiene nick de Juegos y ese nick no contiene correos, teléfonos, ningún nombre de pila
del registro de alumnos y alumnas ni palabras de la lista bloqueada; si no pasa, SHALL responder 400 con el motivo y
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
aprobación o la preferencia de ocultarse. El profe SHALL poder apagar el ranking de un grupo. Secundaria SHALL NOT
tener ranking.

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
- **THEN** el servidor responde 404 `sin_ranking` y su vista muestra «tu mejor semana» en su lugar

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
