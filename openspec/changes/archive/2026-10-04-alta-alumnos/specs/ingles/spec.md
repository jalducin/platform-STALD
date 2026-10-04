## ADDED Requirements

### Requirement: Alta de alumnos y alumnas desde la página
El admin SHALL poder dar de alta a un alumno o alumna con nombre y correo desde `ingles.html`. Desde ese
momento, ese correo SHALL entrar a Inglés (actividades de la semana), al portal y a Juegos como alumno o
alumna. El servidor SHALL rechazar correos inválidos o ya usados y nombres que ya tienen correo. Solo el
admin SHALL poder listar, dar de alta y quitar.

#### Scenario: Dar de alta
- **WHEN** la profe escribe "Luz María" y luz@example.com y da "Dar de alta"
- **THEN** Luz entra con su correo a Inglés y ve las actividades de la semana, y aparece en la vista de admin

#### Scenario: Correo repetido
- **WHEN** se da de alta un correo que ya tiene acceso
- **THEN** responde 409 `correo_en_uso` y la página lo explica

#### Scenario: Quitar
- **WHEN** la profe quita a alguien dado de alta en la página
- **THEN** ese correo deja de entrar; sus resultados se conservan

#### Scenario: Sin permiso
- **WHEN** un alumno o alumna llama a la ruta de alta
- **THEN** responde 403
