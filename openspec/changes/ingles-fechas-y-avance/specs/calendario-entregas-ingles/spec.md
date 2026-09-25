## ADDED Requirements

### Requirement: Una entrega diaria ordenada por dificultad
Cada actividad de "📖 Clases Inglés" SHALL tener `Fecha Entrega ` con una actividad por día a partir del
2026-09-26, fines de semana incluidos. El orden SHALL ser por `Dificultad` (A1, A2, B1), luego por `Módulo`
(orden de las opciones del select) y luego por el número de lección en el título. Los 5 alumnos SHALL
tener el mismo calendario.

#### Scenario: Primera y última entrega
- **WHEN** se ordenan por fecha las actividades de un alumno
- **THEN** la primera es "📋 A1 Test #1" el 2026-09-26 y la última es "Práctica 5 — Places" el 2026-11-14

#### Scenario: Una por día
- **WHEN** se agrupan por fecha las actividades de un alumno
- **THEN** hay 50 fechas distintas con exactamente una actividad cada una

#### Scenario: Mismo calendario
- **WHEN** se compara (título, fecha) entre dos alumnos
- **THEN** los conjuntos son idénticos

### Requirement: Filas que no son actividades
"📋 REGLA — Dónde anotar cada tipo de clase" SHALL quedar sin `Fecha Entrega `.

#### Scenario: Regla sin fecha
- **WHEN** se consulta la fila "📋 REGLA" de cualquier alumno
- **THEN** `Fecha Entrega ` está vacía
