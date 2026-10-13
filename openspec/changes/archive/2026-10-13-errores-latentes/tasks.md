## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `fix/errores-latentes` desde `origin/main` (el profe pidió el prefijo `fix/`
  para este sprint de errores)

## 1. Artefactos

- [x] 1.1 proposal, design, delta de `juegos` y tasks; `openspec validate errores-latentes --strict`

## 2. Errores 1 y 2 y el mismo patrón en el servidor (TDD)

- [x] 2.1 Prueba Deno `server/salas_escritura_test.ts` con un almacén que falla a propósito (unirse, empezar, crear y
  revancha): ver que falla con el código actual
- [x] 2.2 `server/salas.ts`: unirse, empezar (reintentos, sala ya empezada, sala inexistente), crear (borra la sala si
  el anfitrión no se guardó) y revancha responden 503 `conflicto_escritura`; prueba en verde
- [x] 2.3 Página: mensajes claros en `juegos/app/salas.js` (unirse, crear, revancha) y `juegos/app/arranque.js`
  (empezar, botón activo otra vez); E2E con `page.route` en `e2e-ajustes-salas`: primero en rojo, luego en verde

## 3. Error 3: Batalla naval sin `jugadas` (TDD)

- [x] 3.1 E2E en `e2e-juegos-tablero` (sala de naval): un disparo cuya respuesta llega sin `jugadas` no da error JS y
  el tablero sigue; ver que falla con el código actual
- [x] 3.2 `juegos/tablero-ui.js`: `(r.body.jugadas || []).at(-1)`; E2E en verde

## 4. Error 4: Cálculo y secuencias (TDD)

- [x] 4.1 Prueba Deno `server/mente_calculo_test.ts` (`NaN`, negativo, `undefined`, texto, `aleatorio` inválido y
  misma salida con semilla para `n` válido); ver que falla con el código actual
- [x] 4.2 `juegos/app/individuales.js`: validar `n` y `aleatorio` en `genCalculo` y `genSecuencia`; prueba en verde

## 5. Mismo patrón y versiones

- [x] 5.1 Revisar otras rutas que ignoren `guardarJugador`/`store.put` y otros `clic*` que asuman campos; corregir lo
  de bajo riesgo y listar el resto en design.md §9
- [x] 5.2 Merge de `origin/main` (sprints 24a y 24b si ya entraron) y subir el `?v=` de cada script cambiado en
  `juegos.html` por encima de `main`

## 6. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 6.1 Revisar `server/salas_test.ts` y las E2E de salas: ningún caso esperaba `ok` con una escritura fallida

## 7. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 7.1 `npx -y deno test -A server/`, `deno check server/main.ts` y `deno lint server/`
- [x] 7.2 `cd tests/calidad && npm run calidad` sin avisos nuevos
- [x] 7.3 E2E: `juegos categorias partidas juegos-tablero ajustes-salas salas-grandes revancha enlace-sala` y las de
  Cálculo (`fusion`, `juegos-recarga`, `puntos-tipo`) con una copia de datos de prueba (se descarta al terminar:
  estado restaurado; nunca se escribe en tablas `stald_`)
- [x] 7.4 Reporte `openspec/changes/archive/2026-10-13-errores-latentes/reports/2026-10-12-step-7-pruebas-y-verificacion.md`

## 8. Verificación manual (OBLIGATORIO) — EL AGENTE EJECUTA

- [x] 8.1 Servidor local: `curl` a crear, unirse y empezar (casos válidos, sala inexistente, sin sesión y no
  anfitrión) y comprobar códigos y cuerpos
- [x] 8.2 Tras el merge a `main`: verificar en producción (`/salud`, `?v=` publicados en Pages y las rutas de salas
  sin sesión) que el despliegue tiene el cambio

## 9. Documentación técnica (OBLIGATORIO)

- [x] 9.1 `docs/backend-standards.md`: 503 `conflicto_escritura` en crear, unirse, empezar y revancha; 404 en empezar
- [x] 9.2 Revisar `docs/pruebas.md` y el inventario de documentación si se agregan pruebas nuevas

## 10. Publicación y archivo

- [x] 10.1 PR en español, `gh pr checks --watch` hasta que terminen todos, merge y borrar la rama remota
- [x] 10.2 `openspec archive errores-latentes` en un PR aparte; merge cuando pasen sus checks
