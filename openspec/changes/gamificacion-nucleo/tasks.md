## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/gamificacion-nucleo` desde `origin/main`

## 1. Módulo de gamificación

- [x] 1.1 Pruebas que fallan (`server/gamificacion_test.ts`): XP (bonus, 🎯 al doble, sin calificación), XP total,
  nivel y rango (con y sin género), mundos por fecha, mapa de mundos, insignias, `insigniaNueva`, retos diarios,
  actividad reciente, materia y día de la clase
- [x] 1.2 `comun/gamificacion.js` (script clásico, `globalThis.Gamificacion`)

## 2. Servidor

- [x] 2.1 Pruebas que fallan: el envío responde `aTiempo`; el listado trae `mejorATiempo` del mejor intento (tardío
  → `false`) y `null` sin intentos
- [x] 2.2 `server/actividades.ts`: `mejorATiempo(r)` en el listado y `aTiempo`/`mejorATiempo` en el `POST`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar las pruebas de actividades y Secundaria: los campos son aditivos (ninguna compara la respuesta
  completa); sin cambios

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/`
- [x] 4.2 Reporte `openspec/changes/gamificacion-nucleo/reports/2026-10-21-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Servidor local con una copia temporal del repo de datos y `HOY_FIJO=2026-10-27`: la alumna del fixture
  envía una clase (`aTiempo: true`) y el listado trae `mejorATiempo`; correo sin Secundaria 403; sin sesión 401. La
  copia se borra al terminar (sin push de datos, sin tablas `stald_`)
- [ ] 5.2 Producción tras el merge, solo lectura: `/salud` y `comun/gamificacion.js` publicado en Pages

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` § «Gamificación» (reglas, fuente única) y `docs/backend-standards.md`
  (`mejorATiempo`, `aTiempo`)

## 7. Cierre

- [x] 7.1 Revisión `revisor-solo-lectura` y sus hallazgos atendidos (base de XP con `correctas`/`total`, rotación de
  Sociales, «Programación e IA» juntas, fechas derivadas documentadas, pruebas de la vista del admin)
- [ ] 7.2 PR, checks y merge
- [ ] 7.3 `openspec archive gamificacion-nucleo` (junto con `secundaria-dashboard`, cuando el profe lo indique)
