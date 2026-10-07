## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/poker-fichas` desde `origin/main`

## 1. Motor y servidor (TDD)

- [x] 1.1 `server/cartas_test.ts` en rojo: 500 fichas por omisión, ciegas 5/10 → 10/20 → 20/40, pozo empatado en
  múltiplos de 5, subida no múltiplo de 5 rechazada (salvo todo), 200 partidas de bots con pilas en múltiplos de 5
- [x] 1.2 `server/poker_sala_test.ts` en rojo: `subir` sin monto o con monto no múltiplo de 5 → `jugada_invalida`;
  montos compuestos con fichas (p. ej. 135 = 100 + 20 + 10 + 5) aceptados
- [x] 1.3 `juegos/cartas.js`: `FICHAS_INICIALES`, `FICHA`, `CIEGAS` nuevas, reparto de 5 en 5 y validación de la
  subida; `server/salas.ts`: `validarJugada` del póker

## 2. Página (`juegos.html`)

- [x] 2.1 Selector de fichas: botón «⬆️ Subir», fichas CSS de 5/10/20/50/100 con `aria-label`, aumento y apuesta
  visibles, «↺ Limpiar», «✅ Apostar», fichas deshabilitadas al exceder, mínimo legal y animación
- [x] 2.2 Pilas de fichas en el pozo y en la apuesta de cada asiento
- [x] 2.3 500 fichas en individual y sala (`Cartas.FICHAS_INICIALES`), puntos fichas × 2 ÷ jugadores, textos de la
  portada y de «📖 Cómo se juega»; subir `?v=` de `juegos/cartas.js`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 `tests/e2e/e2e-poker.js` en rojo y luego en verde: 500 fichas y ciegas 5/10 a la vista, selector de
  fichas (aumento acumulado, deshabilitadas al exceder, Limpiar, Apostar con el mínimo) en individual y una subida
  con fichas en la sala; capturas 390×844 y escritorio
- [x] 3.2 Revisar `e2e-ritmo.js`, `e2e-juegos.js`, `e2e-partidas.js`, `e2e-juegos-recarga.js` y
  `e2e-ajustes-salas.js` por textos o selectores del póker que cambien

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/`, `npx -y deno lint server/` (salida completa) y
  `npx -y deno check server/main.ts`
- [x] 4.2 E2E con `correr.sh --puerto-api 8897 --puerto-web 8875 poker ritmo juegos partidas juegos-recarga
  ajustes-salas` sobre una copia de los datos (sin tocar el original); revisar las capturas
- [x] 4.3 Reporte en `openspec/changes/poker-fichas/reports/2026-10-07-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 UI: recorrer en el navegador (E2E con capturas) el selector a 390×844 y en escritorio; casos de error:
  fichas que exceden deshabilitadas, «✅ Apostar» deshabilitado bajo el mínimo
- [x] 5.2 API: el servidor local rechaza `subir` con monto no múltiplo de 5 y sin monto (pruebas de
  `poker_sala_test.ts` contra `handleJuegos`)
- [ ] 5.3 Producción (integrador, tras el merge): abrir `juegos.html` publicada, comprobar 500 fichas y el selector

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md` («Juegos de cartas»): fichas iniciales, ciegas, múltiplos de 5 y selector de
  fichas (enlazando este `design.md`)

## 7. Cierre

- [ ] 7.1 `openspec archive poker-fichas` (integrador)
