## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/panel-profe-peticiones` desde `main` actualizado (98a91d3, con #247 de
  `navegacion-mejoras` ya fusionado)

## 1. Línea base

- [x] 1.1 Medir el panel con el código de `main`: peticiones, orden y cascadas, y tiempo hasta usable en celular
  (Slow 4G, CPU 4×) y PC; servidor local en 9041/9042, PostgREST falso en 9043 (`stald_test_*`), copia temporal del
  repo de datos; reporte `reports/2026-10-22-linea-base.md`

## 2. Servidor

- [ ] 2.1 TDD: `server/panel_main_test.ts` (rojo antes de implementar): admin 200 con las cuatro partes y sin correos;
  alumna 403; sin sesión 401; `?grupo=` y `?ocultos=1` llegan al resumen; falla parcial (entregas, resumen y grupos
  caídos por separado → 200, parte con `error`, `fallas`, las demás completas); sin Postgres `grupos.error =
  "sin_base"` sin falla; `/ingles/data?incluir=panel` del admin trae `panel` y el de la alumna no
- [ ] 2.2 `server/panel.ts` (`armarPanel`, `handlePanel`) y en `server/main.ts` la ruta `/ingles/panel` y
  `incluir=panel` en `/ingles/data` (panel en paralelo con las filas)

## 3. Página del admin

- [ ] 3.1 `ingles/app.js`: `loadFor` pide `/ingles/data?incluir=panel` y aplica el panel; sin `panel` (servidor
  viejo) cae al camino de antes; carga perezosa en `aplicarRuta` (Registro, Juegos, Alumnos, Entregas)
- [ ] 3.2 `ingles/admin.js`: `aplicarPanel`, `refrescarPanel` (`/ingles/panel`), `cargarRegistroAdmin` (lista con
  correos solo en Registro, repinta solo la lista), juegos bajo demanda (`#juegos-admin`, `[data-juegos-slot]`,
  cajón), ocultar/mostrar grupo con una petición
- [ ] 3.3 `ingles/tablero.js`: `cargarResumen` sin pedir la bandeja; aviso `#panel-avisos` con «🔄 Reintentar»;
  cajón pide juegos
- [ ] 3.5 Merge de `main` (#248–#250, contador de «📥 Entregas» en la barra) y un solo dato para «📥 Por revisar» y el
  contador: `entregas: { pendientes, ingles, secundaria }` en el panel (`server/panel.ts`, pruebas Deno), `conteoEntregas()`
  en `tablero.js` y `entregasPendientes()` en `app.js`, desglose «Inglés N · Secundaria M» (`ingles/panel-profe.css`);
  E2E `ingles-admin` (contador = mosaico; 2 listas y caída simuladas en el panel) e `ingles-diseno-profe`
- [ ] 3.4 `?v=` de los scripts tocados en `ingles.html`

## 4. Pruebas E2E

- [ ] 4.1 `peticiones`: tope de «inglés (admin)» al número real medido y ninguna petición a las rutas perezosas
- [ ] 4.2 `ingles-admin`: el resumen caído se simula en la respuesta del panel (falla parcial) y «🔄 Reintentar»
  pide `/ingles/resumen`; aviso por sección con grupos caídos
- [ ] 4.3 `ingles-diseno-profe`: los dos grupos de ejemplo se inyectan en la parte `grupos` del panel; Registro espera
  su lista
- [ ] 4.4 `ocultar-grupos` y `puntos-tipo`: abren «🎮 Juegos» / «➕ Registro» antes de leerlos

## 5. Verificación (OBLIGATORIO)

- [ ] 5.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): las de 2.1 y 4.1–4.4
- [ ] 5.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): `deno test -A server/`, `deno check server/main.ts`,
  `deno lint server/`, `openspec validate panel-profe-peticiones --strict` y E2E `peticiones`, `ingles-admin`,
  `ingles-diseno-profe`, `ocultar-grupos`, `misiones`, `rpg-ingles`, `navegacion-dispositivos`, `portal-diseno` y el
  resto de la fase `ingles` (puertos 9041/9042, copia temporal de datos, PostgREST falso solo `stald_test_*`) con
  `verificador-pruebas`; `stald_test_*` vacía al terminar; reporte
  `openspec/changes/panel-profe-peticiones/reports/2026-10-22-step-5.2-pruebas-y-verificacion.md`
- [ ] 5.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): `curl` a `/ingles/panel` (admin 200 sin correos,
  alumna 403, sin sesión 401, `?grupo=`) y a `/ingles/data?incluir=panel`; medición después con el mismo script de la
  línea base (celular y PC) en el reporte
- [ ] 5.4 Actualizar documentación técnica (OBLIGATORIO): `docs/backend-standards.md` (ruta `/ingles/panel`,
  `incluir=panel`), `docs/frontend-standards.md` (carga del panel y pestañas perezosas), `docs/pruebas.md` (tope de
  `peticiones` y E2E actualizadas) y estado de `openspec/changes/navegacion-rendimiento/proposal.md`
- [ ] 5.5 Revisión `revisor-solo-lectura` y PR en español; `gh pr checks --watch`, merge y borrar la rama
- [ ] 5.6 Verificación en producción (solo lectura) — EL AGENTE EJECUTA (OBLIGATORIO): Pages sirve los `?v=` nuevos
  con 200 y `GET /ingles/panel` sin sesión responde 401
- [ ] 5.7 `openspec archive panel-profe-peticiones` cuando el profe lo pruebe en su celular
