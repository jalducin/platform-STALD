# Estándares de backend (Supabase Edge Function)

## 1. Fuente de verdad y despliegue

- El código de la función vive en `supabase/functions/tareas-estudio-secundaria/index.ts`.
  **Lo desplegado debe ser idéntico a lo versionado.** Prohibido editar y desplegar la función
  directamente (desde el dashboard o MCP) sin que el cambio esté en el repo.
- Despliegue (desde la raíz del repo):
  `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api`.
  Tras desplegar, anotar la versión resultante en el reporte del cambio.
- Archivos: `index.ts` (HTTP + llamadas a Notion), `rows.ts` (lógica pura: extracción y filtrado),
  `rows_test.ts` (pruebas).
- Pruebas: `npx -y deno test supabase/functions/tareas-estudio-secundaria/rows_test.ts`
  y verificación de tipos con `npx -y deno check supabase/functions/tareas-estudio-secundaria/index.ts`.

## 2. Configuración y secretos

- Secretos solo en variables de entorno de Supabase (`NOTION_TOKEN`). Nunca en el código ni en el repo.
- Correos de administración, IDs de bases y demás configuración sensible se leen de variables de
  entorno. El repo es **público**: un correo de admin escrito en el código funciona como llave pública.
- Documentar cada variable de entorno nueva en este archivo (§6).

## 3. Contrato HTTP

| Ruta | Método | Parámetros | Respuesta 200 |
|---|---|---|---|
| `/data` | GET | `email` (obligatorio) | `{ rows: SecundariaRow[], isAdmin: boolean, generatedAt: ISO }` |
| `/ingles/data` | GET | `email` (obligatorio) | `{ rows: InglesRow[], isAdmin: boolean, generatedAt: ISO }` |
| cualquier ruta | OPTIONS | — | 200 con CORS |
| cualquier otra | GET | — | `404 { error: "not_found" }` |

Errores: `400 { error: "missing_email" }`, `500 { error: "upstream_error" }` (el detalle solo va al log).
Las filas **no** incluyen `userIds` ni `userEmails`; solo `userNames`. Los campos de cada fila están en
`docs/data-model.md` y los tipos en `rows.ts`. Cambiar el contrato exige actualizar
este documento y todas las páginas consumidoras en el mismo cambio.

## 4. Seguridad y privacidad

- **Menor exposición posible**: la respuesta incluye solo los campos que la UI muestra. No devolver
  correos de otros usuarios a quien no sea admin.
- La autorización se decide **en el servidor**; el cliente no filtra por permisos.
- Riesgo conocido: hoy la identidad es "el correo que escribes", sin verificar. Cualquier cambio de acceso
  debe decir en su `design.md` si mantiene, mitiga o elimina ese riesgo.
- No registrar en logs correos ni contenido de filas.
- Los errores de Notion no deben filtrar el token ni detalles internos al cliente más allá de un código.

## 5. Código

- TypeScript con interfaces explícitas para cada forma de fila.
- Un solo helper de consulta paginada a Notion (`queryDatabase`) y un extractor por base; no duplicar
  el bucle de paginación.
- Las funciones puras (extracción de propiedades, filtrado por correo) se escriben de forma que se
  puedan probar con `deno test` sin llamar a Notion.

## 6. Variables de entorno

| Variable | Uso | Estado |
|---|---|---|
| `NOTION_TOKEN` | Token de la integración de Notion (lectura + correos de usuarios) | En uso |
| `SUPER_ADMIN_EMAIL` | Correo que ve todas las filas (`isAdmin: true`). Vacío o ausente ⇒ nadie es admin | En uso desde 2026-09-25 |

## 7. Verificación (Step N+2)

El agente ejecuta, como mínimo, contra la función desplegada:

```bash
BASE=https://xozsrcnjnugwbrrrwoeb.supabase.co/functions/v1/tareas-estudio-secundaria
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/data"                 # 400
curl -s "$BASE/data?email=no-existe@example.com" | head -c 200        # rows: []
curl -s "$BASE/ingles/data?email=no-existe@example.com" | head -c 200 # rows: []
```

Además, un correo de alumna asignada (sin escribirlo en el reporte: usar "alumna A") y el caso admin.
