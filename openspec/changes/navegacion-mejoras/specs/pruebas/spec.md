## ADDED Requirements

### Requirement: E2E con fixture propio de la ruta del profe
La E2E `ingles-diseno-profe` SHALL revisar «🌍 Mundos» con datos coherentes: con el plan compartido de prueba espera
los mundos que calcula `Gamificacion.mapaRuta` y, para revisar los 9 mundos, usa su propio plan de ejemplo
(`tests/fixtures/profe-plan-9-mundos.json`) servido solo en su navegador. No cambia datos reales ni el fixture
compartido.

#### Scenario: Plan con clases en los 9 mundos
- **WHEN** la prueba abre «🌍 Mundos» con su plan de ejemplo
- **THEN** ve los 9 mundos de la ruta, con 44 px o más por botón y sin scroll horizontal

#### Scenario: Plan compartido
- **WHEN** la prueba abre «🌍 Mundos» con el plan de `tests/fixtures/datos`
- **THEN** ve exactamente los mundos con clases según `mapaRuta`

### Requirement: Prueba de Dibuja sin falsos positivos
La prueba unitaria «dibuja: la palabra solo la recibe quien dibuja» SHALL buscar la palabra y su traducción entre los
valores de texto de la respuesta y la llave `palabra` entre las llaves, de modo que una palabra del vocabulario que
también es llave (p. ej. «reloj») no la haga fallar, sin dejar de detectar una fuga.

#### Scenario: Palabra que coincide con una llave
- **WHEN** la palabra del turno es «reloj» y la respuesta trae la llave `reloj`
- **THEN** la prueba pasa si «reloj» no aparece como valor

#### Scenario: Fuga real
- **WHEN** la respuesta de quien no dibuja trae la palabra como valor
- **THEN** la prueba falla
