## ADDED Requirements

### Requirement: Segundo intento como corrección en actividades
En los elementos que no son examen (actividad, refuerzo y reto del Meet), el sistema SHALL armar el
intento siguiente con los mismos ejercicios del último intento guardado. Las respuestas correctas SHALL
quedar fijas: el servidor las conserva aunque el cliente mande otras. Solo los ejercicios fallados SHALL
contestarse de nuevo. Esta regla reemplaza, para esos elementos, la de "selección distinta en cada
intento". Entre alumnos y alumnas la selección sigue siendo distinta.

#### Scenario: Corrección tras un primer intento con errores
- **WHEN** un alumno o alumna resolvió el intento 1 con 9 de 12 bien y abre el intento 2
- **THEN** recibe los mismos 12 ejercicios
- **AND** `correccion.fijas` trae sus 9 respuestas correctas
- **AND** `correccion.anteriores` trae el texto de sus 3 respuestas equivocadas
- **AND** no recibe las respuestas correctas de los 3 que falló

#### Scenario: Las fijas no se pueden alterar
- **WHEN** en el intento 2 el cliente manda respuestas incorrectas para ejercicios que estaban bien
- **THEN** se califican con las respuestas del intento 1
- **AND** la calificación del intento 2 no es menor que la del intento 1

#### Scenario: Corrige todo
- **WHEN** en el intento 2 contesta bien los 3 que había fallado
- **THEN** obtiene 100 % y ese es su mejor intento

#### Scenario: Nada que corregir
- **WHEN** el último intento de una actividad tiene 100 %
- **THEN** el estado es `completo` y no se ofrece otro intento

#### Scenario: El examen no cambia
- **WHEN** un examen tiene 1 intento
- **THEN** no hay corrección y un 2.º envío responde 409 `sin_intentos`

#### Scenario: Vista previa de la corrección
- **WHEN** el admin abre `?alumno=Marisol&intento=2`
- **THEN** ve la corrección de Marisol sin guardar nada
