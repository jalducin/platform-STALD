## Why

El diagnóstico funcionó (4 de 5 resueltos; debilidad común: Presente simple, seguida de Alfabeto). Las
actividades de Notion son demasiado complejas para el nivel A1. Hace falta un ritmo semanal propio, con
teoría breve y ejercicios en línea, sin cargar ni afectar el proyecto de Supabase "Fidello QAS".

## What Changes

- **Ritmo semanal**:
  - Martes, jueves y sábado: actividad con **teoría + ejercicios, máximo 2 intentos**; cuenta el mejor.
  - Viernes: **examen semanal con 1 intento**.
  - Domingo: repaso por Meet.
- **Misma clase para todos, ejercicios distintos para cada quien**: cada actividad tiene un banco de
  ejercicios. A cada alumno o alumna, y en cada intento, le toca una selección y un orden diferentes
  (deterministas).
- **Refuerzo personalizado del sábado**: los ejercicios salen de los temas débiles de cada quien en el
  examen del viernes; si no lo ha resuelto, del diagnóstico.
- **Tips extra en cada actividad**: ejercicios en libreta y búsquedas de videos.
- **Semana 1** (29 sep – 4 oct):
  - Mar 29: alfabeto (spelling), pronombres personales, artículos the / a / an.
  - Jue 1: verbos con -s en 3.ª persona y plurales s / es / ies.
  - Vie 2: examen semanal de todo.
  - Sáb 3: refuerzo.
  - Dom 4: Meet.
- **Plataforma fuera de Fidello**:
  - El backend corre en **Deno Deploy** (mismo código Deno).
  - Contenido (con respuestas) y resultados son **JSON en el repo privado** `jalducin/platform-STALD-data`.
  - Se migran los resultados del diagnóstico desde Supabase Storage.
  - Al terminar, la función de Supabase y el bucket quedan fuera de uso.
- **Admin**: ve por alumno o alumna los intentos de cada actividad, su mejor calificación, los exámenes y
  un resumen de **temas a reforzar** para armar las clases. El contenido y los resultados también se pueden
  revisar en GitHub y leer con IA para preparar la semana siguiente (enfoque tipo RAG sobre archivos).
- Las 51 actividades de Notion **se mantienen** en el tablero.

## Capabilities

### New Capabilities
- `actividades-online`: actividades con teoría, bancos de ejercicios, selección por alumno o alumna,
  intentos, refuerzo, examen semanal, Meet y tips.
- `plataforma-sin-fidello`: backend en Deno Deploy y datos en el repo privado de GitHub.

### Modified Capabilities
- `dashboard-ingles`: sección "📚 Esta semana", vista de actividad (teoría → ejercicios → resultado,
  reintento) y resumen admin. Como requisitos agregados, hasta archivar los cambios previos.

## Impact

- Código nuevo en `server/` (entrypoint de Deno Deploy). `supabase/functions/` queda obsoleto tras la migración.
- `ingles.html` apunta a la URL de Deno Deploy.
- **Acciones del usuario** (una sola vez):
  1. Crear el proyecto en Deno Deploy (con GitHub) enlazado a este repo, entrypoint `server/main.ts`.
  2. Crear un token fino de GitHub con acceso solo a `platform-STALD-data` (Contents: lectura y escritura).
  3. Cargar en Deno Deploy las variables `NOTION_TOKEN`, `SUPER_ADMIN_EMAIL`, `GITHUB_TOKEN` y `DATA_REPO`.
- **Acciones del agente**: repo privado, contenido de la semana 1, migración de resultados y verificación.
