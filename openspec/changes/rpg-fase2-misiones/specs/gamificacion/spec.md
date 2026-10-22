## ADDED Requirements

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

### Requirement: XP de la misión principal en el mismo total
`comun/gamificacion.js` SHALL calcular la XP de una misión evaluada como su porcentaje de la rúbrica (0–100) × 3 más
60 si el último paso se entregó a tiempo, y la SHALL sumar al mismo total de XP de las clases para el nivel. Una
misión sin evaluar o con corrección pedida SHALL dar 0 XP. La regla de las clases (Fase 1) no cambia.

#### Scenario: Misión de 85 % a tiempo
- **WHEN** la alumna tiene 300 XP de clases y el profe evalúa su misión con 85 % y el último paso a tiempo
- **THEN** la misión da 315 XP, su total es 615 y su nivel pasa a 3

#### Scenario: Misión tardía
- **WHEN** la misión se evalúa con 60 % y el último paso fue tardío
- **THEN** la misión da 180 XP
