## ADDED Requirements

### Requirement: Grupos de clase
El sistema SHALL permitir al admin crear y editar grupos, con nombre, nivel, horario, enlace de Meet y color. Cada
alumno o alumna SHALL pertenecer a un solo grupo vigente.

#### Scenario: Crear un grupo
- **WHEN** el profe crea el grupo "Sábado A1" con su horario y su Meet
- **THEN** el grupo aparece en el selector y en el alta de alumnos y alumnas

#### Scenario: Mover de grupo
- **WHEN** el profe mueve a Luz de "Sábado A1" a "Domingo B1"
- **THEN** desde ese día Luz ve el calendario de "Domingo B1"
- **AND** sus resultados anteriores se conservan

### Requirement: Calendario por grupo
Cada semana de contenido SHALL poder asignarse a uno o varios grupos. Una semana sin asignación SHALL aplicar a
todos.

#### Scenario: Semana solo para un grupo
- **WHEN** la semana del 12 de octubre se asigna solo a "Domingo B1"
- **THEN** solo los alumnos y alumnas de "Domingo B1" ven sus actividades

### Requirement: Datos de Inglés en Postgres
Los alumnos y alumnas, sus inscripciones, sus resultados y su avance SHALL guardarse en Postgres (tablas `stald_*`
del esquema `public`, con RLS y sin políticas públicas; ver `design.md`, «Revisión antes de implementar») y SHALL ser
accesibles solo desde el servidor. Una lectura fallida SHALL recurrir al respaldo en GitHub durante el
periodo de transición.

#### Scenario: Migración sin pérdida
- **WHEN** se migran los datos actuales
- **THEN** los conteos de alumnos, resultados y avance coinciden con los JSON
- **AND** cada calificación se ve igual que antes

#### Scenario: Navegador sin acceso directo
- **WHEN** alguien intenta leer las tablas `stald_*` con la llave pública
- **THEN** la base no devuelve datos (RLS sin políticas públicas)
