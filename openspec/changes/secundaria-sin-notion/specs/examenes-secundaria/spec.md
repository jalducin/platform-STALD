## ADDED Requirements

### Requirement: Identidad de Secundaria desde el registro
La identidad de Secundaria SHALL salir del registro de alumnos y alumnas (`alumnos.json`, en Postgres en producción),
leído a través del store, sin Notion. Una entrada SHALL tener acceso a Secundaria si tiene `secundaria: true` o si su
slug aparece en `alumnos` de algún elemento visible de `contenido/secundaria/`. Su slug SHALL ser `slugSecundaria` si lo
tiene y, si no, el de su `nombre`; ese slug SHALL decidir sus clases exclusivas y sus resultados. La baja de Inglés
SHALL NOT quitar Secundaria. Un correo sin acceso SHALL recibir 403 `sin_acceso`. Las respuestas SHALL NOT incluir
correos. Si nadie tiene acceso por el registro, el servidor SHALL intentar temporalmente las filas de Notion y
registrar un aviso en el log; si Notion falla o no está configurado, SHALL seguir sin error (Secundaria sin acceso, las
demás rutas en 200).

#### Scenario: Alumna con clases exclusivas, de baja de Inglés
- **WHEN** Sofy está en el registro con `baja` de Inglés y sin `secundaria`, y sus clases traen
  `alumnos: ["sofia","sofy"]`
- **THEN** `/secundaria/actividades` responde 200 con sus clases y `/perfil` da `accesos.secundaria: true`, sin
  consultar Notion

#### Scenario: Marca del profe
- **WHEN** una entrada tiene `secundaria: true`
- **THEN** entra a Secundaria aunque no tenga clases exclusivas

#### Scenario: Slug heredado
- **WHEN** su entrada tiene `"slugSecundaria": "sofia"`
- **THEN** sus clases y sus resultados usan el slug `sofia`

#### Scenario: Otra persona
- **WHEN** entra un correo sin Secundaria, aunque sea de Inglés
- **THEN** recibe 403 `sin_acceso`

#### Scenario: Otra alumna de Secundaria
- **WHEN** otra persona con Secundaria pide una clase exclusiva de Sofy
- **THEN** no la ve en su lista y al abrirla por id recibe 404

#### Scenario: Notion borrado
- **WHEN** no hay `NOTION_TOKEN` o las bases de Notion ya no existen
- **THEN** ninguna ruta responde `upstream_error` por Secundaria y `/perfil` responde 200

### Requirement: Marcar Secundaria desde el registro
El admin SHALL poder dar o quitar Secundaria a una persona del registro con `POST /ingles/grupos/secundaria
{ email, secundaria: boolean }` (solo admin, reversible). Al darla, si el slug que usaba en Notion difiere del de su
nombre, SHALL guardarse en `slugSecundaria`; al quitarla, `slugSecundaria` SHALL conservarse. La lista del admin
(`GET /ingles/alumnos`) SHALL indicar quién tiene `secundaria`.

#### Scenario: El profe marca a una persona
- **WHEN** el admin manda `{ "email": <correo>, "secundaria": true }`
- **THEN** la entrada queda con `secundaria: true`, sin cambiar su baja de Inglés, y entra a Secundaria

#### Scenario: No admin
- **WHEN** otra persona llama la ruta
- **THEN** responde 403 `solo_admin`

### Requirement: secundaria.html muestra las clases nuevas
`secundaria.html` SHALL NOT llamar a `/data` ni pintar el tablero de Notion. SHALL llevar directo a las clases nuevas
(`ingles.html?modo=secundaria`), conservando `?api=` y los demás parámetros. Sin JavaScript SHALL ofrecer un enlace a
esa vista. SHALL funcionar sin `NOTION_TOKEN` en el servidor.

#### Scenario: La alumna abre Secundaria
- **WHEN** la alumna abre `secundaria.html` con sesión
- **THEN** ve «📚 Mis clases» y ninguna petición va a `/data`

#### Scenario: Pruebas locales
- **WHEN** se abre `secundaria.html?api=http://127.0.0.1:8897`
- **THEN** la vista nueva usa ese mismo `api`

### Requirement: El profe ve las clases como la alumna
`GET /secundaria/actividades` del admin SHALL traer `alumnas: [{ nombre, slug }]` sin correos; con `?alumna=<slug>`
(solo la lista, solo GET) SHALL devolver lo que ve esa alumna (estado, intentos y mejor con materias) con `isAdmin:
true` y `vistaDe`; un slug desconocido SHALL responder 404 `alumna_no_encontrada`. Para quien no es admin el parámetro
SHALL ignorarse, y SHALL NOT permitir enviar intentos a nombre de la alumna.

#### Scenario: Vista de la alumna
- **WHEN** el admin pide `?alumna=sofy`
- **THEN** recibe las clases de Sofy con su estado y su mejor calificación, marcadas como vista del admin

#### Scenario: La alumna intenta usar el parámetro
- **WHEN** una alumna pide `/secundaria/actividades?alumna=otra`
- **THEN** recibe solo lo suyo

## MODIFIED Requirements

### Requirement: Exámenes de Secundaria
La plataforma SHALL ofrecer clases y exámenes de Secundaria en `ingles.html?modo=secundaria` (y desde
`secundaria.html`), con el motor de actividades y contenido en `contenido/secundaria/`. La identidad SHALL salir del
registro de alumnos y alumnas (marca `secundaria` o clases exclusivas), no de Notion. El admin SHALL ver los
resultados por persona y por materia.

#### Scenario: Alumna de Secundaria
- **WHEN** una alumna con Secundaria entra a «📚 Mis clases»
- **THEN** ve sus clases y exámenes, los resuelve y ve su calificación por materia

#### Scenario: Sin Secundaria
- **WHEN** entra un correo sin Secundaria
- **THEN** recibe un aviso de que la sección es solo para alumnos y alumnas de Secundaria
