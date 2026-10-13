## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/karts-pistas-mesoamericanas` desde `origin/main`

## 1. Datos de pistas (TDD)

- [x] 1.1 Prueba que falla: `server/karts_pistas_test.ts` (8 pistas, trazados cerrados sin cruces y con radio de giro
  manejable, mecánicas dentro de la pista, minimapa encuadrado, copas con 4 pistas que existen, salas con las 4
  originales)
- [x] 1.2 `juegos/karts-pistas.js` con las 8 pistas, las copas, `encuadrarMinimapa`, `colocarMecanicas`, `colocarFijos` y `ladoTrajinera`; `juegos/arcade.js` lee
  de ahí (`PISTAS` de sala y `pistaPorId` de todas); `juegos.html` y `karts.html` lo cargan antes de `arcade.js`

## 2. Pistas nuevas en Karts

- [x] 2.1 `karts.html` toma `TEMAS` y el escenario de `KartsPistas`; minimapa con `encuadrarMinimapa`
- [x] 2.2 Textura del piso: lago y chinampas, calzada roja, sacbé y cenote, selva, río y lodo
- [x] 2.3 Adornos nuevos y adornos fijos por tramo (cabezas de serpiente, muros del juego de pelota, cabezas colosales)
- [x] 2.4 Cielo de 360° con la silueta de cada pista
- [x] 2.5 Mecánicas: trajinera, rampas de velocidad, salto sobre el cenote y lodo
- [x] 2.6 Copa Mesoamericana (menú, continuar, resultados) y selector de pistas por copa con descripción

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `tests/e2e/e2e-karts.js`: selector con 8 pistas y descripciones, vuelta completa con el piloto de prueba en
  cada pista nueva, cada mecánica, Copa Mesoamericana (empieza en La Venta y continúa tras recargar), fps con CPU ×4
  por pista y capturas de cerca a 390×844 y 844×390

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 4.2 E2E `karts juegos categorias emocion` con la copia de datos de prueba (`correr.sh` trabaja sobre una copia
  temporal y la borra: estado restaurado; nunca se escribe en tablas `stald_`)
- [x] 4.3 Reporte `openspec/changes/karts-pistas-mesoamericanas/reports/2026-10-12-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas de cada pista nueva a 390×844 y 844×390 e iterar hasta que se reconozcan y se vean bien
- [ ] 5.2 Tras el merge: abrir `juegos/karts.html` publicado y confirmar que carga `karts-pistas.js` y las 8 pistas

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (pistas en `juegos/karts-pistas.js`, mecánicas y copas)
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-pistas-mesoamericanas --strict`

## 7. Publicación

- [x] 7.1 Subir `?v=` de los scripts cambiados, mezclar `origin/main`, PR en español, esperar los checks, merge y
  borrar la rama remota (sin archivar)
