## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/secundaria-mis-clases` (worktree aparte, desde `main`)

## 1. Validador

- [x] 1.1 Pruebas que fallan (`server/secundaria_clases_test.ts`): `--secundaria` valida una semana de 2/3 clases por día
  sin avisos de patrón; examen mensual con ventana sin error; `materia` inválida es error; `materia` desconocida es
  aviso; sin la bandera se lee `contenido/semanas/`
- [x] 1.2 `validateItem` (`server/motor.ts`) con `materia`; `validarSemana` con `AMBITO_SECUNDARIA` (`server/semana.ts`);
  bandera `--secundaria` en `server/validar_semana.ts`

## 2. Servidor

- [x] 2.1 Prueba que falla: `/secundaria/actividades` deja pasar `materia` y no la inventa si falta
- [x] 2.2 `meta` (`server/actividades.ts`) incluye `materia`; `Item.materia` en `server/motor.ts`

## 3. Frontend

- [x] 3.1 `ingles/secundaria.js`: «📚 Mis clases» con «☀️ Hoy», «📅 Esta semana» por día y «📝 Otras clases y
  exámenes»; chip y color por materia; materia deducida del título; pestaña «🗓️ Mi horario»
- [x] 3.2 `ingles/ingles.css`: colores por materia (claro/oscuro) y horario responsive (7 columnas / lista a 360 px)
- [x] 3.3 Títulos en `ingles/comun.js` y `ingles/app.js`; enlace «📚 Mis clases» en `secundaria.html`; `?v=` en
  `ingles.html`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 `e2e-examen-secundaria`: título y enlace nuevos
- [x] 4.2 E2E nueva `e2e-secundaria-clases` con fixture `tests/fixtures/datos/contenido/secundaria/` (semana
  2026-10-26, varias materias y días) y `--hoy 2026-10-27`: «Hoy» con 2 clases, horario de 7 días, sin scroll
  horizontal a 360 px, modo oscuro; registrar en `tests/e2e/correr.sh`

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test -A server/` (subagente `verificador-pruebas`), `deno check server/main.ts`, `deno lint server/`
- [x] 5.2 Validador `--secundaria` sobre las semanas de Secundaria de la copia de datos: 0 errores
- [x] 5.3 E2E `secundaria-clases` y `examen-secundaria` con la copia temporal de datos (sin push de datos, sin
  escribir en tablas `stald_`); revisar capturas PNG
- [x] 5.4 Reporte `openspec/changes/secundaria-mis-clases/reports/2026-10-21-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Servidor local con la copia y `?hoy=2026-10-27`: admin 200 con `materia`, alumna de Secundaria 200 solo
  con lo suyo, correo sin Secundaria 403, sin sesión ni correo 401, exclusivo ajeno 404; CLI `--secundaria` con caso válido e inválido
- [ ] 6.2 Producción tras el merge, solo lectura: `/salud`, `ingles.html` con `secundaria.js?v=` nuevo y
  `secundaria.html` con «📚 Mis clases»

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/data-model.md` (`materia`, `--secundaria`), `docs/frontend-standards.md` (vista de Secundaria),
  `docs/backend-standards.md` (comando del validador) y `docs/pruebas.md` (E2E nueva)

## 8. Cierre

- [ ] 8.1 Revisión `revisor-solo-lectura`, PR, checks y merge
- [ ] 8.2 `openspec archive secundaria-mis-clases` (tras verificar en celular, cuando el profe lo indique)
