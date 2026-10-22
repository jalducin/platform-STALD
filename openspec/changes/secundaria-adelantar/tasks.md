## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/secundaria-adelantar` (worktree aparte, desde `main`)

## 1. Reglas y servidor

- [x] 1.1 Pruebas que fallan (`server/secundaria_adelantar_test.ts`): `diaDeClase` con `dia`; retos, «Hoy te toca»,
  estados, horario y progreso con clases abiertas por adelantado; hecha antes a tiempo; `validateItem` con `dia`;
  `--secundaria` con apertura antes del lunes; Inglés sin cambios; `/secundaria/actividades` e `/ingles/actividades`
  con `dia` y la semana siguiente ya abierta
- [x] 1.2 `diaDeClase` (`comun/gamificacion.js`, una línea) y `?v=2` en `ingles.html` e `index.html`
- [x] 1.3 `Item.dia` y `validateItem` (`server/motor.ts`); `erroresApertura` (`server/semana.ts`); comentario de
  `server/validar_semana.ts`
- [x] 1.4 `meta` con `dia` y `visibleItems` con las semanas futuras ya abiertas en Secundaria (`server/actividades.ts`)

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Las pruebas de `diaDeClase` existentes siguen igual (compatibilidad sin `dia`)
- [x] 2.2 E2E nueva `secundaria-adelantar` (registrada en `tests/e2e/correr.sh`, fase `ingles`) con el fixture
  `tests/fixtures/datos/contenido/secundaria/semanas/2026-10-19.json` (3 clases `sec-adelanta-*` que abren el 21)

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/` (subagente `verificador-pruebas`)
- [x] 3.2 E2E `secundaria-adelantar` con `--hoy 2026-10-22` (puertos 8921/8922) y las de Secundaria con
  `--hoy 2026-10-27`, con una copia temporal del repo de datos. Sin escribir en tablas `stald_` y sin push de datos
- [x] 3.3 Reporte `openspec/changes/secundaria-adelantar/reports/2026-10-22-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Validador CLI `--secundaria` con la semana del fixture (0 errores) y casos inválidos en las pruebas
- [ ] 4.2 Producción tras el merge, solo lectura: `/salud` y `comun/gamificacion.js?v=2` publicado con `it.dia`

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/data-model.md` (campo `dia`), `docs/frontend-standards.md` § «Gamificación» y tablero,
  `docs/backend-standards.md` (listado) y `docs/pruebas.md` (E2E nueva)
- [x] 5.2 Skill `ai-specs/skills/clases-secundaria/SKILL.md` con la regla de fechas y
  `node ai-specs/scripts/sincronizar-espejos.mjs`

## 6. Cierre

- [x] 6.1 Revisión `revisor-solo-lectura` y sus hallazgos atendidos (reporte, prueba de Inglés con semana futura
  abierta, «Otras clases» y total por materia en spec, docs y E2E)
- [ ] 6.2 Merge de `main`, PR, checks y merge
- [ ] 6.3 `openspec archive secundaria-adelantar` (cuando el profe lo vea en el celular)
