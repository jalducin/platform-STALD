## ADDED Requirements

### Requirement: Rutas del panel solo para el admin
Toda ruta `/profe/*` (entregas, misiones, métricas, riesgo, nicks, tutor y consentimientos) SHALL responder solo al
admin. Un alumno o alumna SHALL recibir 403, un invitado de Juegos 403 y una petición sin sesión 401. Las respuestas
del panel SHALL mostrar nombres de pila y SHALL NOT incluir correos.

#### Scenario: Alumna intenta abrir métricas
- **WHEN** la alumna de Secundaria pide `GET /profe/metricas`
- **THEN** el servidor responde 403

#### Scenario: Alumno intenta prender el tutor
- **WHEN** un alumno de Inglés pide `POST /profe/tutor`
- **THEN** el servidor responde 403

#### Scenario: Sin sesión
- **WHEN** se pide `GET /profe/riesgo` sin sesión
- **THEN** el servidor responde 401

### Requirement: Crear y publicar misiones desde la página
El profe SHALL poder crear una misión principal desde un formulario (consigna, pasos con fechas, rúbrica de 4
criterios, tips y destinatarios), guardarla como borrador en `borradores/misiones/<id>.json` de `stald_docs` y
publicarla. Al publicar, el servidor SHALL validarla con las mismas reglas del validador `--misiones` y, solo si da 0
errores, SHALL escribirla en `contenido/<ámbito>/misiones/<id>.json` del repo privado de datos. Hasta la Fase 4 las
misiones SHALL crearse como JSON con la skill.

#### Scenario: Publicación válida
- **WHEN** el profe publica una misión completa
- **THEN** queda en el repo de datos, la ve su destinatario en menos de un minuto y el borrador se marca publicado

#### Scenario: Publicación con errores
- **WHEN** la rúbrica no suma 100
- **THEN** el servidor responde 422 con la lista de errores y no escribe nada en el repo

#### Scenario: Repo de datos no disponible
- **WHEN** falla la escritura al repo de datos
- **THEN** el servidor responde 503 y el borrador se conserva sin cambios

### Requirement: Bandeja de entregas y evaluación
El panel SHALL mostrar las entregas pendientes de evaluar ordenadas por antigüedad, con su misión, paso, si fue tardía
y el contenido entregado. El profe SHALL poder evaluar con la rúbrica, comentar, pedir corrección o borrar el
contenido de una entrega, y cada acción SHALL quedar registrada con fecha.

#### Scenario: Entrega nueva
- **WHEN** la alumna entrega el último paso de su misión
- **THEN** aparece en la bandeja del profe con la etiqueta «lista para evaluar», en orden de antigüedad

#### Scenario: Evaluada
- **WHEN** el profe guarda la evaluación
- **THEN** sale de la bandeja y la XP de la alumna se actualiza en su siguiente carga

### Requirement: Métricas de aprendizaje
`GET /profe/metricas` SHALL devolver, por persona, materia, tema y grupo: porcentaje de clases a tiempo, promedio,
temas en debilidad, XP de la semana, misiones entregadas y evaluadas, y uso del tutor (mensajes y conversaciones
marcadas). SHALL calcularse de los resultados existentes y responder en menos de 2 s con caché.

#### Scenario: Métricas por materia
- **WHEN** el profe abre las métricas de Secundaria
- **THEN** ve por materia el promedio, el porcentaje a tiempo y los temas en debilidad de la alumna

#### Scenario: Falla de Postgres
- **WHEN** Postgres no responde
- **THEN** el servidor responde 503 y el panel lo dice en lugar de mostrar datos viejos

### Requirement: Alumnos y alumnas en riesgo de rezago
`GET /profe/riesgo` SHALL listar a quien cumpla alguna de estas reglas, calculadas solo con resultados y entregas: R1
≥ 2 clases vencidas sin intento en 7 días; R2 < 60 % en las últimas 3 clases de una materia; R3 el mismo tema en
`debilidad` en 2 clases o intentos seguidos; R4 4 días seguidos con clase sin ningún intento ni entrega; R5 un paso de
misión vencido hace más de 3 días. Una regla SHALL marcarse «atención» y dos o más «riesgo». Cada fila SHALL decir qué
reglas se cumplieron y con qué datos. Esta lista SHALL NOT mostrarse al estudiante.

#### Scenario: Dos reglas
- **WHEN** un alumno tiene 2 clases vencidas sin intento y 55 % en sus últimas 3 de Inglés
- **THEN** aparece en «riesgo» con R1 y R2 y las clases que lo causan

#### Scenario: Sin reglas
- **WHEN** una alumna va al día con promedio de 90 %
- **THEN** no aparece en la lista

### Requirement: Moderación de nicks, tutor y consentimientos
El panel SHALL permitir aprobar o rechazar con un motivo los nicks de Juegos de quien pidió aparecer en el ranking,
apagar el ranking de un grupo, leer la bitácora del tutor por persona y fecha, ver primero las conversaciones marcadas
(también las que llegaron por correo), activar o apagar el tutor, borrar la bitácora de una persona y registrar o
retirar el consentimiento de una persona por tipo (`tutor`, o `multimedia` para la fase posterior de imagen y audio;
solo slug, tipo y fecha). El consentimiento SHALL recabarse fuera de la plataforma con el formato simple que prepara la
Fase 2; la plataforma SHALL NOT guardar el documento firmado.

#### Scenario: Aprobar nick
- **WHEN** el profe aprueba el nick de Juegos «Estrella Azul» de una alumna que pidió aparecer
- **THEN** la caché del ranking se invalida y el nick aparece en el ranking del grupo

#### Scenario: Retirar consentimiento
- **WHEN** el profe retira el consentimiento `tutor` de un alumno
- **THEN** su siguiente mensaje al tutor recibe 403 `sin_consentimiento`
