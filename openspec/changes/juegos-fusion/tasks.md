## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-fusion`

## 1. Pruebas primero

- [x] 1.1 Escribir pruebas en rojo y confirmarlas en rojo:
  - salas rechazan los juegos absorbidos (`juego_no_permitido`) y aceptan los fusionados;
  - los títulos del catálogo cambian;
  - `cultura.json` tiene las categorías `ia` y `tecnologia`, con 6, 6 y 4 preguntas válidas.

## 2. Implementación

- [x] 2.1 Servidor: `JUEGOS_PARTIDA` sin los juegos absorbidos y títulos del catálogo actualizados
- [x] 2.2 `juegos.html`:
  - menú con los juegos fusionados;
  - modo individual mezclado;
  - en partida, las preguntas se reparten entre las fuentes.
- [x] 2.3 `cultura.json`: 32 preguntas nuevas, con un dato cada una

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Actualizar en `salas_test` la sala de `en-preguntas`, que ahora debe dar 400
- [x] 3.2 Actualizar los conteos del menú en los E2E (21 juegos) y correr las regresiones

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 Correr `deno test`, `check` y `lint`
- [x] 4.2 E2E `e2e-fusion`:
  - mezcla en los tres juegos;
  - categorías nuevas;
  - partida de Ortografía con preguntas mixtas.
- [x] 4.3 Escribir el reporte `openspec/changes/juegos-fusion/reports/2026-10-03-step-4-pruebas-y-verificacion.md`

## 5. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 En producción, revisar el menú con 21 juegos y las categorías nuevas, solo lectura y sin terminar
  partidas

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 Actualizar `docs/backend-standards.md` (juegos permitidos y catálogo) y `docs/frontend-standards.md`
