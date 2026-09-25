# Modelo de datos (Notion)

Fuente canónica de las bases de Notion y de las propiedades que lee el backend. Los nombres de
propiedad son **literales** (incluyen acentos y espacios). Renombrar una propiedad en Notion rompe el
backend: tratarlo como un cambio OpenSpec.

## Base "📖 Clases" (Secundaria)

- ID: `3831c6b4f8b5817ba701ed689f825cf0`
- Consumida por: `/data` → `index.html`

| Propiedad Notion | Tipo | Campo en `Row` |
|---|---|---|
| `Name` | title | `name` |
| `Matería` (sic, con acento) | select | `materia` |
| `Completado` | checkbox | `completado` |
| `Fecha entrega` | date | `fecha` |
| `Fecha entrega real` | date / last_edited_time | `fechaReal` (AAAA-MM-DD) |
| `Semana` | select | `semana` |
| `Día ` (sic, con espacio final) | select | `dia` |
| `Usuario` | people | `userIds` → `userEmails`, `userNames` |

## Base "📖 Clases Inglés"

- ID: `3c41c6b4f8b580f888d8d122cbb5c613`
- Consumida por: `/ingles/data` → `ingles.html` (`source: "clases_ingles"`)
- Fuera de alcance: el hub "Ingles Aguilar" (excluido a pedido del usuario).

| Propiedad Notion | Tipo | Campo en `InglesRow` |
|---|---|---|
| `Name` | title | `name` |
| `Módulo` | select | parte de `label` |
| `Tipo` | select | parte de `label` (`"Módulo · Tipo"`) |
| `Completado` | checkbox | `completado` |
| `Fecha de Entrega` | date | `fecha` |
| `Usuario` | people | `userIds` → `userEmails`, `userNames` |

## Acceso por correo

- Una fila es visible para una alumna si su correo está entre los correos de los usuarios de `Usuario`.
- Para que el correo se resuelva, la persona debe ser **miembro o guest** del workspace de Notion y la
  integración debe tener la capability de leer correos de usuarios.
- El administrador ve todas las filas.
- La lista de alumnas y sus correos **vive solo en Notion**; no se copia al repo.
