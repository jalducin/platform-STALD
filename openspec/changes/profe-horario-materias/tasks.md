## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/profe-horario-materias` desde `main`

## 1. Reglas puras (TDD)

- [x] 1.1 `server/profe_horario_test.ts` primero (falla sin el módulo): materia de respaldo por prefijo, nivel y título;
  `materia` manda; catálogo; estados; fechas y días de oficina de `plan.diasOficina`; tareas del plan y del grupo;
  semana; progreso con y sin `plan.materias` (arreglo, objeto y forma del repo `{ materia, elementos, inicio, fin }`);
  agrupación por materia y línea
- [x] 1.2 `comun/profe-horario-datos.js` (`globalThis.ProfeHorario`) hasta pasar las pruebas
- [x] 1.3 Clases en vivo (rama `fix/horario-meets`): prueba primero en `server/profe_horario_test.ts` (falla sin el
  cambio): un meet (`tipo: "meet"` o prefijo `meet-`) lleva `meet: true`, `hora` y `meetUrl`; su estado es `proxima`
  o `impartida`, nunca `vencida`; queda fuera de `progresoPorMateria` y de `contables`; `meet-` → Inglés por respaldo.
  Después, `ProfeHorario` hasta pasar

## 2. Vista

- [x] 2.1 `ingles/profe-horario.js`: pestañas «🗓️ Mi horario» (semana por días, hoy, 🏢 del plan, flechas y «Hoy»,
  reglas, estados vacíos, progreso) y «🧭 Por materia» (materias y líneas plegables); filtro compartido recordado
- [x] 2.2 `ingles/profe-horario.css`: colores por materia en claro y oscuro, container queries, 44 px, foco visible,
  microanimaciones con `prefers-reduced-motion`
- [x] 2.3 `ingles/profe.js`: pestañas `horario` y `materias` solo con plan; encabezado desde `plan.titulo` /
  `plan.subtitulo` con respaldo «🍥 Mi propio camino ninja»; `index.html`: texto de la tarjeta «Mi ruta»
- [x] 2.4 `ingles.html`: `profe.js?v=6`, `comun/profe-horario-datos.js?v=1`, `ingles/profe-horario.js?v=1`,
  `ingles/profe-horario.css?v=1`
- [x] 2.5 Clases en vivo en la vista: etiqueta «🎥 Clase en vivo», hora y liga «Abrir Meet» en lugar del botón; estados
  «🎥 Próxima» y «✓ Impartida» con contraste AA en claro y oscuro; fuera de los conteos de chips, cupo del día y
  líneas; `ingles.html`: `comun/profe-horario-datos.js?v=2`, `ingles/profe-horario.js?v=2`, `ingles/profe-horario.css?v=2`

## 3. Verificación (OBLIGATORIO)

- [x] 3.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `profe-horario` con fixture propio
  (`tests/fixtures/profe-horario.json`, con `diasOficina`, título, subtítulo y reparto) a 360, 768 y 1280 px en claro y
  oscuro; `profe-diseno` cuenta 8 pestañas con ruta propia; registro en `tests/e2e/correr.sh`
- [x] 3.1b Fixture y E2E `profe-horario` con un meet pasado («✓ Impartida») y uno futuro («🎥 Próxima», hora y liga);
  progreso y chips sin contarlos
- [x] 3.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): `npx -y deno test -A server/` y E2E `ruta-profe`,
  `profe-diseno`, `ingles-diseno-profe`, `profe-horario` y `navegacion-dispositivos` en puertos propios con copia
  temporal de datos (sin tablas `stald_*`); reporte
  `openspec/changes/profe-horario-materias/reports/2026-11-02-step-3.2-pruebas-y-verificacion.md`
- [x] 3.2b Re-ejecutar 3.2 con las clases en vivo (Deno completo y E2E de la ruta del profe) y actualizar el reporte
- [x] 3.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): servidor local con una copia de los datos reales
  (`HOY_FIJO=2026-11-02`) y capturas de «Mi horario» y «Por materia» a 360, 768 y 1280 px en claro y oscuro; solo
  lectura (la copia se borra al terminar)
- [x] 3.4 Actualizar documentación técnica (OBLIGATORIO): `docs/data-model.md` (`materia`, `plan.materias`,
  `materiaDelGrupo`, `diasOficina`), `docs/frontend-standards.md` (vista del profe, también las clases en vivo) y
  `docs/pruebas.md`
- [x] 3.5 `openspec validate profe-horario-materias --strict`
- [ ] 3.6 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO), solo lectura: Pages sirve los
  `?v=` nuevos de `ingles.html`

## 4. Cierre

- [ ] 4.1 `openspec archive profe-horario-materias` cuando el profe lo pruebe en su celular
