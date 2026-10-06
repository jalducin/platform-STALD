# plataforma Specification

## Purpose
Requisitos transversales del servidor: resiliencia ante el límite de GitHub, vigilancia con avisos por correo y ahorro de peticiones. Origen: github-etag-cache, vigilancia-servidor y ahorro-peticiones.
## Requirements
### Requirement: Almacén resiliente al límite de GitHub
El servidor SHALL usar peticiones condicionales (ETag) al leer el repo de datos, para que las lecturas sin cambios
no consuman el límite de la API. Si el límite se agota, SHALL servir la última copia conocida y, cuando no la haya,
SHALL responder 503 `mucho_trafico` con un mensaje claro, en lugar de un error genérico.

#### Scenario: Lectura sin cambios
- **WHEN** una partida consulta su estado y los archivos no cambiaron
- **THEN** GitHub responde 304, el servidor usa su copia y no se consume el límite

#### Scenario: Límite agotado con copia
- **WHEN** GitHub responde por límite agotado y el archivo ya se había leído
- **THEN** el servidor responde con la última copia conocida

#### Scenario: Límite agotado sin copia
- **WHEN** GitHub responde por límite agotado y no hay copia
- **THEN** el servidor responde 503 `mucho_trafico` y la página muestra "Hay mucha actividad; intenta de nuevo en
  unos minutos"

### Requirement: Aviso por correo cuando el servidor se bloquea
El servidor SHALL exponer `GET /salud` con el estado del límite de GitHub y del repo de datos, sin datos privados.
Un vigilante SHALL revisarlo cada 30 minutos (antes 15; cambio `ahorro-peticiones`) y SHALL avisar por correo al profe (vía un issue que lo menciona)
cuando el servidor esté bloqueado o cerca del límite, y SHALL avisar cuando se recupere.

#### Scenario: Servidor bloqueado
- **WHEN** el límite de GitHub se agota o el servidor no responde
- **THEN** se abre el issue "🔴 Servidor bloqueado" mencionando a @jalducin, con la hora de reinicio, y le llega el
  correo de GitHub

#### Scenario: Cerca del límite
- **WHEN** quedan menos del 10 % de las lecturas de la hora
- **THEN** se abre "⚠️ Cerca del límite de GitHub"

#### Scenario: Recuperado
- **WHEN** el estado vuelve a ok con un aviso abierto
- **THEN** el vigilante comenta "✅ Recuperado" y cierra el aviso

#### Scenario: Sin spam
- **WHEN** el servidor sigue bloqueado en varias revisiones seguidas
- **THEN** no se agregan comentarios repetidos mientras el estado no cambie

### Requirement: Menos peticiones por partida
Las páginas SHALL enviar sus POST sin provocar la verificación previa de CORS. Las salas SHALL consultar su estado cada
2.5 s solo cuando haga falta verse en tiempo real (sala de espera, ¡Una!, Basta, Lotería) y cada 5 s en los juegos de
preguntas. Una sala de espera que no empieza en 15 min SHALL dejar de consultar.

#### Scenario: Envío sin preflight
- **WHEN** un jugador envía una respuesta
- **THEN** el navegador hace una sola petición (sin `OPTIONS` previo) y el servidor la procesa igual

#### Scenario: Quiz a 5 s
- **WHEN** empieza una partida de Maratón de cultura
- **THEN** la página consulta el estado cada 5 s y las preguntas siguen sincronizadas

#### Scenario: Sala de espera olvidada
- **WHEN** pasan 15 min en la sala de espera sin que el anfitrión empiece
- **THEN** la página deja de consultar y muestra cómo volver a entrar

### Requirement: Ayuda y reenvío cuando no llega el enlace
El paso del código de la entrada con enlace SHALL ayudar a quien no recibe el correo. Ese paso
(`pintarEntrada` de `comun/auth.js`, usado por Juegos, Inglés y Secundaria, y el paso propio del portal) SHALL mostrar debajo del formulario: «¿No te llegó? Revisa tu carpeta de
spam o promociones. Si en un par de minutos no aparece, pide uno nuevo. También puedes pedirle a tu profe tu enlace
de acceso por WhatsApp.» y un botón «📧 Reenviarme el enlace» que llame otra vez a `enviarEnlace(correo)`. Tras
cada envío el botón SHALL quedar deshabilitado 60 s con «Puedes pedir otro en N s». SHALL mostrar el éxito del
envío o el mensaje de error tal cual. En el modo de prueba (verificador falso) SHALL funcionar sin red.

#### Scenario: Ayuda visible
- **WHEN** la persona pide el enlace y llega al paso del código
- **THEN** ve la ayuda «¿No te llegó?» y el botón «📧 Reenviarme el enlace» deshabilitado con «Puedes pedir otro en … s»

#### Scenario: Reenviar
- **WHEN** termina la espera y la persona toca «📧 Reenviarme el enlace»
- **THEN** se vuelve a mandar el enlace al mismo correo, se avisa «Te mandamos otro enlace» y el botón vuelve a esperar 60 s

#### Scenario: Error al reenviar
- **WHEN** el envío falla (por ejemplo, por el límite de envíos)
- **THEN** se muestra el mensaje de error tal cual y el botón se habilita de nuevo

### Requirement: Juegos guardados en Postgres
Los datos de Juegos (salas, partidas, ranking, perfiles, fotos e invitados) SHALL guardarse en Postgres. SHALL NOT
consumir el límite de la API de GitHub.

#### Scenario: Partida sin GitHub
- **WHEN** dos personas juegan una partida
- **THEN** cada jugada se guarda en Postgres
- **AND** no se hace ninguna petición a la API de GitHub para guardarla

### Requirement: Fallas visibles en lugar de datos viejos
Si Postgres no responde, el servidor SHALL responder un error recuperable (503). SHALL NOT mostrar una copia vieja
de los datos.

#### Scenario: Base caída
- **WHEN** Postgres no responde al consultar resultados
- **THEN** la página muestra que intente de nuevo, sin calificaciones desactualizadas

### Requirement: Identidad de Inglés sin Notion
La identidad de alumnos y alumnas de Inglés SHALL salir del registro de la plataforma. Las personas que antes solo
existían en Notion SHALL conservar su acceso, porque se copian al registro antes de dejar de leer Notion.

#### Scenario: Alumna que solo estaba en Notion
- **WHEN** Inglés deja de leer Notion
- **THEN** Marisol sigue entrando con su correo y ve sus resultados

#### Scenario: Inglés no consulta Notion
- **WHEN** alguien abre Inglés, el portal o Juegos
- **THEN** la identidad de Inglés sale solo del registro, sin consultar la base «Clases Inglés» de Notion
- **AND** quien solo aparece en Notion, sin estar en el registro, no entra a Inglés
- **AND** Secundaria sigue leyendo su base de Notion

#### Scenario: Ya no se marcan tareas de Notion de Inglés
- **WHEN** alguien pide marcar una tarea de Notion de Inglés (`POST /ingles/data/<id>/completado`)
- **THEN** el servidor responde 404
- **AND** la página de Inglés no muestra tareas, botones ni calificaciones de Notion

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
- **THEN** la página pide cada tipo una vez (el flujo hace como máximo 6 peticiones al API contando las 2 fotos de
  avatar; antes 12)

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

