## ADDED Requirements

### Requirement: Resumen del profe que no se cae por una lectura
`GET /ingles/resumen` SHALL NOT depender de Notion. Si falla una lectura de Postgres, SHALL responder 200 con la
parte que sí se pudo leer y con `avisos` en lugar de 500:
- si no se pueden leer los resultados de una columna (tras un reintento), esa columna SHALL quedar fuera de
  `columnas` y de los indicadores, y `avisos` SHALL incluir `resultados_incompletos`;
- si no se pueden leer los grupos, el resumen SHALL salir sin filtrar por grupo y `avisos` SHALL incluir
  `grupos_no_disponibles`;
- `avisos` SHALL venir siempre (arreglo vacío si todo se leyó).

#### Scenario: Notion caído
- **WHEN** el servidor tiene `NOTION_TOKEN` y Notion responde error
- **THEN** `/ingles/resumen` responde 200 y no hace ninguna llamada a Notion

#### Scenario: Falla la lectura de una columna
- **WHEN** la lectura de `resultados/<id>/` de una columna falla dos veces
- **THEN** el resumen responde 200 sin esa columna y con `avisos: ["resultados_incompletos"]`

#### Scenario: Fallan los grupos
- **WHEN** fallan las lecturas de grupos e inscripciones
- **THEN** el resumen responde 200 con todos los alumnos y alumnas y `avisos: ["grupos_no_disponibles"]`

### Requirement: Motivo del error solo para el admin
El 500 `upstream_error` del servidor SHALL traer `detalle` (el mensaje de la falla, ≤ 200 caracteres) solo cuando
quien pide es el admin. Para cualquier otra persona SHALL seguir siendo solo `{ "error": "upstream_error" }`.

#### Scenario: Error inesperado del admin
- **WHEN** una ruta del admin falla con una excepción no prevista
- **THEN** la respuesta es 500 con `error: "upstream_error"` y un `detalle` no vacío

### Requirement: Ocultar el grupo desde su tarjeta del Resumen
Cada tarjeta de grupo del Resumen del admin SHALL tener «👁️ Ocultar del panel» junto a «🔍 Ver grupo» y «🎥 Meet»,
con la misma acción que en «👥 Grupos». Con «Mostrar grupos ocultos (N)» encendido, el grupo oculto SHALL verse con
«🙈 oculto del panel» y «👁️ Mostrar en el panel». Las tarjetas SHALL verse también mientras el resumen carga o si
falla. Si el resumen falla, el aviso SHALL mostrar el motivo y «🔄 Reintentar». Si trae `avisos`, SHALL mostrarlos en
texto claro.

#### Scenario: Ocultar desde la tarjeta
- **WHEN** el admin toca «👁️ Ocultar del panel» en la tarjeta del Grupo 1
- **THEN** la tarjeta sale del tablero, la bandera queda en el servidor y aparece «Mostrar grupos ocultos (1)»

#### Scenario: Mostrar otra vez
- **WHEN** enciende «Mostrar grupos ocultos (1)» y toca «👁️ Mostrar en el panel» en la tarjeta
- **THEN** el grupo vuelve al panel, la bandera queda en falso y el interruptor desaparece

#### Scenario: Resumen caído
- **WHEN** `/ingles/resumen` responde 500
- **THEN** el aviso muestra el motivo y «🔄 Reintentar», y las tarjetas con «👁️ Ocultar del panel» siguen

### Requirement: Carga del admin de Inglés sin errores
Al cargar `ingles.html` como admin y recorrer cada pestaña (y la ruta del profe), la página SHALL NOT producir
errores de consola, errores JS, scripts o estilos que no carguen ni respuestas 5xx de la API. La única excepción es
el 503 `sin_base` de `GET /ingles/grupos` cuando no hay Postgres. La E2E `ingles-admin` SHALL fallar ante
cualquiera de ellos.

#### Scenario: Carga limpia
- **WHEN** el admin abre `ingles.html` y recorre todas las pestañas
- **THEN** no hay ningún error en consola ni respuestas 5xx
