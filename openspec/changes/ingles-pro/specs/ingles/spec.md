## ADDED Requirements

### Requirement: Vista de alumno o alumna orientada a su avance
La vista de alumno o alumna SHALL mostrar al entrar:
- su avance de la semana;
- su racha;
- su próxima clase, con el enlace de Meet;
- lo que tiene que hacer hoy.

#### Scenario: Entrar el día de clase
- **WHEN** Luz entra el sábado antes de su clase de "Sábado A1"
- **THEN** ve la cuenta regresiva y el botón para unirse al Meet de su grupo

#### Scenario: Racha
- **WHEN** Luz entregó actividades tres días seguidos
- **THEN** ve «🔥 3»

### Requirement: Navegación con íconos
Inglés SHALL tener una navegación por secciones con emoji y nombre. En celular SHALL usar una barra inferior fija.
Cada sección SHALL tener su dirección propia, para que el botón Atrás funcione.

#### Scenario: Cambiar de sección en el celular
- **WHEN** Luz toca «⭐ Resultados» en la barra inferior y luego presiona Atrás
- **THEN** ve sus resultados y después regresa a «🏠 Inicio»

### Requirement: Tablero del profe por grupo
La vista del profe SHALL mostrar, para el grupo elegido:
- indicadores;
- un mapa de calor de integrantes contra actividades;
- el detalle de cada alumno o alumna, con sus acciones.

#### Scenario: Revisar un grupo
- **WHEN** el profe elige "Domingo B1"
- **THEN** ve quién va atrasado en cada actividad
- **AND** puede abrir el detalle de una alumna para darle prórroga

#### Scenario: Dar y quitar una prórroga desde el cajón
- **WHEN** el profe elige una fecha y toca «Dar prórroga» para Marisol en una actividad
- **THEN** Marisol ve esa actividad con su nueva fecha límite y los demás la siguen viendo con la original
- **AND** con «Quitar prórroga» vuelve la fecha original

#### Scenario: El resumen es solo del profe
- **WHEN** una alumna pide `GET /ingles/resumen` o intenta dar una prórroga
- **THEN** el servidor responde 403

### Requirement: Diseño profesional y accesible
Inglés SHALL usar el mismo sistema de diseño que Juegos, en modo claro y oscuro, con accesibilidad AA y sin
desplazamiento horizontal en celular.

#### Scenario: Celular
- **WHEN** alguien abre Inglés en un celular de 390 px
- **THEN** todo cabe sin desplazarse de lado
- **AND** los botones tienen al menos 44 px de alto
