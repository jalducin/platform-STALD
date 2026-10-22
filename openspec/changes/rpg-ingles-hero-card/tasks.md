## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/rpg-ingles-hero-card` desde `main` actualizado (con #232 y #233)

## 1. Implementación

- [x] 1.1 Pruebas que fallan (`server/misiones_ingles_test.ts`): aviso `misiones` (antes y después de abrir, otro grupo,
  admin, almacén caído), entrega de un alumno de Inglés con el motor, bandeja del profe con `ambito: "ingles"`, pasos
  entregados → 20 puntos de constancia
- [x] 1.2 `server/misiones.ts`: `hayMisionesVisibles` y `pasosEntregados` (aditivas); `server/actividades.ts` y
  `server/main.ts`: campo `misiones` y `pasosMision` del ranking
- [x] 1.3 Página: «⚔️ Misiones», tarjeta en Inicio, XP con misiones y «📥 Entregas» del admin, reusando
  `ingles/secundaria-misiones.js`; `?v=` nuevos
- [x] 1.4 Misión de ejemplo para E2E (`tests/fixtures/datos/contenido/ingles/misiones/`), validada con 0 errores

## 2. Verificación (OBLIGATORIO)

- [x] 2.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `misiones-ingles` (fase `ingles`); se
  corren `rpg-ingles`, `misiones` y `secundaria-dashboard`
- [x] 2.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno, `deno check`, `deno lint` y E2E con copia
  temporal (8915/8916); reporte `openspec/changes/rpg-ingles-hero-card/reports/2026-10-22-step-2.2-pruebas-y-verificacion.md`
- [x] 2.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): la E2E recorre como alumna con misión, alumno sin
  misión y profe (entregar, evaluar, ver XP); sin escribir en `stald_*`
- [ ] 2.4 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO): Pages publica los `?v=`
  nuevos, `/salud` y que `/ingles/actividades` no tenga errores (solo lectura; la misión real abre el 2026-11-09)
- [x] 2.5 Actualizar documentación técnica (OBLIGATORIO): `docs/frontend-standards.md` y `docs/backend-standards.md`
