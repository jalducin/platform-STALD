## ADDED Requirements

### Requirement: Verificación previa reutilizada
Las páginas SHALL pedir al API sin saltarse la caché del navegador, para que la verificación previa de CORS
(`OPTIONS`) de cada URL se haga una sola vez y se reutilice según `Access-Control-Max-Age`. Las respuestas con datos
personales SHALL seguir con `Cache-Control: no-store`, de modo que el navegador no las guarde.

#### Scenario: Sondeo de una sala
- **WHEN** dos personas juegan una partida de ¡Una! durante 30 s sin Realtime
- **THEN** cada página hace como máximo un `OPTIONS` por URL de la sala y el total de peticiones al API del flujo
  baja de 64 a 40 o menos

#### Scenario: Datos personales no se guardan
- **WHEN** el API responde `/perfil`, `/ingles/data`, `/ingles/actividades` o `/juegos/yo`
- **THEN** la respuesta lleva `Cache-Control: no-store` y no trae `ETag`

### Requirement: Caché HTTP de rutas sin datos personales
El servidor SHALL dejar guardar `/config` 10 minutos (`public, max-age=600`) y SHALL responder `/juegos/ranking` con
`Cache-Control: private, no-cache`, `Vary: Authorization` y un `ETag` débil del cuerpo; si la petición trae
`If-None-Match` con ese `ETag`, SHALL responder 304 sin cuerpo y con los encabezados CORS. Solo las respuestas 200
SHALL llevar esta política.

#### Scenario: Ranking sin cambios
- **WHEN** el navegador revalida el ranking con `If-None-Match` y el ranking no cambió
- **THEN** el servidor responde 304 sin cuerpo y la página muestra el mismo ranking

#### Scenario: Ranking con cambios
- **WHEN** alguien guardó puntos y el ranking cambió
- **THEN** el `ETag` cambia y el servidor responde 200 con el ranking nuevo

#### Scenario: Error no se guarda
- **WHEN** `/config` responde 503 `sin_config`
- **THEN** la respuesta lleva `no-store`

#### Scenario: Navegar entre páginas
- **WHEN** una alumna va del portal a Inglés, regresa al portal y abre Juegos
- **THEN** `/config` se pide una sola vez y el flujo hace como máximo 12 peticiones al API (antes 18)

### Requirement: Caché del cliente por persona
Las páginas de Juegos e Inglés SHALL hacer sus peticiones JSON por `StaldAuth.pedirJson`, que SHALL juntar en una sola
las peticiones `GET` idénticas en vuelo y SHALL guardar en memoria solo las que lo pidan con una vigencia (`ttl`). La
clave SHALL incluir el correo de la sesión. Cualquier envío (`POST`, `DELETE`) y cerrar sesión SHALL vaciar esa
memoria. El ranking de Juegos SHALL guardarse 30 s.

#### Scenario: Alternar pestañas del ranking
- **WHEN** una jugadora abre el ranking y alterna 4 veces entre Individuales y Partidas
- **THEN** la página pide cada tipo una vez (el flujo hace como máximo 3 peticiones al API, antes 12)

#### Scenario: Otra persona en el mismo aparato
- **WHEN** alguien cierra sesión y otra persona entra en la misma pestaña
- **THEN** la memoria se vació al cerrar sesión y la clave lleva otro correo: nunca ve datos guardados de la primera

#### Scenario: Después de jugar
- **WHEN** la jugadora guarda una partida y vuelve al ranking
- **THEN** el ranking se pide de nuevo al servidor (el envío vació la memoria)

### Requirement: Reintentos seguros ante fallas pasajeras
`StaldAuth.pedirJson` SHALL reintentar las lecturas (`GET`) ante red caída, 429, 502, 503 y 504, hasta 2 veces con
espera creciente y respetando `Retry-After` (tope 5 s). Los envíos (`POST`, `DELETE`) NO SHALL reintentarse solos.
Si tras los reintentos no hay red, SHALL devolver `{ ok: false, status: 0 }` con el error `sin_conexion` y un mensaje
amable, sin lanzar una excepción.

#### Scenario: 503 pasajero en una lectura
- **WHEN** el servidor responde 503 `mucho_trafico` una vez al pedir el ranking
- **THEN** la página reintenta sola y muestra el ranking sin aviso de error

#### Scenario: Envío con red caída
- **WHEN** la red se cae al enviar una respuesta (`POST`)
- **THEN** la petición no se reintenta sola y la página recibe `status: 0` con `sin_conexion`

### Requirement: Sondeo de salas resistente
El sondeo de una sala NO SHALL detenerse por un error de red: SHALL esperar cada vez más (de 2.5 s hasta 30 s) mientras
falle, mostrar «📶 Reconectando…» y volver a su ritmo al primer éxito. Con la pestaña oculta NO SHALL consultar; al
volver a verse SHALL consultar enseguida.

#### Scenario: La red se cae unos segundos
- **WHEN** las consultas de la sala fallan por red durante 6 s
- **THEN** al volver la red, ambas páginas siguen consultando y la partida continúa

#### Scenario: Volver a la pestaña
- **WHEN** la jugadora regresa a la pestaña de la partida después de tenerla oculta
- **THEN** mientras estuvo oculta no hubo consultas y al volver se consulta en menos de 1.2 s

### Requirement: Cargas coalescidas y en caché en el servidor
El servidor SHALL guardar las filas de Notion 60 s por base y los usuarios de Notion 10 min, SHALL coalescer las cargas
concurrentes de una misma clave (single-flight) en las filas de Notion, las lecturas de GitHub, el contenido de
actividades, la semana de Juegos y las marcas de migración, y SHALL servir la última copia de las filas de Notion
(hasta 10 min) si Notion falla. Marcar «Completado» SHALL invalidar las filas de Inglés. Cada respuesta SHALL seguir
filtrando por el correo de quien pide.

#### Scenario: Peticiones simultáneas
- **WHEN** llegan 5 peticiones a la vez y la caché de una fuente está vencida
- **THEN** el servidor hace una sola carga a esa fuente y las 5 reciben el mismo resultado

#### Scenario: Notion falla
- **WHEN** Notion responde con error y hay una copia de menos de 10 min
- **THEN** la ruta responde con la copia; sin copia, responde `upstream_error` como hoy

#### Scenario: Escritura durante una lectura
- **WHEN** se escribe un archivo mientras una lectura del mismo archivo sigue en vuelo
- **THEN** quien lee después de la escritura hace una lectura nueva, no recibe la vieja
