## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/cartas-espanolas-diseno`

## 1. Pruebas que fallan (TDD)

- [x] 1.1 `e2e-cartas-espanolas.js`: `aria-label` con el nombre, número en las dos esquinas, palo dibujado, figura
  con nombre, dorso en el mazo y en los rivales, y la mano sin desbordar a 390 px (Brisca y Conquián); correr y ver
  que fallan

## 2. Implementación

- [x] 2.1 Sprite SVG de palos y figuras; `esCarta` con esquinas, puntos y figuras; tamaños con `--w`
- [x] 2.2 Dorso con patrón, `.es-mazo` (pila con contador) y `.es-dorsos` de los rivales
- [x] 2.3 Mano en abanico (`esManoHtml`) con superposición que se ajusta al ancho; estados jugable, seleccionada,
  triunfo y deshabilitada
- [x] 2.4 Animación de llegada a la mesa (`esNuevas`) y `prefers-reduced-motion`
- [x] 2.5 Capturas de Brisca y Conquián (390×844 y escritorio, claro y oscuro), revisarlas e iterar

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Revisar los selectores que usan `conquian-estres`, `clasicos`, `ritmo`, `ajustes-salas`, `juegos` y
  `juegos-recarga`; conservarlos

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `npx -y deno test -A server/` y `npx -y deno lint server/`
- [x] 4.2 E2E `cartas-espanolas conquian-estres clasicos ritmo juegos juegos-recarga` con `correr.sh` (copia de
  datos, sin tocar el original)
- [x] 4.3 Reporte en `openspec/changes/cartas-espanolas-diseno/reports/2026-10-07-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Revisar las capturas en celular y escritorio, claro y oscuro (mano, mesa, mazo, dorsos, figuras)
- [ ] 5.2 Producción: tras el merge, abrir la página publicada y jugar una Brisca y un Conquián (integrador)

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/frontend-standards.md`: diseño de la carta española (enlaza a este `design.md`)

## 7. Archivo

- [ ] 7.1 `openspec archive cartas-espanolas-diseno` (integrador)
