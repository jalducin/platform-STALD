## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/revision-profe-plegar` desde `main`

## 1. Página

- [x] 1.1 `ingles/secundaria-revision.js`: cabecera de la tarjeta como botón `rev-plegar` (`aria-expanded`), cuerpo
  `data-rev-cuerpo` con `hidden`, `data-plegada` en `rev-tarjeta`, plegado por omisión (sin abrir y revisadas), línea
  con estado corto y «Final N», botón general `rev-plegar-todo` con `localStorage` en `try/catch`
- [x] 1.2 `ingles/secundaria.css`: estilos de `.rev-plegar` (≥ 44 px), `.rev-cuerpo[hidden]`, `.rev-modo`; `?v=` en
  `ingles.html` (`secundaria-revision.js` 3, `secundaria.css` 16)

## 2. Verificación (OBLIGATORIO)

- [x] 2.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E `revision-profe` con revisada plegada que se
  despliega al tocarla, pendientes desplegadas, control ≥ 44 px, «Mostrar todo» recordado tras recargar y «Plegar
  revisadas»; los `data-testid` actuales sin cambio
- [x] 2.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): `revision-profe`, `navegacion-dispositivos`, `peticiones`,
  `examen-secundaria` y `secundaria-*` en puertos 9121/9122 con copia temporal de datos (sin tablas `stald_*`);
  reporte `openspec/changes/revision-profe-plegar/reports/2026-10-26-step-2.2-pruebas-y-verificacion.md`
- [x] 2.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): con Playwright, capturas en celular 360, tablet 768 y
  PC 1280 en claro y oscuro; la E2E restaura las revisiones del fixture
- [x] 2.4 Actualizar documentación técnica (OBLIGATORIO): `docs/frontend-standards.md` («📋 Revisión»)
- [x] 2.5 `openspec validate revision-profe-plegar --strict` y `revisor-solo-lectura`
- [ ] 2.6 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO), solo lectura: los `?v=` nuevos
  se sirven en Pages y `/salud` responde

## 3. Cierre

- [ ] 3.1 `openspec archive revision-profe-plegar` después de archivar `revision-profe`, cuando el profe lo pruebe en su
  celular
