## ADDED Requirements

### Requirement: Basta con palabras de México a la vista
Los ejemplos y las respuestas de los bots de Basta SHALL salir solo de las palabras de México. Las palabras de
España de `soloAceptar` SHALL seguir valiendo como respuesta, pero SHALL NOT mostrarse.

#### Scenario: Escribir una palabra de España
- **WHEN** alguien escribe «gafas» en Cosa con la letra G
- **THEN** cuenta como válida, pero el juego nunca muestra «gafas» como ejemplo ni como respuesta de un bot
