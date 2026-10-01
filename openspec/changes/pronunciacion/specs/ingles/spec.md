## ADDED Requirements

### Requirement: Ejercicios de audio y pronunciación
Un ejercicio SHALL poder llevar `audio`, que la página lee en voz alta en inglés a velocidad normal y lenta.
El tipo `pronunciar` SHALL mostrar una frase y permitir decirla en voz alta. El reconocimiento de voz del
navegador SHALL transcribirla, y el servidor SHALL calificarla como correcta si coincide al menos el 80 %
de las palabras, con contracciones equivalentes. Si el navegador no reconoce voz, SHALL ofrecer
autoevaluación.

#### Scenario: Escuchar un par mínimo
- **WHEN** el profe toca 🔊 en "Which word do you hear?"
- **THEN** escucha la palabra y elige entre ship y sheep

#### Scenario: Pronunciar bien
- **WHEN** dice "I've been teaching for years" y el navegador reconoce "I have been teaching for years"
- **THEN** cuenta como correcta

#### Scenario: Pronunciar con errores
- **WHEN** lo reconocido coincide con menos del 80 % de la frase
- **THEN** cuenta como incorrecta, y la revisión muestra lo que se escuchó y la frase modelo

#### Scenario: Navegador sin reconocimiento de voz
- **WHEN** el navegador no tiene reconocimiento de voz
- **THEN** aparecen "✔ Me salió bien" y "↺ Necesito repetir", y se califica según lo que elija

### Requirement: Pronunciación semanal del profe
La ruta del profe SHALL incluir una actividad de pronunciación cada viernes (semanas 0–4), ligada a la
gramática de la semana.

#### Scenario: Semana con 3 actividades
- **WHEN** empieza una semana del mes 1
- **THEN** la ruta muestra la actividad A (lunes), el examen A (miércoles), la actividad B (jueves), la
  pronunciación (viernes) y el examen B (sábado)
