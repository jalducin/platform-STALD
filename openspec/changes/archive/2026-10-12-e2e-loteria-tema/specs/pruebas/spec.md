## ADDED Requirements

### Requirement: E2E con selector de tema
Las pruebas E2E que abran 🧩 Completa y responde (`en-frases`) o 🔀 Ordena la oración (`en-ordena`) SHALL tocar
el tema «Todo» (`[data-tema="todo"]`) antes de esperar las preguntas, porque esos juegos piden el tema antes de
jugar (cambio `juegos-ingles-gramatica`).

#### Scenario: Lotería en sala abre Completa y responde
- **WHEN** `e2e-loteria-sala` abre `en-frases` en solitario
- **THEN** elige «Todo», aparecen las opciones y la prueba sigue hasta guardar el resultado y jugar Lotería en partida
