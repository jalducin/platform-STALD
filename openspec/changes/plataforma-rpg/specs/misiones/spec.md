## ADDED Requirements

### Requirement: Definición de la misión principal en JSON
Una misión principal SHALL definirse en `contenido/<ámbito>/misiones/<id>.json` del repo privado de datos, con `id`
(`mis-<materia>-<mundo>`), `titulo`, `materia`, `mundo`, `consigna`, `pasos` (3 a 5, cada uno con `id`, `titulo`,
`instrucciones`, `fechaLimite` y `tipoEntrega`: `texto`, `imagen` o `audio`), `rubrica` (exactamente 4 criterios con
niveles y puntos que suman 100), `tips` con fuentes verificadas y `alumnos` o `grupos` opcionales para exclusividad.
El validador SHALL revisarla con la forma nueva `validar_semana.ts <datos> --misiones <ámbito>` (sin `<lunes>`; las
formas actuales con `<lunes>` no cambian) y SHALL marcar error si faltan campos, si la rúbrica no suma 100, si las
fechas de los pasos no van en orden o quedan fuera del mundo, o si la consigna no incluye el aviso de privacidad del
entregable.

#### Scenario: Misión válida
- **WHEN** el agente valida «La tiendita del salón» con 4 pasos y rúbrica de 4 × 25
- **THEN** el validador da 0 errores y la misión se puede subir

#### Scenario: Rúbrica incompleta
- **WHEN** la rúbrica suma 90 puntos
- **THEN** el validador marca error y la misión no se publica

### Requirement: Malla piloto de misiones principales de 1.º de secundaria
El contenido piloto SHALL incluir una misión principal por materia alineada a la secuencia de la skill
`clases-secundaria`: Matemáticas «La tiendita del salón» (Aritmética), Ciencias «Diario de campo» (Biología), Español
«Reportaje de mi comunidad», Ciencias Sociales «Campaña por un derecho» (Cívica y Ética), Tecnología e IA «Kit de
seguridad digital» (Bases) e Inglés «My Hero Card» (*to be*, posesivos y adjetivos con un personaje inventado), esta
última publicada tanto en `contenido/secundaria/` como en `contenido/ingles/` para el grupo. La Fase 2 SHALL publicar
al menos 3 de Secundaria y «My Hero Card» para el grupo de Inglés; las demás SHALL quedar listas para su mundo.

#### Scenario: Misión de Matemáticas en su mundo
- **WHEN** la alumna abre el mundo «Valle de los Números»
- **THEN** ve «La tiendita del salón» como misión principal con sus pasos y fechas

#### Scenario: Misión de Inglés sin datos personales
- **WHEN** un alumno abre «My Hero Card»
- **THEN** la consigna le pide describir un personaje inventado, no a sí mismo

### Requirement: Entrega de pasos de la misión
`POST /misiones/<id>/entrega` SHALL guardar la entrega de un paso en `entregas/<misión>/<slug>.json` de `stald_docs`,
solo para la persona activa de la sesión y solo si la misión le es visible. Un recurso que la persona no puede ver
SHALL responder 404 (no revela que existe). El texto SHALL tener a lo sumo 4 000 caracteres. Las imágenes SHALL llegar
reducidas a ≤ 1280 px y ≤ 300 KB, máximo 3 por paso, solo JPEG o PNG; el servidor SHALL quitar los segmentos de
metadatos (EXIF, incluido GPS) aunque el cliente ya los haya quitado. El audio SHALL ser WebM u Ogg de a lo sumo
1.5 MB (≈ 90 s). El tipo SHALL coincidir con el `tipoEntrega` del paso. Un paso SHALL poder reenviarse mientras no
esté evaluado. Una entrega tras la `fechaLimite` del paso SHALL aceptarse y marcarse tardía. Las imágenes y audios
SHALL servirse solo por una ruta con sesión, a la persona dueña y al admin.

#### Scenario: Entrega válida
- **WHEN** la alumna envía el paso 2 con texto y una imagen de 250 KB
- **THEN** el servidor responde 200, guarda la imagen sin metadatos, el paso se ve «entregado» y el profe lo ve en su
  bandeja

#### Scenario: Archivo muy grande
- **WHEN** llega una imagen de 2 MB o un audio de 3 MB
- **THEN** el servidor responde 413 `archivo_grande` y no guarda nada

#### Scenario: Entrega fuera de límites
- **WHEN** llegan 4 imágenes, más de 4 000 caracteres o un tipo distinto al `tipoEntrega` del paso
- **THEN** el servidor responde 400 `entrega_invalida` con el motivo y no guarda nada

#### Scenario: Paso ya evaluado
- **WHEN** se reenvía un paso que el profe ya evaluó sin pedir corrección
- **THEN** el servidor responde 409 `ya_evaluado`

#### Scenario: Misión ajena
- **WHEN** un alumno de Inglés envía a una misión exclusiva de Secundaria
- **THEN** el servidor responde 404

#### Scenario: Persona de baja o invitado
- **WHEN** un alumno dado de baja de Inglés o un invitado de Juegos envía una entrega
- **THEN** el servidor responde 403; quien está de baja puede seguir viendo sus entregas anteriores

#### Scenario: Sin sesión
- **WHEN** se envía sin sesión
- **THEN** el servidor responde 401

#### Scenario: Error al guardar
- **WHEN** Postgres falla al guardar la entrega
- **THEN** el servidor responde 503, el cliente conserva el borrador local y avisa «No se pudo enviar; inténtalo de
  nuevo»

### Requirement: Consentimiento para entregas con imagen o audio
Una entrega con imagen o audio SHALL requerir el consentimiento de madre, padre o tutor registrado por el profe
(slug, tipo `multimedia` y fecha) y la casilla «Acepto» de la persona en el momento de enviar. Sin ese consentimiento,
los pasos de imagen o audio SHALL ofrecer la entrega en texto.

#### Scenario: Sin consentimiento multimedia
- **WHEN** un alumno sin consentimiento `multimedia` intenta subir una imagen
- **THEN** el servidor responde 403 `sin_consentimiento` y la vista le ofrece entregar el paso en texto

### Requirement: Evaluación con rúbrica y XP de la misión
El profe SHALL evaluar cada misión entregada con la rúbrica (un nivel por criterio) y un comentario opcional, o SHALL
pedir corrección con un motivo. La XP de la misión SHALL ser el porcentaje de la rúbrica × 3 más 60 si el último paso
se entregó a tiempo, y SHALL sumarse al total de la persona. Pedir corrección SHALL reabrir los pasos indicados; si el
motivo es de privacidad, el contenido multimedia del paso SHALL borrarse en ese momento.

#### Scenario: Evaluación completa
- **WHEN** el profe califica 25 + 20 + 25 + 15 y el último paso fue a tiempo
- **THEN** la misión vale 85 % y da 315 XP, y la alumna ve la rúbrica con el comentario

#### Scenario: Pedir corrección por privacidad
- **WHEN** una imagen muestra un rostro y el profe pide corrección con el motivo «privacidad»
- **THEN** el paso se reabre, la imagen se borra del almacenamiento y la alumna ve el motivo en positivo

### Requirement: Privacidad y retención de entregables
Cada consigna SHALL decir que el entregable no lleva rostros, nombres reales, direcciones, escuela ni uniforme. El
formulario de entrega SHALL NOT tener campo de nombre. El contenido de las entregas (texto, imágenes y audio) SHALL
borrarse el 31 de agosto de cada año (fin del ciclo escolar el 31 de julio más 30 días) con un script versionado,
conservando solo la evaluación (puntos y fecha). El profe SHALL poder borrar a petición el contenido de todas las
entregas de una persona, con el mismo efecto.

#### Scenario: Recordatorio al subir imagen
- **WHEN** un alumno elige una imagen para entregar
- **THEN** ve el recordatorio «Sin rostros, nombres ni direcciones» antes de enviar

#### Scenario: Borrado a petición
- **WHEN** el profe borra las entregas de una alumna
- **THEN** el texto, las imágenes y los audios de `entregas/*/<slug>.json` desaparecen, queda solo la evaluación y
  su XP no cambia
