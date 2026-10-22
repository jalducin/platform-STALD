## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `fix/ingles-admin-error-ocultar` desde `main` actualizado (#240)

## 1. Reproducción

- [x] 1.1 Copia limpia del repo de datos y servidor local (8981) con «hoy» 2026-10-22, sin y con PostgREST falso: el
  resumen responde 200 con lecturas sanas; `/ingles/resumen` no llama a Notion
- [x] 1.2 Revisión estática de `ingles.html`: 19 scripts clásicos sin nombres globales repetidos; producción con el
  servidor al día (`/config` trae `interruptores` de #240)

## 2. Resumen que no se cae

- [x] 2.1 Pruebas primero (rojo): `server/resumen_resiliente_main_test.ts` (Notion caído → 200 sin llamadas a Notion;
  timeout en una columna → 200 con aviso; grupos caídos → 200 con aviso; `detalle` del admin; marcar Secundaria con
  Notion caído)
- [x] 2.2 `server/resumen.ts`: reintento por columna, columna fuera y `avisos`; grupos que fallan → sin filtro y aviso
- [x] 2.3 `server/main.ts`: `detalle` solo para el admin en el 500 genérico; la ruta en el registro

## 3. Botón en la tarjeta del grupo

- [x] 3.1 E2E primero (rojo con el `tablero.js` de `main`): `tests/e2e/e2e-ingles-admin.js` y su lugar en `correr.sh`
- [x] 3.2 `ingles/tablero.js`: «👁️ Ocultar del panel» / «👁️ Mostrar en el panel» en cada tarjeta; tarjetas sin
  esperar al resumen; `#resumen-error` con motivo y «🔄 Reintentar»; `#resumen-avisos`; `?v=7` en `ingles.html`
- [x] 3.3 `e2e-ocultar-grupos`: selectores acotados a `#grupos-admin`
- [x] 3.4 `e2e-ingles-diseno-profe`: acepta «Nv. N» (etiqueta de #240) en el rango de la ruta RPG

## 4. Verificación (OBLIGATORIO)

- [x] 4.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): ver 2.1, 3.1 y 3.3
- [x] 4.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): Deno (`test`, `check`, `lint`), E2E de Inglés con y sin
  `--pg` (PostgREST falso, puertos 8981/8982, copia temporal, sin `stald_*` reales) con `verificador-pruebas`; reporte
  `openspec/changes/fix-ingles-admin/reports/2026-10-22-step-4.2-pruebas-y-verificacion.md`
- [x] 4.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): `curl` a `/ingles/resumen` en local (sano, con
  `?grupo=`, alumna 403) y producción en solo lectura (`?v=` de `ingles.html` contra los archivos publicados, sin 404)
- [x] 4.4 Actualizar documentación técnica (OBLIGATORIO): `docs/backend-standards.md` (contrato del resumen y
  `detalle`), `docs/frontend-standards.md` (tarjetas y avisos) y `docs/pruebas.md` (`ingles-admin`)
