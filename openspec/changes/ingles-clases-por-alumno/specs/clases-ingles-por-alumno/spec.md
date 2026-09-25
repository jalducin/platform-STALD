## ADDED Requirements

### Requirement: Una fila por clase y alumno
La base "📖 Clases Inglés" SHALL tener una fila por cada combinación (clase, alumno) para los alumnos
Fernando, Marisol, Angel, Laura y Jesus. Las filas de un mismo curso SHALL compartir `Name`, `Módulo`,
`Tipo`, `Dificultad`, `Fecha Entrega ` y el contenido de la página. El campo `Nombre` SHALL identificar al alumno.

#### Scenario: Conteo por alumno
- **WHEN** se cuentan las filas agrupadas por `Nombre`
- **THEN** cada uno de los 5 alumnos tiene 51 filas y el total es 255

#### Scenario: Mismo catálogo para todos
- **WHEN** se compara el conjunto de `Name` de cada alumno contra el de Fernando
- **THEN** los conjuntos son idénticos

### Requirement: Progreso inicial en blanco
Toda fila SHALL empezar sin progreso: `Completado` = No, `Calificación` vacía y `Observaciones` vacías.
Esto aplica también a las filas de Fernando, cuyos valores venían clonados y no reflejan su avance real.

#### Scenario: Sin calificaciones heredadas
- **WHEN** se consultan filas con `Calificación` u `Observaciones` no vacías
- **THEN** la consulta devuelve 0 filas

### Requirement: Usuario asignado manualmente
Las filas nuevas SHALL crearse con `Usuario` vacío. El administrador asigna el guest de Notion de cada
alumno. Las filas de Fernando SHALL conservar su `Usuario` actual.

#### Scenario: Filas nuevas sin usuario
- **WHEN** se consultan filas de Marisol, Angel, Laura o Jesus recién creadas
- **THEN** `Usuario` está vacío

### Requirement: Vista por alumno
La página "Vistas Alumnos" SHALL contener una vista enlazada a "📖 Clases Inglés" por cada alumno,
filtrada por `Nombre`, con pendientes primero.

#### Scenario: Vista filtrada
- **WHEN** se abre la vista "Marisol" en "Vistas Alumnos"
- **THEN** solo aparecen las 51 filas con `Nombre` = Marisol

### Requirement: Vista personal "Mis clases"
La base "📖 Clases Inglés" SHALL tener una vista "Mis clases" filtrada por `Usuario` = usuario actual
("me"), disponible como pestaña de la base y como vista enlazada en "Vistas Alumnos", con pendientes
primero. La vista SHALL documentarse como filtro de conveniencia, no como control de acceso.

#### Scenario: Alumno abre "Mis clases"
- **WHEN** un alumno con `Usuario` asignado abre la vista "Mis clases"
- **THEN** ve solo sus 51 filas

#### Scenario: Admin abre "Mis clases"
- **WHEN** el admin, que no está asignado en `Usuario`, abre la vista "Mis clases"
- **THEN** la vista aparece vacía (el admin usa las vistas por `Nombre`)
