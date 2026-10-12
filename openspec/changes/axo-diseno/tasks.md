## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/axo-diseno` desde `origin/main` (tras `git fetch`)
- [ ] 0.2 Capturas de antes (390 px y escritorio: título, mapa, un nivel por mundo y jefe) desde `origin/main`

## 1. Dibujo del juego

- [ ] 1.1 Tamaño del canvas: `VH`/`OY` (cielo y subsuelo en celular vertical) y cachés por `K`
- [ ] 1.2 Tiles pre-dibujados por tipo, mundo, lados expuestos y variante (borde, sombra y textura) y subsuelo
- [ ] 1.3 Fondos con paralaje por mundo (pradera, desierto, hielo, volcán) y castillos; movimiento reducido sin paralaje
- [ ] 1.4 Axo: dibujo, poses (caminar, saltar, caer, aterrizar, daño, victoria, perder) y variantes de poder
- [ ] 1.5 Monedas que giran, cajas, banderas, lava, ítems, bolas de fuego, enemigos por mundo y jefe con barra de vida
- [ ] 1.6 Partículas: polvo, chispas de moneda, confeti y ambiente por mundo (nada con movimiento reducido)

## 2. Mapa, HUD y botones

- [ ] 2.1 Mapa: escena SVG por mundo con camino, nodos, castillo, Axo en el nivel que sigue, candados y tira de 12
- [ ] 2.2 HUD en fichas y botones táctiles con íconos; `#mandos` oculto fuera del nivel; portada con Axo

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 3.1 `tests/e2e/e2e-plataformas.js`: mismos selectores; capturas por mundo (1-1, 2-1, 3-1, 4-1 y jefe) y del
  mapa (con avance y «Próximamente») a 390 px y en escritorio; comprobación de que el HUD no tapa el nivel a 390 px

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 4.1 E2E `plataformas juegos dragon-run` con la copia de datos de prueba (puertos 8907/8885); la copia se
  descarta al terminar (estado restaurado)
- [ ] 4.2 Reporte `openspec/changes/axo-diseno/reports/2026-10-11-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Abrir el juego suelto a 390×844 y 1280×800, recorrer los 4 mundos, el jefe y el mapa, y comparar las
  capturas de antes y después; revisar `prefers-reduced-motion` y que no haya errores JS
- [ ] 5.2 Medir el costo de dibujo por cuadro (promedio de `dibujar`) a 390 px para confirmar margen para 60 fps

## 6. Documentación (OBLIGATORIO)

- [ ] 6.1 `docs/frontend-standards.md`: nota del dibujo de Arcade (cachés fuera de pantalla, `VH`/`OY`, movimiento
  reducido)
- [ ] 6.2 `npx -y @fission-ai/openspec@1.4.1 validate axo-diseno --strict`

## 7. Cierre

- [ ] 7.1 Commits en español; sin push, PR ni merge (los hace el usuario). Tras el merge: `openspec archive`
