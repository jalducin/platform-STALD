## ADDED Requirements

### Requirement: Panel del profe en una petición
El servidor SHALL ofrecer `GET /ingles/panel[?grupo=<id>][&ocultos=1]`, solo para el admin, que devuelva en una
respuesta lo que la vista inicial del panel necesita, leído en paralelo:
- `grupos`: `{ grupos, miembros }` como `GET /ingles/grupos` (cada grupo con `ocultoAdmin`);
- `alumnos`: el registro de Inglés como `[{ nombre, baja? }]`, sin correos;
- `resumen`: el mismo cuerpo que `GET /ingles/resumen` con los mismos `grupo` y `ocultos`;
- `entregas`: `{ pendientes, porRevisar }`, donde `porRevisar` son los slugs de las misiones de Inglés listas para
  evaluar, sin textos de entregas;
- `fallas`: los nombres de las partes que fallaron.

A quien no es admin SHALL responder 403 `solo_admin`; sin sesión, 401. Ninguna parte SHALL llevar correos.
`GET /ingles/data?incluir=panel` SHALL agregar `panel` (el mismo cuerpo) solo cuando quien pide es el admin; para
cualquier otra persona SHALL responder igual que sin el parámetro. Al abrir `ingles.html` como admin, la página
SHALL pedir solo `/config`, `/ingles/actividades` y `/ingles/data?incluir=panel` (con sus verificaciones previas), y
las dos últimas en paralelo.

#### Scenario: Admin
- **WHEN** el admin con sesión pide `GET /ingles/panel`
- **THEN** recibe 200 con `grupos`, `alumnos`, `resumen`, `entregas` y `fallas: []`, y la respuesta no contiene
  ningún correo

#### Scenario: No admin
- **WHEN** una alumna con sesión pide `GET /ingles/panel`
- **THEN** recibe 403 `solo_admin`

#### Scenario: Sin sesión
- **WHEN** se pide `GET /ingles/panel` sin sesión
- **THEN** la respuesta es 401

#### Scenario: incluir=panel
- **WHEN** el admin pide `GET /ingles/data?incluir=panel` y una alumna pide lo mismo
- **THEN** el admin recibe `rows`, `isAdmin: true` y `panel`; la alumna recibe sus filas sin `panel`

#### Scenario: Abrir el panel
- **WHEN** el admin abre `ingles.html`
- **THEN** la página no pide `/ingles/grupos`, `/ingles/alumnos`, `/ingles/resumen`, `/profe/entregas` ni
  `/juegos/admin/resumen` hasta que abre una pestaña que los necesita

### Requirement: Panel del profe resiliente por sección
Si una parte del panel falla, `GET /ingles/panel` SHALL responder 200 con esa parte como `{ error, detalle? }`, con
su nombre en `fallas`, y las demás partes completas. Sin Postgres, `grupos` SHALL ser `{ error: "sin_base" }` sin
contar como falla. La página SHALL mostrar un aviso por cada sección que falló (grupos, alumnos y alumnas, «📥 Por
revisar») con «🔄 Reintentar», que vuelve a pedir `/ingles/panel`; si falló el resumen, SHALL mostrar su aviso con el
motivo y «🔄 Reintentar», y las tarjetas de grupo SHALL seguir.

#### Scenario: Falla una parte
- **WHEN** la lectura de las entregas falla y las demás no
- **THEN** el panel responde 200 con `entregas.error`, `fallas: ["entregas"]` y `grupos`, `alumnos` y `resumen`
  completos

#### Scenario: Aviso en la página
- **WHEN** el panel llega con el resumen caído
- **THEN** el Resumen muestra «No se pudo cargar el resumen» con el motivo y «🔄 Reintentar», y las tarjetas de
  grupo siguen a la mano

### Requirement: Pestañas pesadas del panel bajo demanda
La página del admin SHALL pedir `/ingles/alumnos` (con correos) solo al abrir «➕ Registro», `/juegos/admin/resumen`
solo al abrir «🎮 Juegos», «🧑‍🎓 Alumnos» o el cajón de un alumno o alumna, y la bandeja `/profe/entregas` solo al
abrir «📥 Entregas». Mientras llegan, la sección SHALL mostrar el esqueleto de carga. «📥 Por revisar» SHALL salir de
`entregas.porRevisar` del panel hasta que la bandeja se cargue, y de la bandeja después. Ocultar o mostrar un grupo
SHALL refrescar grupos, alumnos y alumnas, resumen y «Por revisar» con una sola petición a `/ingles/panel`. Todas las
funciones del panel (ocultar grupos, entregas, nicks, alta, baja y reactivar, quitar, mover de grupo, cajón, Mi ruta
y presentaciones) SHALL seguir igual.

#### Scenario: Abrir Registro
- **WHEN** el admin abre «➕ Registro»
- **THEN** la página pide `/ingles/alumnos` una vez y muestra cada tarjeta con su correo, «🚪 Baja de Inglés» y Quitar

#### Scenario: Abrir Juegos
- **WHEN** el admin abre «🎮 Juegos»
- **THEN** la página pide `/juegos/admin/resumen` una vez y muestra el ranking de la semana

#### Scenario: Ocultar un grupo
- **WHEN** el admin toca «👁️ Ocultar del panel»
- **THEN** la página hace el `POST` y una sola petición `GET /ingles/panel`, y el grupo sale del tablero
