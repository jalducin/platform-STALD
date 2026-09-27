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
| `Usuario` | people | resuelto a `userNames` (el correo solo se usa en el servidor para filtrar) |

## Base "📖 Clases Inglés"

- ID: `3c41c6b4f8b580f888d8d122cbb5c613` (data source `9581c6b4-f8b5-8283-bf7e-878652c0d17e`)
- Consumida por: `/ingles/data` → `ingles.html` (`source: "clases_ingles"`)
- Fuera de alcance: el hub "Ingles Aguilar" (excluido a pedido del usuario).
- **Modelo: una fila por (clase, alumno).** El mismo catálogo de clases se repite para cada alumno.
  Alumnos actuales: Fernando, Marisol, Angel, Laura y Jesus (51 clases cada uno). Una clase nueva se
  agrega una vez por alumno.
- Calendario de entregas: una actividad por día desde 2026-09-26 (hasta 2026-11-14), ordenadas por
  `Dificultad` (A1 → A2 → B1), luego por `Módulo` y por número de lección; el mismo para todos los alumnos.
  "📋 REGLA — Dónde anotar cada tipo de clase" no lleva fecha. Detalle: cambio OpenSpec `ingles-fechas-y-avance`.
- Vistas: "Mis clases" (`Usuario` = me; pestaña de la base y vista en "Vistas Alumnos") para que cada
  alumno vea sus filas, y una vista por alumno filtrada por `Nombre` para el admin. Las vistas no son
  control de acceso: un guest con acceso a la base puede quitar el filtro.

| Propiedad Notion | Tipo | Campo en `InglesRow` |
|---|---|---|
| `Name` | title | `name` |
| `Nombre` | select (alumno) | `alumno` |
| `Módulo` | select | parte de `label` |
| `Tipo` | select | parte de `label` (`"Módulo · Tipo"`) |
| `Completado` | checkbox | `completado` |
| `Fecha Entrega ` (sic, con espacio final) | date | `fecha` |
| `Usuario` | people | resuelto a `userNames` (el correo solo se usa en el servidor para filtrar) |
| `Dificultad` | select (A1–C2) | `dificultad` |
| `Calificación` | text | `calificacion` (null si está vacía) |
| `Observaciones` | text | — (solo en Notion) |
| (página) `last_edited_time` | sistema | `editadoEn`: se usa como fecha de realización |

## Acceso por correo

- Una fila es visible para una alumna si su correo está entre los correos de los usuarios de `Usuario`.
  En Inglés, las filas nuevas se crean con `Usuario` vacío: el admin asigna el guest de cada alumno
  (en la vista del alumno, seleccionar todas las filas y asignar `Usuario` en bloque).
- Para que el correo se resuelva, la persona debe ser **miembro o guest** del workspace de Notion y la
  integración debe tener la capability de leer correos de usuarios.
- El administrador (correo en el secreto `SUPER_ADMIN_EMAIL`) ve todas las filas.
- La lista de alumnas y sus correos **vive solo en Notion**; no se copia al repo.

## Exámenes (JSON, sin base de datos)

**Definición** (versionada en `supabase/functions/tareas-estudio-secundaria/examenes/<id>.json`):

```json
{
  "id": "diagnostico-a1", "titulo": "…", "descripcion": "…", "nivel": "A1",
  "disponibleDesde": "2026-09-27",
  "secciones": [{ "id": "to-be", "titulo": "Verbo to be",
    "retroalimentacion": { "fortaleza": "…", "en-progreso": "…", "debilidad": "…" } }],
  "preguntas": [{ "id": "be-1", "seccion": "to-be", "enunciado": "I ___ a student.",
    "opciones": ["is", "are", "am", "be"], "correcta": 2, "explicacion": "…" }]
}
```

**Resultado** (Supabase Storage, bucket privado `examenes`, `resultados/<id>/<alumno>.json`): `examen`,
`titulo`, `alumno`, `enviadoEn`, `respuestas`, `correctas`, `total`, `porcentaje`, `nivelSugerido`,
`secciones[]` (`correctas`, `total`, `porcentaje`, `estado`, `retroalimentacion`), `fortalezas`,
`enProgreso`, `debilidades` y `revision[]` (`enunciado`, `tuRespuesta`, `correcta`, `explicacion`). Sin correos.

Umbrales por tema: ≥ 80 % fortaleza, 60–79 % en progreso, < 60 % debilidad. Nivel sugerido del diagnóstico
A1: ≥ 80 % "A1 sólido — listo para A2", 50–79 % "A1 en progreso", < 50 % "Iniciando A1".
