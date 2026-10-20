## ADDED Requirements

### Requirement: Validar la ruta del profe a su ritmo
Con `--profe`, el validador (`server/validar_semana.ts <dir-datos> <lunes> --profe`) SHALL aceptar un
`disponibleDesde` anterior al lunes de la semana y SHALL no exigir que el examen quede bloqueado hasta su día; SHALL
seguir marcando error si `disponibleDesde` es posterior a `fechaLimite`. Sin `--profe` (semanas del grupo), las reglas
de apertura SHALL ser las de siempre.

#### Scenario: Ruta del profe abierta
- **WHEN** se valida con `--profe` una semana cuyos elementos (exámenes incluidos) tienen `disponibleDesde` en un lunes anterior
- **THEN** no hay errores de apertura y el código de salida es 0

#### Scenario: Apertura después de la fecha
- **WHEN** con `--profe` un elemento tiene `disponibleDesde` posterior a su `fechaLimite`
- **THEN** hay un error «disponibleDesde … posterior a fechaLimite …»

#### Scenario: Semana del grupo sin cambios
- **WHEN** sin `--profe` una actividad abre antes del lunes de su semana o el examen abre antes de su día
- **THEN** hay un error «disponibleDesde … fuera de <lunes>…<fecha>» y otro «el examen debe quedar bloqueado hasta su día»
