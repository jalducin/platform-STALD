## ADDED Requirements

### Requirement: Juegos de preguntas fusionados
El menú SHALL mostrar un solo juego por tema:
- 🧩 Completa y responde: frases para completar y preguntas en inglés;
- ✍️ Ortografía: letras, acentos, sinónimos y antónimos;
- 🧮 Cálculo y secuencias.

Los juegos absorbidos SHALL NOT poder crearse en partidas nuevas, y sus puntos anteriores SHALL conservarse.

#### Scenario: Completa y responde
- **WHEN** alguien juega Completa y responde
- **THEN** le salen tanto frases para completar como preguntas para responder en inglés

#### Scenario: Partida con un juego absorbido
- **WHEN** alguien intenta crear una partida de `es-acentos`
- **THEN** el servidor responde 400 `juego_no_permitido`

#### Scenario: Puntos anteriores
- **WHEN** alguien ya tenía puntos en Secuencias
- **THEN** esos puntos siguen contando en el ranking

### Requirement: Maratón con IA y tecnología
El Maratón de cultura SHALL incluir las categorías Inteligencia artificial y Tecnología, con preguntas en los tres
niveles.

#### Scenario: Elegir la categoría de IA
- **WHEN** alguien elige 🤖 Inteligencia artificial
- **THEN** recibe preguntas de IA que van de nivel fácil a difícil, cada una con su dato

## MODIFIED Requirements

### Requirement: Responde en inglés
Las preguntas de "Responde en inglés" SHALL mostrar una pregunta en inglés, con su traducción como apoyo, y 4
respuestas en inglés, de las que una sola es la respuesta natural. Desde la fusión SHALL jugarse dentro de
🧩 Completa y responde (`en-frases`), en solitario y en partida; el juego suelto `en-preguntas` SHALL NOT aparecer
en el menú ni crearse en partidas nuevas.

#### Scenario: Pregunta de edad
- **WHEN** en Completa y responde sale "How old are you?"
- **THEN** la respuesta correcta es "I am twelve." y los distractores son respuestas en inglés a otras
  preguntas
