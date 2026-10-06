## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/examen-autoguardado` desde `main`

## 1. Pruebas primero (TDD)

- [x] 1.1 Examen de prueba `sec-e2e-guardado` (opción múltiple y escrita, exclusivo de `valeria`) en
  `tests/fixtures/datos/contenido/secundaria/` y en la semana de prueba
- [x] 1.2 `tests/e2e/e2e-autoguardado.js` y registrarla en `ORDEN` y `fase_de` (fase `ingles`) de `correr.sh`
- [x] 1.3 `tests/e2e/e2e-login.js`: ayuda «¿No te llegó?» y botón de reenvío con cuenta regresiva (portal y Juegos)
- [x] 1.4 Correrlas y confirmar que fallan antes de implementar

## 2. Autoguardado (`ingles/reproductor.js`, `ingles/app.js`, `ingles/ingles.css`)

- [x] 2.1 Clave con hash corto, lectura/escritura con `try/catch`, caducidad de 14 días
- [x] 2.2 Guardar en `updateExamProgress`; restaurar al final de `openItem` (radio, escrita, pronunciación; ignora
  ids ausentes y fijas); aviso «Recuperamos…» y modo paso en la primera sin contestar
- [x] 2.3 Borrar al enviar con éxito, al abrir un intento posterior o un elemento terminado, y al cerrar sesión
- [x] 2.4 Avisos «Tu avance se guarda solo en este aparato ✔» y «Guardado hace un momento»
- [x] 2.5 `html.examen-abierto` con `overscroll-behavior-y: contain` y `beforeunload` con respuestas sin enviar

## 3. «¿No te llegó?» (`comun/auth.js`, `index.html`)

- [x] 3.1 `StaldAuth.ayudaReenvio(el, correo)`: ayuda, botón, espera de 60 s y resultado
- [x] 3.2 Usarla en `pintarEntrada` → `paso2` y en `pasoCodigo` del portal

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Revisar que el examen nuevo del fixture no cambie lo que comprueban `examen-secundaria` y `portal`, y que
  `beforeunload` no rompa las pruebas que navegan con un examen abierto

## 5. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [x] 5.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [x] 5.2 E2E: `autoguardado` y regresión `examen-secundaria`, `segunda-oportunidad`, `ruta-profe`, `alta-alumnos`,
  `pronunciacion`, `profe-diseno`, `login`, `login-despues`, `portal`, `juegos` (puertos 8827/8805)
- [x] 5.3 Verificar que la copia de datos original no cambió (correr.sh trabaja sobre una copia temporal)
- [x] 5.4 Reporte en `openspec/changes/examen-autoguardado/reports/2026-10-05-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 UI: la E2E recorre el flujo real en Chromium a 390 px (contestar, recargar con confirmación, restaurar,
  volver, enviar) y la pantalla del código con reenvío; revisar las capturas
- [x] 6.2 Casos de error: borrador caducado, id inexistente en el borrador, reenvío antes de la espera

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md`: autoguardado del reproductor (claves de `localStorage`, excepción a «no
  guardar datos personales») y ayuda de reenvío del enlace
- [x] 7.2 `docs/pruebas.md`: `window.__REENVIO_SEGUNDOS` y el examen `sec-e2e-guardado` del fixture, si aplica

## 8. Producción (tras el merge, la integra el coordinador)

- [ ] 8.1 Verificar en GitHub Pages: abrir un examen, contestar, recargar y ver las respuestas restauradas
- [ ] 8.2 `openspec archive examen-autoguardado`
