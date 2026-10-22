## ADDED Requirements

### Requirement: Entregas en la barra inferior del profe
En celular (menos de 720 px) la barra inferior del admin de Inglés SHALL incluir «📥 Entregas» junto a Resumen,
Alumnos, Semana y Resultados, más «☰ Más» (6 botones), sin scroll horizontal a 360 px. Cuando la bandeja de entregas
ya cargó, el botón SHALL mostrar un contador con las entregas listas para evaluar (sin peticiones nuevas: usa la bandeja
que pide el panel). En PC el menú lateral conserva su orden. Matriz de acceso: sin cambios (solo el admin ve la
bandeja).

#### Scenario: Entregas en un toque
- **WHEN** el profe abre su panel en el celular y toca «📥 Entregas» en la barra inferior
- **THEN** ve la bandeja sin pasar por «☰ Más»

#### Scenario: Contador de pendientes
- **WHEN** la bandeja trae 2 entregas listas para evaluar
- **THEN** el botón «📥 Entregas» muestra «2» y lo anuncia como «2 por revisar»

#### Scenario: Bandeja con error
- **WHEN** la bandeja no se pudo cargar
- **THEN** el botón aparece sin contador
