## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/ingles-diseno-profe` desde `origin/main` (add2a99)

## 1. Frontend

- [x] 1.1 `ingles/panel-profe.css` (nuevo): botones, campos y encabezado de 44 px, superficies RPG, encabezado del
  panel, tarjetas por grupo, mapa de calor y tablas como tarjetas abajo de 640 px, Registro, Grupos y ruta del profe
- [x] 1.2 `ingles/tablero.js`: `#panel-profe` (grupos activos, alumnos y alumnas, «En riesgo» con botones al cajón y
  accesos), tarjetas por grupo con avance y «🔍 Ver grupo», `data-label` en el mapa de calor, repintado al llegar el
  resumen
- [x] 1.3 `ingles/admin.js`: Registro como tarjetas (grupo, «🚪 Baja de Inglés», Quitar, Reactivar), etiquetas
  visibles en el alta y en grupos, «🎥 Meet» como botón
- [x] 1.4 `ingles.html`: enlace a `panel-profe.css?v=1`; `admin.js?v=3`, `tablero.js?v=3`

## 2. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 2.1 Revisar los selectores de las E2E de admin/profe (`alta-alumnos`, `baja-ingles`, `material`, `profe-grupo`,
  `ruta-profe`, `profe-diseno`, `presentar`, `grupos`, `ingles-pro`): se conservan ids, `data-action`, `data-baja`,
  `.ultimas-lista`, `#bajas-ingles`, `select.mover-grupo` y `#mapa-calor tr[data-alumno]`
- [x] 2.2 E2E nueva `ingles-diseno-profe` (fase `ingles`, registrada en `tests/e2e/correr.sh`): encabezado, tarjetas
  por grupo (GET de grupos interceptado en el navegador), mapa de calor como tarjetas, Registro, cajón, «Ver grupo»,
  44 px y sin scroll a 360 px en las 9 secciones, claro y oscuro, ruta del profe con el Plan del mes (27 abiertas) y
  capturas de escritorio

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test -A server/`, `deno check server/main.ts`, `deno lint server/` y la suite E2E completa con una copia
  temporal del repo de datos (puertos 8951/8952; subagente `verificador-pruebas`). Sin tablas `stald_` y sin push de
  datos. Comparar con la línea base de `main`
- [x] 3.2 Reporte `openspec/changes/ingles-diseno-profe/reports/2026-10-22-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 4.1 Revisar las capturas a 360 px en claro y oscuro (Resumen, Registro, cajón, ruta y Plan del mes) y en
  escritorio
- [ ] 4.2 Producción tras el merge, solo lectura: `/salud`; `ingles.html` publica `panel-profe.css?v=1`,
  `admin.js?v=3` y `tablero.js?v=3`

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/frontend-standards.md` (panel del profe) y `docs/pruebas.md` (E2E nueva). `docs/backend-standards.md`
  no cambia (no cambia el contrato)

## 6. Cierre

- [ ] 6.1 `openspec archive ingles-diseno-profe` después de la verificación en producción
