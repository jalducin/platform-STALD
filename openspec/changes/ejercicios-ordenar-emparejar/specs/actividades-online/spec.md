## MODIFIED Requirements

### Requirement: Teoría, ejercicios y tips
Cada actividad, refuerzo y examen SHALL tener `temas` (con `retroalimentacion` por estado), un `banco` de
ejercicios etiquetados por tema, cada uno con `explicacion`, y `tips` (ejercicios en libreta y búsquedas
de video). Las actividades y el refuerzo SHALL tener además `teoria`. Los ejercicios SHALL ser de tipo
`opcion` (índice correcto), `escribir` (lista de respuestas aceptadas, comparadas sin mayúsculas,
acentos ni espacios extra), `pronunciar` (frase), `ordenar` (armar la oración con fichas) o `emparejar`
(unir pares).

#### Scenario: Escribir un plural
- **WHEN** el ejercicio "box → ___" acepta ["boxes"] y el alumno escribe " Boxes "
- **THEN** cuenta como correcto

## ADDED Requirements

### Requirement: Ejercicio para ordenar la oración
Un ejercicio `ordenar` SHALL traer `palabras` (al menos 2, en el orden correcto) y, de forma opcional,
`distractores` y `aceptadas` (otros órdenes válidos). La página SHALL recibir solo `fichas`: `palabras` más
`distractores`, barajadas en el servidor de forma determinista por alumno o alumna, intento y ejercicio, y nunca
en el orden correcto ni con `palabras`, `distractores` o `aceptadas`. La respuesta SHALL ser el texto de las
fichas elegidas unidas por espacios. SHALL ser correcta si, normalizada (sin mayúsculas, acentos ni espacios
extra), coincide con `palabras` unidas o con alguna de `aceptadas`. La página SHALL mostrar las fichas como
botones: al tocar una pasa a la línea de respuesta, al tocarla ahí regresa, y «Borrar» las regresa todas. SHALL
poder usarse con teclado y lector de pantalla y en un celular de 390 px. Con `audio`, SHALL servir como ejercicio
de escucha.

#### Scenario: Armar bien la oración
- **WHEN** las palabras son ["I","will","travel","tomorrow"] con el distractor "going" y la alumna toca I, will, travel, tomorrow
- **THEN** la respuesta es "I will travel tomorrow" y cuenta como correcta

#### Scenario: Otro orden aceptado
- **WHEN** el ejercicio acepta "Tomorrow I will travel" y el alumno arma "tomorrow I will travel"
- **THEN** cuenta como correcta

#### Scenario: Orden equivocado o con distractor
- **WHEN** la alumna arma "I going travel tomorrow"
- **THEN** cuenta como incorrecta, y la revisión muestra lo que armó y "I will travel tomorrow"

#### Scenario: Las fichas no revelan el orden
- **WHEN** el navegador pide el intento
- **THEN** el ejercicio trae `fichas` en un orden distinto al correcto, sin `palabras`, `distractores` ni `aceptadas`, y pedirlo otra vez en el mismo intento da el mismo orden

#### Scenario: Deshacer una ficha
- **WHEN** el alumno toca una ficha que ya está en su línea de respuesta
- **THEN** la ficha regresa a las fichas disponibles y la respuesta se actualiza

### Requirement: Ejercicio para unir pares
Un ejercicio `emparejar` SHALL traer `pares` (de 3 a 6, sin textos repetidos en cada lado). La página SHALL
recibir `izquierda` en orden y `derecha` barajada en el servidor de forma determinista, sin `pares`. La respuesta
SHALL ser un arreglo, del largo exacto de `izquierda`, con la opción de `derecha` elegida para cada elemento (`""`
si aún no se une). Cualquier otra forma SHALL descartarse al sanear. SHALL ser correcta solo si coinciden todos los
pares. En la página se SHALL tocar un elemento de la izquierda y luego uno de la derecha; los pares hechos SHALL
quedar marcados con color y número, y SHALL poder deshacerse. La pregunta SHALL contar como respondida solo con
todos los pares unidos.

#### Scenario: Todos los pares bien
- **WHEN** el alumno une this → este / esta, these → estos / estas, that → ese / esa / aquel y those → esos / esas
- **THEN** cuenta como correcta

#### Scenario: Un par mal
- **WHEN** la alumna intercambia dos significados
- **THEN** cuenta como incorrecta, y la revisión muestra sus pares y los correctos ("this → este / esta · …")

#### Scenario: Deshacer un par
- **WHEN** el alumno toca un elemento ya unido
- **THEN** el par se deshace, pierde su color y la pregunta deja de contar como respondida

#### Scenario: Respuesta malformada
- **WHEN** el cliente envía un arreglo con otro largo, valores que no son texto o una opción que no existe
- **THEN** el servidor la descarta y la pregunta cuenta como sin responder

### Requirement: Ciclo completo de los ejercicios de fichas y pares
Los tipos `ordenar` y `emparejar` SHALL funcionar igual que los demás tipos en todo el ciclo:
- validación del contenido (`validateItem` y `server/validar_semana.ts`): campos obligatorios, 3 a 6 pares, sin
  fichas repetidas entre `palabras` y `distractores`, ni textos repetidos en un mismo lado de los pares;
- intento de corrección, con las correctas fijas y armadas;
- autoguardado en el aparato y en la cuenta (`PUT /<id>/borrador`), con el avance parcial de los pares;
- modo paso en celular y vista previa del admin;
- textos de revisión en resultados, guion o retro y resumen del admin.

#### Scenario: Validación de contenido
- **WHEN** una semana trae un `emparejar` con 2 pares, o un `ordenar` con una ficha repetida entre `palabras` y `distractores`
- **THEN** `validar_semana` reporta el error y sale con código 1

#### Scenario: Recargar a medio intento
- **WHEN** el alumno arma parte de la oración y une dos pares, y recarga la página
- **THEN** al volver a abrir, la oración y los pares siguen armados, y se avisa «Recuperamos tus 2 respuestas»

#### Scenario: Corrección
- **WHEN** en el intento 1 la alumna acertó el `emparejar` y falló el `ordenar`
- **THEN** en la corrección el `emparejar` aparece fijo con sus pares y solo hay que volver a armar la oración
