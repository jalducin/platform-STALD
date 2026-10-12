## ADDED Requirements

### Requirement: Contenido de inglés por tema
`juegos/datos/ingles.json` SHALL traer contenido de lo visto en clase, nivel A1 y en español de México, sin
nombres de alumnos ni alumnas reales:
- `verbos` con al menos 40 frases por cada tema de tiempo: `to be`, `to be pasado`, `presente simple`,
  `pasado simple` y `futuro will`;
- `oraciones` y `preguntas` con ejemplos de esos tiempos;
- `tiempos` con al menos 40 oraciones que se pueden poner en presente, pasado y futuro.

Cada elemento SHALL llevar `tema` y su traducción `es`. Cada frase de `verbos` SHALL llevar su `regla` corta.

#### Scenario: Forma válida
- **WHEN** corre la prueba de datos de `ingles.json`
- **THEN** cada elemento tiene un tema válido para su clave y su traducción
- **AND** `correcta` está dentro del rango de opciones y las opciones no se repiten
- **AND** cada tema de tiempo tiene al menos 40 frases en `verbos`

### Requirement: Selector de tema en los juegos de gramática
🧩 Completa y responde (`en-frases`) y 🔀 Ordena la oración (`en-ordena`) SHALL dejar elegir el tema antes de
jugar: Todo · To be · Presente · Pasado · Futuro (will). Con un tema elegido, SHALL salir solo contenido de ese
tema. Al crear una partida de `en-frases`, el tema SHALL ir en las opciones de la sala (`opciones.tema`); el
servidor SHALL aceptar `todo`, `tobe`, `presente`, `pasado` y `futuro` (por omisión `todo`) y responder 400
`tema_invalido` con otro valor.

#### Scenario: Elegir Pasado en solitario
- **WHEN** una alumna abre Completa y responde y elige «Pasado»
- **THEN** solo le salen frases y preguntas en pasado (was / were o pasado simple)

#### Scenario: Partida con tema
- **WHEN** alguien crea una partida de Completa y responde con el tema «Futuro (will)»
- **THEN** la sala guarda `opciones.tema = futuro`
- **AND** las 10 preguntas de la partida son de futuro con will

#### Scenario: Revancha con el mismo tema
- **WHEN** termina una partida de Completa y responde con tema «Pasado» y alguien pide «🔁 Otra con los mismos»
- **THEN** la sala nueva conserva `opciones.tema = pasado`

#### Scenario: Tema inválido
- **WHEN** alguien crea una partida de `en-frases` con `opciones.tema = "marciano"`
- **THEN** el servidor responde 400 `tema_invalido`

### Requirement: Máquina del tiempo
El catálogo SHALL incluir ⏳ Máquina del tiempo (`en-tiempos`) en Inglés, en solitario y en partida (con bots y
amigos), con tope de 2,000 puntos por partida individual.
- Cada oración se juega en dos pasos: elegir si está en pasado, presente o futuro, y luego elegir cómo queda en el
  tiempo que se pide (por ejemplo «She plays soccer.» → pasado → «She played soccer.»).
- En solitario dura 90 s contra reloj con racha, como Completa y responde.
- Cada error SHALL mostrar una explicación breve, y al final SHALL mostrarse lo que más falló.
- En partida SHALL usar las mismas 10 preguntas sincronizadas, puntos, podio y guardado que Completa y responde.

#### Scenario: Jugar en solitario
- **WHEN** un alumno juega la Máquina del tiempo y se equivoca al pasar «He goes to the park.» a pasado
- **THEN** ve la regla («Pasado irregular: go → went») sin que el juego se detenga
- **AND** al terminar ve sus puntos y «Lo que más se te complicó»

#### Scenario: Partida con bots
- **WHEN** alguien crea una partida de Máquina del tiempo con bots y la empieza
- **THEN** todos ven las mismas 10 preguntas y al final el podio con humanos y bots
- **AND** sus puntos se guardan en sus puntos de partidas

### Requirement: Regla corta al fallar en gramática
Cada error en los juegos de gramática de inglés (Completa y responde, Ordena la oración y Máquina del tiempo) SHALL
mostrar la regla corta que aplica (por ejemplo «Con he / she / it el verbo lleva -s»), en solitario y en la
revelación de la partida, sin alargar las pausas del juego.

#### Scenario: Error de tercera persona
- **WHEN** en «She ___ milk every day.» alguien elige «drink»
- **THEN** ve la frase correcta y la regla «Con he / she / it el verbo lleva -s»
