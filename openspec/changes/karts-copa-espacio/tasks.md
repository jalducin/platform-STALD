## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/karts-copa-espacio` desde `origin/main`

## 1. Datos y reglas (TDD)

- [x] 1.1 Prueba que falla: `server/karts_espacio_test.ts` (4 pistas cerradas, manejables y del tamaño de las
  grandes; mecánicas sobre el camino y lejos de la meta; marcas de borde; caída y rescate; portales deterministas que no
  saltan la mitad de la vuelta; plataformas y compuertas; minimapa; ids válidos; límites por pista; copa, `nivel` y
  desbloqueo; bots más rápidos; salas y copa de sala)
- [x] 1.2 `juegos/karts-pistas.js`: 4 pistas espaciales, Copa del Espacio con `nivel` y `requiere`, `colocarMecanicas`
  con `f`/`tramo`/`salida` y funciones puras (`marcasEspacio`, `ladoPlataforma`, `aperturaCompuerta`, `rescateEn`,
  `copaDesbloqueada`, `copasOrdenadas`)
- [x] 1.3 `juegos/arcade.js`: `ritmoBots` en el tiempo de los fantasmas; `juegos/karts-copa.js`: copas de sala
  derivadas (la mixta por id); `server/carreras.ts`: `MAPAS_SALA.karts` derivado; `juegos/app/salas.js`: opciones de
  copa derivadas

## 2. Juego (karts.html + karts-espacio.js)

- [x] 2.1 `juegos/karts-espacio.js`: piso (vacío, camino translúcido, neón, huecos, rampas, gravedad, portales,
  compuertas, turbo y antiturbo), sprites y cielo de 360° de las 4 pistas
- [x] 2.2 Física: barandal, caída, dron de rescate, huecos con rampa, gravedad baja, plataformas (parche de textura),
  antiturbo, portales, compuertas y rocas; bots que siguen plataformas y compuertas
- [x] 2.3 Menú y selector por `nivel`, Copa del Espacio con desbloqueo, pintura dorada con las 4 de la Copa Fiesta,
  minimapa con tramos abiertos, banderas en vivo de caída y remolque, audio, ganchos de prueba

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `server/karts_pistas_test.ts`, `server/karts_copa_test.ts`, `server/carreras_test.ts` con las copas y pistas
  nuevas (sin fijar listas)
- [x] 3.2 `tests/e2e/e2e-karts.js`: selector con las copas en orden, cada pista espacial (mecánica, vuelta completa con
  el piloto de prueba con una caída y su rescate, portal, fps con CPU ×4, capturas a 390×844 y 844×390), copa bloqueada
  y Copa del Espacio dentro de Juegos; `tests/e2e/e2e-karts-vivo.js`: sala en una pista espacial con fps de 8 karts

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `deno lint` y `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 4.2 E2E `karts karts-vivo juegos categorias` con la copia de datos de prueba (`correr.sh` trabaja sobre una copia
  temporal y la borra: estado restaurado; nunca se escribe en tablas `stald_`); fps con la máquina lo más quieta posible
- [x] 4.3 Reporte `openspec/changes/karts-copa-espacio/reports/2026-10-17-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas de cada pista a 390×844 y 844×390, una caída al vacío y un portal, e iterar hasta que
  se vean espectaculares y se lean bien
- [ ] 5.2 Cuando el profe apruebe y se publique: abrir `juegos/karts.html` publicado y confirmar que carga
  `karts-espacio.js` y las 4 pistas

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` (pistas espaciales, mecánicas, `karts-espacio.js`, `nivel` y desbloqueo)
- [x] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate karts-copa-espacio --strict`

## 7. Publicación

- [ ] 7.1 Subir `?v=` de los scripts cambiados, mezclar `origin/main` (conservar ambos lados con el sprint 34), PR en
  español y esperar todos los checks. La revisión y la publicación las decide el profe (sin archivar)
