## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/navegacion-mejoras` desde `main` actualizado (PR 1); cada PR siguiente en su rama
  `feature/navegacion-mejoras-<parte>` desde `main` con el PR anterior ya fusionado

## 1. PR 1 · Misión principal de Secundaria

- [x] 1.1 TDD: pruebas Deno de `SecundariaDatos.misionPrincipal` en `server/secundaria_tablero_test.ts` (atrasada antes
  que hoy, hoy antes que adelantar, adelantar antes que bloqueada, bloqueada solo si no hay nada abierto, la de ayer que
  vence hoy, `dia` futuro abierto, todo hecho) — fallan antes de implementar
- [x] 1.2 `misionPrincipal(items, hoy)` en `comun/secundaria-datos.js` y su uso en `ingles/secundaria-inicio.js` con el
  motivo en la tarjeta; `?v=` en `ingles.html`
- [x] 1.3 E2E `secundaria-dashboard`: la misión esperada sale de `SD.misionPrincipal` (con el fixture, «Fracciones»,
  atrasada del jueves 22) y un caso dibujado sin datos: atrasada antes que bloqueada
- [x] 1.4 Propuesta aparte (sin implementar) `openspec/changes/navegacion-rendimiento/proposal.md`: carga perezosa de
  Juegos y peticiones del panel del profe

## 2. PR 2 · Entregas en la barra del profe

- [x] 2.1 `barra: true` en `entregas` (`ingles/comun.js`), `pintarNav()` en el orden del catálogo y contador
  `data-contador-entregas` repintado al llegar la bandeja (`ingles/app.js`, `ingles/secundaria-misiones.js`,
  `ingles/ingles.css`); `?v=`
- [x] 2.2 E2E: `ingles-admin` (Entregas en la barra a 360 px, contador = `pendientes`, sin scroll horizontal) y
  `navegacion-dispositivos` (tope de «profe-grupos» 7 → 6; también en el spec de `navegacion-dispositivos`)

## 3. PR 3 · Secundaria: barra inferior en celular y pestañas en una fila

- [x] 3.1 Barra `.sec-barra` y menú `#sec-mas` (`ingles/secundaria.js`), estilos y hueco (`ingles/secundaria.css`),
  fila de pestañas desde 720 px en una sola fila (`.sec-tabs-muchas` con 9); `?v=`
- [x] 3.2 Ayudante E2E `tests/e2e/lib/secundaria.js` (`irPestanaSec`: fila, barra o «Más»); E2E que tocan pestañas a
  360 px (`misiones`, `secundaria-adelantar`, `secundaria-clases`, `navegacion-dispositivos`) lo usan;
  `navegacion-dispositivos` revisa la barra a 360 px (sin tapar, 44 px, «Más», atrás) y las 9 pestañas del profe en
  una fila a 1100 px

## 4. PR 4 · Pruebas: fixture propio de «🌍 Mundos» y Dibuja estable

- [ ] 4.1 `tests/fixtures/profe-plan-9-mundos.json` y `ingles-diseno-profe`: 9 mundos con su fixture (interceptado en
  su navegador) y, con el plan compartido, los de `mapaRuta`
- [ ] 4.2 `server/salas_grandes_test.ts`: valores y llaves en lugar de texto suelto, más un caso fijo con «reloj»

## 5. Verificación (OBLIGATORIO)

- [ ] 5.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): las de 1.1, 1.3, 2.2, 3.2, 4.1 y 4.2
- [ ] 5.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): `deno test -A server/`, `deno check`, `deno lint`,
  `openspec validate navegacion-mejoras --strict` y E2E `navegacion-dispositivos`, `secundaria-clases`,
  `secundaria-clase`, `secundaria-dashboard`, `secundaria-adelantar`, `examen-secundaria`, `misiones`, `ingles-admin`,
  `ingles-diseno-profe`, `peticiones` y `portal-diseno` (puertos 9021/9022, copia temporal de datos, PostgREST falso
  solo `stald_test_*`, `--hoy 2026-10-27` y el hoy por omisión según la prueba); reporte
  `openspec/changes/navegacion-mejoras/reports/2026-10-22-step-5.2-pruebas-y-verificacion.md`
- [ ] 5.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): Playwright a 360, 768, 1100 y 1280 px: misión
  principal con atrasada, barra de Secundaria (alumna y profe), Entregas con contador, 9 pestañas en una fila; capturas
  fuera del repo
- [ ] 5.4 Actualizar documentación técnica (OBLIGATORIO): `docs/frontend-standards.md` (barra de Secundaria, pestañas,
  Entregas en la barra, misión principal) y `docs/pruebas.md` (ayudante de pestañas, fixture de Mundos)
- [ ] 5.5 Verificación en producción tras cada merge — EL AGENTE EJECUTA (OBLIGATORIO): Pages sirve los JS y CSS
  nuevos (`?v=`) con 200 y las páginas públicas cargan (solo lectura, sin sesión)
- [ ] 5.6 `openspec archive navegacion-mejoras` cuando el profe lo pruebe en su celular
