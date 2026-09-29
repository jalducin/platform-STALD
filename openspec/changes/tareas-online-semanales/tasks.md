## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/tareas-online-semanales`

## 1. Repo de datos y contenido (semana 1)

- [x] 1.1 Crear el repo privado `jalducin/platform-STALD-data`
- [x] 1.2 `contenido/semanas/2026-09-28.json` (mar 29, jue 1, vie 2, sáb 3, dom 4)
- [x] 1.3 Actividad 29: alfabeto, pronombres, artículos — teoría, banco, tips
- [x] 1.4 Actividad 1: verbos con -s en 3.ª persona, plurales s/es/ies — teoría, banco, tips
- [x] 1.5 Examen semanal del 2 (los 5 temas) y refuerzo del 3 (banco de los 5 temas)
- [x] 1.6 Mover el diagnóstico A1 al repo de datos (con respuestas) y migrar sus resultados de Storage

## 2. Servidor (Deno Deploy)

- [x] 2.1 `server/motor.ts`: tipos opcion/escribir, selección determinista por alumno e intento, calificación, refuerzo
- [x] 2.2 `server/store.ts`: almacén GitHub (con `sha` y reintentos) y almacén en memoria para pruebas
- [x] 2.3 `server/main.ts`: rutas `/data`, `/ingles/data` y `/ingles/actividades…` (el diagnóstico se sirve como examen suelto; `/ingles/examenes` queda solo en Supabase v14)
- [x] 2.4 Pruebas `server/*_test.ts`

## 3. Frontend

- [x] 3.1 `API_BASE` configurable; tarjeta "📚 Esta semana"; filas en el tablero
- [x] 3.2 Vista de actividad: teoría → ejercicios (opción y escribir) → resultado, intento n/2, Reintentar, tips; Meet
- [x] 3.3 Admin: intentos, mejor calificación, temas a reforzar por alumno o alumna; vista previa

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test` y `deno check` de `server/`
- [x] 4.2 Reporte `openspec/changes/tareas-online-semanales/reports/2026-09-28-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local con almacén en memoria y Notion simulado: curl de rutas, intentos, 409 `sin_intentos`, refuerzo
- [x] 5.2 E2E local: semana, teoría, ejercicios, reintento y admin
- [ ] 5.3 Con Deno Deploy configurado: curl y E2E contra producción; migración verificada (conteos iguales)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md`, `docs/data-model.md`, `openspec/project.md` y README: Deno Deploy, repo de datos y formatos
- [x] 6.2 Guía para el usuario: configurar Deno Deploy y el token (paso a paso)
- [ ] 6.3 Commit, push, PR y merge a `main`
