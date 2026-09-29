## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/nueva-semana-ingles`

## 1. Servidor

- [x] 1.1 Prueba que falla: una semana futura con examen no aparece antes de su lunes (`server/semana_test.ts`)
- [x] 1.2 `visibleItems`: los exámenes sueltos son los que no referencia ninguna semana
- [x] 1.3 Pruebas del validador con datos inline (sin contenido privado): lunes, examen bloqueado, archivo faltante, fecha distinta, refuerzo, correo, banco corto
- [x] 1.4 `server/semana.ts` (`validarSemana`) y CLI `server/validar_semana.ts`

## 2. Skill y repo de datos

- [x] 2.1 `ai-specs/skills/nueva-semana-ingles/SKILL.md` con el flujo y las reglas de contenido; copia real en `.claude/skills` (Windows, base-standards §6)
- [x] 2.2 Generadores de la semana 1 en el repo privado (`herramientas/semana-2026-09-28/`) y README del repo de datos

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test` (con y sin `DATA_DIR`), `deno check` y `deno lint` de `server/`; copia de la skill idéntica a `ai-specs`
- [x] 3.2 Reporte `openspec/changes/nueva-semana-ingles/reports/2026-09-28-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 CLI contra la semana 1 real (código 0) y contra una copia alterada (código 1 con los errores esperados)
- [x] 4.2 Servidor local con una semana futura de prueba: curl con `hoy` antes y después del lunes; borrar la semana de prueba
- [ ] 4.3 Tras el merge: curl a producción, la lista sigue igual (6 elementos de la semana 1 + diagnóstico)

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` (validador y semanas por adelantado), `docs/data-model.md` y README (flujo semanal)
- [ ] 5.2 Commit, push, PR y merge a `main`
