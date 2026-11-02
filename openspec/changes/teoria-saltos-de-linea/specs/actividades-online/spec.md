## ADDED Requirements

### Requirement: Saltos de línea en la teoría
El `texto` de un bloque de `teoria` SHALL mostrarse respetando sus saltos de línea (`\n`), líneas en blanco y sangría
(espacios al inicio de la línea), en todas las vistas que pintan teoría (clases de Inglés, clases y misiones de
Secundaria, ruta del profe y la diapositiva `teoria` del Meet). Los `puntos` y los `tips` SHALL respetar sus saltos
igual. Una línea larga SHALL partirse dentro de su bloque sin provocar scroll horizontal de la página a 360 px. Un
`texto` de una sola línea SHALL verse igual que antes.

#### Scenario: Código de ejemplo
- **WHEN** un bloque trae `texto` = `"def saluda(nombre):\n    print(nombre)"`
- **THEN** se ven dos renglones y `print` aparece con sangría respecto a `def`

#### Scenario: Texto de una sola línea
- **WHEN** un bloque trae `texto` sin `\n`
- **THEN** se ve en un renglón (si cabe), igual que antes

#### Scenario: Línea larga en celular
- **WHEN** el `texto` trae una línea de código más ancha que la pantalla y la clase se abre a 360 px
- **THEN** la línea se parte dentro del bloque y la página no tiene scroll horizontal

#### Scenario: Enlace de apoyo con título largo en celular
- **WHEN** una clase de Secundaria trae una lectura o documentación con un título más ancho que la pantalla y se
  abre a 360 px
- **THEN** el botón del enlace parte el título en renglones y la página no tiene scroll horizontal

#### Scenario: Texto con HTML
- **WHEN** el `texto` multilínea contiene `<b>` o `<script>`
- **THEN** se muestra como texto literal, sin interpretarse
