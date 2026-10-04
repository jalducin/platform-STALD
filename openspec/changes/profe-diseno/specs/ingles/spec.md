## ADDED Requirements

### Requirement: Vista del profe ordenada por urgencia
La vista del profe (`ingles.html?modo=profe`) SHALL mostrar primero su avance y lo que está pendiente ahora.
Después SHALL organizar el resto en pestañas: Esta semana, Plan del mes, Mi grupo y Hechas.

#### Scenario: Lo urgente arriba
- **WHEN** el profe tiene una actividad de su ruta atrasada y un examen del grupo por resolver
- **THEN** ambas aparecen en "🔥 Pendiente ahora", con su etiqueta (🎓 Ruta o 👥 Grupo) y su botón para resolver

#### Scenario: Plan del mes compacto
- **WHEN** el profe abre la pestaña Plan del mes
- **THEN** solo la semana actual está abierta, y las demás muestran su título y su avance (x/y)

#### Scenario: Se recuerda la pestaña
- **WHEN** el profe deja abierta la pestaña Mi grupo y vuelve a entrar
- **THEN** la página abre en Mi grupo

#### Scenario: Escritorio en dos columnas
- **WHEN** el profe abre su vista en una pantalla de 960 px o más
- **THEN** ve el contenido a la izquierda y una barra lateral con horas, rutina y próximas entregas

#### Scenario: Celular
- **WHEN** el profe abre su vista en el celular
- **THEN** todo va en una sola columna, sin desplazamiento horizontal de la página
