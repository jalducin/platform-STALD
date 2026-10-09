## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y cambiar a `feature/meet-sin-reto`

## 1. Servidor

- [x] 1.1 Prueba que falla en `server/meet_material_test.ts`:
  - el admin abre el material de un Meet sin reto;
  - la alumna recibe 400;
  - `tieneMaterial` en la lista.
- [x] 1.2 `server/actividades.ts`: `tieneMaterial` en `meta` y GET del material sin reto para el admin

## 2. Página

- [x] 2.1 `ingles/comun.js`, `ingles/tablero.js` e `ingles/presentacion.js`: «🎬 Presentar» y «📋 Guion» con
  `tieneReto || tieneMaterial`; «👁 Reto» y «Probar el reto» solo con reto

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Actualizar la prueba con datos reales «clase del domingo» (`server/actividades_test.ts`); las E2E
  `presentar`, `profe-diseno` y `pronunciacion` pasan sin cambios

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 4.1 `deno test -A server/`, `deno lint server/` y las E2E de Inglés
- [x] 4.2 Reporte en `openspec/changes/meet-sin-reto/reports/2026-10-09-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [ ] 5.1 Datos: quitar el reto de `meet-2026-10-04` y `meet-2026-10-11` en el repo de datos; abrir en local, como
  admin y como alumna, la semana con los datos reales

## 6. Documentación técnica (OBLIGATORIO)

- [x] 6.1 `docs/data-model.md` (campos del Meet) y skill `nueva-semana-ingles` (Meet sin reto y Tecnología e IA;
  copia en `.claude/skills`)
- [ ] 6.2 PR, CI, merge y archivo
