## ADDED Requirements

### Requirement: Validar una semana antes de publicarla
El sistema SHALL ofrecer un validador (`server/validar_semana.ts <dir-datos> <lunes>`) que revise la
semana completa. Reporta **errores** (bloquean) y **avisos**, y termina con código 1 si hay errores.

#### Scenario: Semana válida
- **WHEN** se valida la semana 1 (`2026-09-28`) del repo de datos
- **THEN** no hay errores y el código de salida es 0

#### Scenario: El id no es lunes
- **WHEN** se valida una semana cuyo id es un martes
- **THEN** hay un error "no es lunes"

#### Scenario: Examen que se abre antes de su día
- **WHEN** el examen del viernes tiene `disponibleDesde` en un día anterior
- **THEN** hay un error que indica que el examen debe quedar bloqueado hasta su día

#### Scenario: Elemento sin archivo o con fecha distinta
- **WHEN** la semana referencia un id sin archivo, o su `fecha` no coincide con la `fechaLimite` del archivo
- **THEN** hay un error por cada caso

#### Scenario: Refuerzo incoherente
- **WHEN** el refuerzo referencia en `bancoDe` un elemento inexistente, o tiene un tema sin ejercicios
- **THEN** hay un error

#### Scenario: Correo en el contenido
- **WHEN** algún texto del contenido contiene un correo electrónico
- **THEN** hay un error de privacidad

#### Scenario: Banco corto
- **WHEN** una actividad con 2 intentos tiene menos de `2 × preguntasPorIntento` ejercicios
- **THEN** hay un aviso, no un error

### Requirement: Flujo "nueva semana"
El proyecto SHALL tener la skill `nueva-semana-ingles`. Prepara la semana siguiente en la copia local del
repo privado de datos, en este orden:
1. Temas.
2. Avance del grupo.
3. Generación.
4. Validación sin errores.
5. Resumen y aprobación del usuario.
6. Subida.

Nunca SHALL subir contenido sin una validación sin errores y sin la aprobación del usuario.

#### Scenario: Preparación en fin de semana
- **WHEN** el usuario pide la semana siguiente con sus temas
- **THEN** el agente genera `semanas/<lunes>.json` y sus 5 elementos, valida y muestra el resumen
- **AND** solo sube tras la aprobación del usuario
