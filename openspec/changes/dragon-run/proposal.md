## Why

El profe pidió (2026-10-02) agregar **Dragon Run**, un juego individual. Dejó una versión propia en
`juegos/datos/Dragon Run.html`, un runner en canvas, y pidió mejorarlo si se puede.

## What Changes

- **Juego nuevo `dragon-run`** en Juegos → Mente ágil ("Dragon Run · Corre, salta y llega al castillo"), basado en
  la versión del profe:
  - el dragón dibujado a mano, 3 vidas, monedas, obstáculos (roca, tronco, picos, slime) y el castillo a 600 m;
  - la música chiptune y el récord local.
- **Mejoras:**
  - **integración con la plataforma**: se abre dentro de Juegos (`juegos/dragon-run.html` en un iframe del mismo
    origen) y, al terminar, guarda los puntos en **⭐ individuales** con la pantalla de resultado de siempre;
  - **doble salto** (un salto extra en el aire);
  - **bono de +200** por llegar al castillo;
  - el juego **conserva su propia música** (pedido del profe); la música de fondo de Juegos se pausa mientras se
    juega y vuelve al salir;
  - corrección: el primer clic en JUGAR durante los primeros 400 ms tras cargar se ignoraba (el antirrebote
    empezaba en 0); ahora solo evita el doble clic;
  - la música del juego se pausa si la pestaña se oculta.
- **Puntos:** metros + monedas × 10 (+ 200 si gana). **Servidor:** `dragon-run` en `CATALOGO` (categoría `mente`,
  tope 2000).
- El archivo se mueve de `juegos/datos/` (que es solo para JSON de datos) a `juegos/dragon-run.html`.

## Capabilities

### Modified Capabilities
- `juegos`: juego individual Dragon Run.

## Impact

- `juegos/dragon-run.html` (nuevo, a partir del archivo del profe), `juegos.html`, `server/juegos.ts` y pruebas.
- Acciones externas: redeploy y publicación en GitHub Pages; verificación en producción.
