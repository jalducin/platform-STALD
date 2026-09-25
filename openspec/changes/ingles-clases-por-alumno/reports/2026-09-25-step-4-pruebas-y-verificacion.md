# Reporte Step 4/5 — Pruebas y verificación de estado

- Fecha: 2026-09-25
- Cambio: ingles-clases-por-alumno
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados

- `npx -y deno test supabase/functions/tareas-estudio-secundaria/rows_test.ts`
- `npx -y deno check supabase/functions/tareas-estudio-secundaria/index.ts`
- `supabase secrets set SUPER_ADMIN_EMAIL=<admin> --project-ref xozsrcnjnugwbrrrwoeb`
- `supabase functions deploy tareas-estudio-secundaria --project-ref xozsrcnjnugwbrrrwoeb --no-verify-jwt --use-api` → versión 11
- `curl` contra `/`, `/data` e `/ingles/data` (ver abajo)
- E2E con Playwright (Chromium) sobre `python -m http.server` sirviendo la raíz del repo
- Consultas a Notion: API en vivo vía la función (conteos) y vista "Marisol" (modo view)

## Resultados de pruebas

- Unitarias (deno): 6 pasaron, 0 fallaron, 0 omitidas. Type-check de `index.ts`: OK.
- curl (función desplegada v11):
  - `GET /` → 404 `{"error":"not_found"}`
  - `GET /ingles/data` sin email → 400 `{"error":"missing_email"}`
  - `GET /ingles/data?email=no-existe@example.com` → 200 `rows: []`, `isAdmin: false`
  - `GET /ingles/data?email=<admin>` → 200, `isAdmin: true`, 255 filas; claves por fila:
    `alumno, completado, fecha, label, name, source, url, userNames` (sin `userEmails`/`userIds`)
  - `GET /data?email=<admin>` → 200, `isAdmin: true`, 57 filas, sin `userEmails`
  - `GET /data?email=no-existe@example.com` → 200 `rows: []`
- E2E (10/10 PASS):
  - ingles: login visible sin sesión; correo sin filas muestra error y no abre la app; admin ve 5 grupos
    (Angel, Fernando, Jesus, Laura, Marisol) con "0/51 completadas"; grupo abierto = 51 filas; etiqueta
    Admin; cerrar sesión regresa al login
  - index: correo sin filas muestra error; admin abre la app ("Modo maestro — viendo todo")

## Verificación de estado (Notion, base "📖 Clases Inglés")

- Antes: 51 filas, todas `Nombre` = Fernando con `Usuario` asignado; 6 filas con `Calificación` no vacía
  (respaldadas fuera del repo, en el scratchpad del agente); 0 con `Observaciones`.
- Después (API en vivo): 255 filas = 51 × {Fernando, Marisol, Angel, Laura, Jesus}.
  - Catálogo de `Name` idéntico al de Fernando para los 5 alumnos; 0 títulos con sufijo " (1)".
  - `Usuario`: 51/51 en Fernando; 0/51 en cada alumno nuevo.
  - `Completado`: 0 en todas las filas.
  - `Calificación`/`Observaciones`: vacías (verificado en la vista "Marisol": 51 filas, todas vacías).
- Vistas: "Vistas Alumnos" contiene 5 vistas de tabla (Fernando, Marisol, Angel, Laura, Jesus),
  filtradas por `Nombre` y ordenadas por `Completado` ↑ y `Fecha Entrega ` ↑.
- Estado restaurado: no aplica. Los cambios de datos son el objetivo del cambio. No se crearon filas de prueba.

## Incidencias

- El índice SQL de Notion (`query-data-sources` en modo SQL) devolvió datos atrasados durante varios
  minutos (filas con `Nombre` vacío que en realidad eran Fernando). Se verificó con `fetch` de páginas y
  con la API en vivo a través de la función.
- Hay un servidor local detenido tras las pruebas (puerto 8765).

## Resultado

- Estado Step 4: PASS
- Estado Step 5 (verificación manual local): PASS. Queda pendiente la verificación en GitHub Pages después del merge.
- Bloqueos: ninguno
