## MODIFIED Requirements

### Requirement: Secundaria en su propia página
La tarjeta de Secundaria del portal SHALL seguir llevando a `secundaria.html`, que SHALL abrir las clases nuevas de
Secundaria (`ingles.html?modo=secundaria`) en lugar del tablero de Notion, con un enlace «← Inicio» al portal.

#### Scenario: Liga de Secundaria
- **WHEN** se abre `secundaria.html` con sesión
- **THEN** se ven las clases de Secundaria («📚 Mis clases»), con «← Inicio», y no el tablero de Notion
