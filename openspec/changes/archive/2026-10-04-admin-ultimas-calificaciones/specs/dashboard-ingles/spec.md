## ADDED Requirements

### Requirement: Últimas 5 calificaciones por alumno o alumna (admin)
La vista de admin de `ingles.html` SHALL mostrar una tarjeta "📊 Últimas calificaciones", con una fila
por alumno o alumna y hasta 5 calificaciones de la más reciente a la más antigua. Toma las actividades y
exámenes en línea (mejor calificación y fecha del último envío) y las filas de Notion con "Calificación"
(fecha de edición). El mismo detalle SHALL aparecer en el bloque de cada alumno o alumna.

#### Scenario: Mezcla de fuentes en orden
- **WHEN** Marisol tiene el diagnóstico (70 %, 27 sep), una actividad (92 %, 29 sep) y una clase de
  Notion calificada con 9 (26 sep)
- **THEN** su fila muestra 92%, 70% y 9, en ese orden

#### Scenario: Más de 5
- **WHEN** un alumno o alumna tiene 7 calificaciones
- **THEN** se muestran solo las 5 más recientes

#### Scenario: Sin calificaciones
- **WHEN** un alumno o alumna aún no tiene calificaciones
- **THEN** su fila muestra "—"

#### Scenario: Vista de alumno o alumna
- **WHEN** entra un alumno o alumna
- **THEN** no ve la tarjeta de últimas calificaciones
