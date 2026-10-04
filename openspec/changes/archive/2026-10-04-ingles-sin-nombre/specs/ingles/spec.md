## ADDED Requirements

### Requirement: Sin filas huérfanas en Inglés
El sistema SHALL ignorar las filas de Notion de Inglés que no tienen un alumno o alumna asignado.

#### Scenario: Fila vacía en Notion
- **WHEN** la base de Notion tiene una fila sin nombre de alumno
- **THEN** el admin no ve el grupo "Sin nombre asignado"
- **AND** esa fila no cuenta en ningún tablero
