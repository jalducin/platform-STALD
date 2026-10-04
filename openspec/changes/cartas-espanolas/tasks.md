## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/cartas-espanolas`

## 1. Motor (TDD)

- [x] 1.1 Escribir en rojo las pruebas de baraja española, Brisca y Conquián en `server/cartas_test.ts`
- [x] 1.2 Implementar en `juegos/cartas.js` hasta que las pruebas pasen a verde

## 2. Servidor

- [x] 2.1 Agregar pruebas y código para:
  - `brisca` y `conquian` en el catálogo y en partidas;
  - `validarJugada` por juego.

## 3. Frontend

- [x] 3.1 Cartas españolas y Brisca individual
- [x] 3.2 Conquián individual: selección de cartas, destino y avisos de jugada inválida
- [x] 3.3 En partida: `estadoCartasSala` genérico, pintar y clics de Brisca y Conquián
- [x] 3.4 Agregar `AYUDA.brisca` y `AYUDA.conquian`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Correr la suite completa y dejarla en verde
- [x] 4.2 Actualizar los conteos del hub en los E2E y correr las regresiones de partidas

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 Correr `deno test`, `check` y `lint`
- [x] 5.2 Correr el E2E `e2e-cartas-espanolas`:
  - individual de los dos juegos;
  - Brisca en partida con dos navegadores;
  - Conquián en partida.
- [x] 5.3 Escribir el reporte en `openspec/changes/cartas-espanolas/reports/2026-10-03-step-5-pruebas-y-verificacion.md`

## 6. Verificación en producción — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 6.1 Verificar en producción:
  - probar los dos juegos en individual sin terminar la partida, para no guardar puntos;
  - abrir una sala de Brisca con bots;
  - borrar la sala.

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 Actualizar `docs/frontend-standards.md`, `docs/backend-standards.md` y `docs/data-model.md`

## 8. Ajuste post-apply del profe: Brisca en sala siempre con 4

- [x] 8.1 Servidor: en rojo y luego en verde:
  - cupo de 4;
  - `bots: true` al crear la sala.
- [x] 8.2 Página: `participantes()` completa con bots hasta 4 y la casilla de bots se oculta.
- [x] 8.3 E2E: sala con 2 personas y 2 bots en parejas; regresiones.
- [ ] 8.4 Verificar en producción; actualizar la documentación y el reporte.
