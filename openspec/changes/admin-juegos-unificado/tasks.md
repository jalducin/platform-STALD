## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/admin-juegos-unificado` desde `origin/main`

## 1. Pruebas primero (TDD, E2E en rojo)

- [ ] 1.1 `e2e-jugadores.js`: pestaña «🛡️ Admin», 4 pestañas en la barra, contadores, sub-secciones, buscador
  (coincidencias y «Nada coincide»), enlace de un pendiente, sub-sección guardada, tarjetas sin scroll horizontal a
  390 px y alumna sin pestaña; capturas a 390×844 y 1280×800
- [ ] 1.2 `e2e-juegos.js` (invitados y CSV), `e2e-avatar-foto.js` (Fotos y quitar) y `e2e-nick.js` (nick en Jugadores)
  con la pestaña nueva
- [ ] 1.3 Correrlas y confirmar que fallan antes de implementar

## 2. Frontend (`juegos.html`)

- [ ] 2.1 Barra de 4 pestañas y traducción de los ids viejos a `admin`
- [ ] 2.2 `pintarAdmin`: carga en paralelo, contadores, sub-secciones con `role="tablist"` y teclado, buscador,
  resumen `aria-live`, CSV por sub-sección y `localStorage.juegos_admin_sub`
- [ ] 2.3 Listas: tabla con encabezado fijo en escritorio y tarjetas en celular; pendientes con enlace (copiar /
  WhatsApp); fotos con quitar; estados de carga, error, vacío y sin coincidencias
- [ ] 2.4 Revisar las capturas (celular y escritorio, claro) y ajustar la estética

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Buscar en `tests/e2e` cualquier uso de `data-tab="jugadores|invitados|fotos"` y actualizarlo

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/` y `npx -y deno lint server/` (salida completa)
- [ ] 4.2 E2E: `jugadores juegos avatar-foto nick login portal partidas juegos-recarga`
- [ ] 4.3 Reporte en `openspec/changes/admin-juegos-unificado/reports/2026-10-06-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 UI local con Playwright: recorrer las 4 sub-secciones como admin a 390 px y en escritorio, buscador, error
  simulado de una fuente con «Reintentar», y alumna sin pestaña; revisar las capturas
- [ ] 5.2 Producción (tras el merge, integrador): abrir `juegos.html` publicada como admin y ver «🛡️ Admin» con sus
  contadores; como alumna, sin la pestaña

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: menú «🛡️ Admin» de `juegos.html` y la clave `juegos_admin_sub`, sin duplicar

## 7. Archivo

- [ ] 7.1 `openspec archive admin-juegos-unificado` tras la verificación en producción (integrador)
