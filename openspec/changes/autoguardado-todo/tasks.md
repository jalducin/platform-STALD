## 0. Rama (OBLIGATORIO)

- [x] 0.1 Step 0: rama `feature/autoguardado-todo` desde `main`

## 1. Auditoría

- [x] 1.1 Revisar cada flujo de respuesta (clase por pasos, actividad, examen, refuerzo, reto del Meet, ruta del profe,
  misiones de texto de Secundaria e Inglés, libreta) y anotar el estado antes en `proposal.md`

## 2. Servidor (TDD)

- [x] 2.1 Pruebas que fallan: `server/borrador_misiones_test.ts` y el paso en `server/borrador_test.ts`
- [x] 2.2 `PUT /misiones/<id>/borrador`, `borrador` en `GET /misiones`, quitar el borrador al entregar y en «Borrar todas
  sus entregas» (`server/misiones.ts`)
- [x] 2.3 Retención: `aplicarRetencionBorradores` en `server/retencion_entregas.ts` y en el cron de `server/main.ts`
- [x] 2.4 `paso` opcional en `PUT …/borrador` y en el `borrador` del GET del intento (`server/actividades.ts`)

## 3. Páginas

- [x] 3.1 Misiones (`ingles/secundaria-misiones.js`): copia local + cuenta con espera de 2.5 s, al salir del cuadro, al
  ocultar la pestaña y al volver la red; gana la cuenta salvo texto local sin subir (que se sube solo); subidas en orden; la entrega espera al borrador en camino; indicador y «Reintentar»
- [x] 3.2 Reproductor (`ingles/reproductor.js`): paso en el borrador, guardar al cambiar de paso, restaurar el paso,
  indicador «Guardando… / 💾 Guardado hace N s / Reintentar», aviso 409 de otro navegador, cerrar sesión borra
  también los borradores de misiones
- [x] 3.3 `ingles/app.js`: reabrir `#ver/<id>` al recargar; `openItem` ignora respuestas tardías; `?v=` en `ingles.html`

## 4. Verificación (OBLIGATORIO)

- [x] 4.1 Revisar y actualizar pruebas existentes (OBLIGATORIO): E2E nueva `autoguardado-todo` (fixtures de prueba en
  `tests/fixtures/datos`) registrada en `tests/e2e/correr.sh`; `autoguardado` y `ordenar-emparejar` con el indicador y
  el paso nuevos
- [x] 4.2 Ejecutar pruebas y verificar estado (OBLIGATORIO): suite Deno y E2E de la fase `ingles` (y `peticiones`) con
  puertos 9071/9072 y copia temporal de datos (sin tablas `stald_*`); reporte
  `openspec/changes/autoguardado-todo/reports/2026-10-24-step-4.2-pruebas-y-verificacion.md` (también la 4.3)
- [x] 4.3 Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO): con Playwright, cada flujo (contestar parcial → recargar →
  otro navegador → no calificado → enviar → limpio), dos navegadores y misión sin red; restaurar estado (reinicios y
  borrado de entregas de prueba)
- [x] 4.4 Actualizar documentación técnica (OBLIGATORIO): `docs/backend-standards.md`, `docs/data-model.md`,
  `docs/frontend-standards.md`, `docs/pruebas.md`, `privacidad.html` y la skill `ai-specs/skills/clases-secundaria` (+ espejos)
- [x] 4.5 `openspec validate autoguardado-todo --strict`, `verificador-pruebas` y `revisor-solo-lectura`
- [ ] 4.6 Verificación en producción tras el merge — EL AGENTE EJECUTA (OBLIGATORIO), solo lectura: `/salud`, la ruta
  nueva sin sesión responde 401/403 y los `?v=` nuevos se sirven

## 5. Cierre

- [ ] 5.1 `openspec archive autoguardado-todo` (consolida los deltas en `openspec/specs/`)
