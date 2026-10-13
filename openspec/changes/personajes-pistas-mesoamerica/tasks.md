## 0. Rama (OBLIGATORIO)

- [x] 0.1 `git fetch` y crear la rama `feature/personajes-pistas-mesoamerica` desde `origin/main` (antes de cualquier
  cambio).

## 1. Pruebas que fallan primero (TDD)

- [ ] 1.1 `server/karts_pistas_test.ts` (nuevo, Deno): carga `juegos/arcade.js`, `juegos/personajes.js` y
  `juegos/karts-pistas.js`:
  - los 8 personajes tienen id, nombre, título, personalidad, peso, partícula, firma, colores de kart y paletas
    `base`/`fuego` válidas; `pintar` dibuja cada pose y poder sin errores (contexto de canvas falso) y
    `piloto(id)` existe para los 4 nuevos; `pintarParticula` dibuja las 4 partículas nuevas;
  - cada pista está cerrada, sin tramos que se crucen (separación ≥ 2·mitad + 40), con curvas manejables (radio ≥ 65)
    y dentro de su textura; el minimapa encaja (escala positiva, todos los puntos dentro del recuadro);
  - las copas tienen 4 pistas existentes cada una y todas las pistas están en alguna copa; ids válidos para el
    validador del servidor; `MAPAS_SALA.karts` es igual a `Arcade.PISTAS`;
  - mecánicas deterministas: turbo en la flecha, factor del lodo, salto que libra el cenote, rescate después del
    cenote, posición de las serpientes en función de `t` y golpe al tocarlas; la masa solo depende del peso.
- [ ] 1.2 Ampliar `tests/e2e/lib/personajes.js` (8 personajes) y `tests/e2e/e2e-plataformas.js`: selector con 8 sin
  desplazamiento a 320×640, 390×844 y 844×390; línea de detalle; elegir a Tona y recargar; cada personaje nuevo
  dibujado (color de firma) y terminando el 1-1; hoja de perfiles con los 8; capturas de cerca.
- [ ] 1.3 Ampliar `tests/e2e/e2e-karts.js`: «🏁 Piloto» con 8 y peso; recordado tras recargar; rivales = los 7 otros;
  cada pista nueva en «Carrera rápida» con descripción; vuelta completa con piloto de prueba (`simular`) en cada pista
  nueva; mecánica de cada pista (turbo, salto con aterrizaje, lodo, serpiente); Copa Mesoamericana (empezar, guardar,
  continuar tras recargar); mismo tiempo con un ligero y un pesado; capturas por pista a 390×844 y 844×390 y de cerca
  de cada personaje nuevo.
- [ ] 1.4 Correr las pruebas y confirmar que lo nuevo falla antes de implementar.

## 2. Implementación

- [ ] 2.1 `juegos/arcade.js`: las 4 pistas (trazado, superficie, descripción, mecánicas) y `COPAS`/`copaPorId`.
- [ ] 2.2 `server/carreras.ts`: los 4 ids en `MAPAS_SALA.karts`.
- [ ] 2.3 `juegos/personajes.js`: Xolo, Tlali, Tona y Kinich (datos, perfil con todas las poses y poderes, encuadre,
  `piloto(id)` de espaldas con su accesorio, `pintarParticula`), `peso`/`personalidad` para los 8, `MASA`.
- [ ] 2.4 `juegos/karts-pistas.js` (nuevo): temas, fondo, adornos, panorama y mecánicas (`preparar`, `paso`, `factor`,
  `moviles`, `pintarSuelo`, marcas del minimapa).
- [ ] 2.5 `juegos/karts.html`: ganchos (temas, fondo, adornos, panorama, zonas, salto, obstáculos, masa en choques),
  copas, menú y carrera rápida por copa, selector de 8 con detalle y peso, cabezas nuevas vía `Personajes.piloto`,
  partículas nuevas, ganchos de prueba (`simular`, `irA`, `sinRivales`).
- [ ] 2.6 `juegos/plataformas.html`: selector de 8 con detalle y partículas nuevas.
- [ ] 2.7 Versiones `?v=` arriba de `main` (`arcade.js`, `personajes.js`, `karts-pistas.js`) en las páginas que los cargan.
- [ ] 2.8 Revisar las capturas de cerca de cada personaje nuevo (Axo y Karts) y de cada pista a 390×844 y 844×390, e
  iterar hasta que se vean del mismo juego y se reconozcan.

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 Revisar que `e2e-karts.js`, `e2e-plataformas.js`, `e2e-mando.js`, `e2e-emocion.js`, `e2e-juegos.js` y
  `e2e-categorias.js` sigan válidas con 8 personajes, 8 pistas y 2 copas (p. ej. «4 tarjetas» → 8; «Copa nueva» →
  botón por copa) y `server/carreras_test.ts` con la lista nueva.

## 4. Ejecutar pruebas y verificar estado (OBLIGATORIO)

- [ ] 4.1 `npx -y deno test -A server/` y `npx -y deno lint server/`.
- [ ] 4.2 E2E: `CHROME=… bash tests/e2e/correr.sh --datos <copia de datos> --puerto-api 9319 --puerto-web 9329 karts
  plataformas mando emocion juegos categorias` (la copia temporal se descarta; no se escribe en tablas `stald_`).
- [ ] 4.3 `cd tests/calidad && npm run calidad` sin avisos nuevos.
- [ ] 4.4 Medir fps con CPU ×4 en cada pista nueva a 390×844 y 844×390.
- [ ] 4.5 Reporte `openspec/changes/personajes-pistas-mesoamerica/reports/2026-10-12-step-4-pruebas-y-verificacion.md`.

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Revisar capturas de cerca: cada personaje nuevo en Axo (quieto, saltando, festejando, champiñón y chile) y en
  Karts (de espaldas en carrera y hoja de vistas); cada pista nueva a 390×844 y 844×390; selectores a 320×640,
  390×844 y 844×390. Corregir lo que no se lea.
- [ ] 5.2 Casos de error: `prefers-reduced-motion` (sin partículas), `arcade_personaje` desconocido → Xalli,
  `copaEnCurso` con copa desconocida → Copa Fiesta, mapa de sala nuevo aceptado por el servidor local.
- [ ] 5.3 Tras el merge: verificar en producción (Pages sirve `karts-pistas.js` y la versión nueva; `/salud` del
  servidor y una sala de Karts con mapa nuevo aceptada).
- [ ] 5.4 Tras el merge (usuario): que el profe los pruebe en un celular real.

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: personajes (8, peso, `piloto`, `pintarParticula`), pistas y copas
  (`arcade.js`, `karts-pistas.js`, mecánicas y ganchos). `docs/data-model.md`: copa `mesoamerica` y pistas nuevas en
  el progreso de Karts (mismo formato).
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate personajes-pistas-mesoamerica --strict`.

## 7. Cierre

- [ ] 7.1 Commits en español; integrar `origin/main` (conservando los dos lados), PR, `gh pr checks --watch`, merge,
  borrar la rama remota y verificar producción.
- [ ] 7.2 No archivar: espera la prueba del profe. Después: `openspec archive personajes-xalli` y luego
  `openspec archive personajes-pistas-mesoamerica`.
