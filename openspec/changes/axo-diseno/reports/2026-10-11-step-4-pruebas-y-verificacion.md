# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: axo-diseno
- Agente: Claude (Opus 5.5)

## Comandos ejecutados
- `bash tests/e2e/correr.sh --datos <copia de datos de prueba> --puerto-api 8907 --puerto-web 8885 plataformas juegos dragon-run`
- `node capturas.js <raíz> <salida>` (scratchpad, fuera del repo): capturas del juego suelto a 390×844 y 1280×800,
  primero en `origin/main` (antes) y luego en la rama (después)
- `node verif.js <raíz> <salida>` (scratchpad): costo de dibujo a 390×844 con dpr 3 y `prefers-reduced-motion`
- `npx -y @fission-ai/openspec@1.4.1 validate axo-diseno --strict`

## Resultados de pruebas
- Dirigidas (`plataformas`): 31 pasaron, 0 fallaron, 0 omitidas (antes 22 pasos; se agregan escena del mapa,
  «Próximamente», recorrido de 4 mundos y jefe a 390 px y en escritorio, HUD fuera del nivel, botones debajo del
  juego y costo de dibujo).
- Regresión (`juegos`, `dragon-run`): 28 y 9 pasaron, 0 fallaron.
- Duración: 3 min 30 s.
- El servidor no cambió: no aplica `deno test` ni `deno lint`.

## Verificación de estado
- Antes: la carpeta de datos de prueba se usa solo como origen; `correr.sh` trabaja sobre una copia temporal.
- Después: la copia se descarta al terminar; la carpeta original no se modificó.
- Estado restaurado: Sí — sin acciones extra (no se toca Postgres, Supabase, Notion ni producción).

## Verificación manual (EL AGENTE EJECUTA)
- Capturas antes/después revisadas (título, mapa del mundo 1 con avance, mapa del mundo 6, niveles 1-1, 2-1, 3-1,
  4-1 y jefe 4-3, a 390 px y en escritorio), más las de la E2E dentro de `juegos.html`:
  - Antes: Axo rectángulo rosa pixelado, pasto y tierra planos, colinas por columnas, en celular vertical el nivel
    era una franja al centro con espacio vacío; mapa con tres botones en fila.
  - Después: Axo ajolote con branquias, ojos, sonrisa y cola (champiñón más grande con manchas, fuego en tono coral
    con flamita); cielo con sol, nubes, dunas, montañas nevadas con aurora, volcán con humo y lava, castillo con
    ventanas, estandartes y antorchas; tiles con borde, sombra y textura; enemigos con cara y detalle por mundo; jefe
    con corona y barra de vida; en celular el nivel llena la pantalla con cielo y subsuelo y el HUD queda sobre el
    cielo; mapa con escena ilustrada, camino, nodos, castillo, Axo en el nivel que sigue y tira de los 12 mundos.
  - Ajustes hechos tras revisarlas: capas cercanas que quedaban tapadas por el piso, tira de mundos que se partía a
    360 px, candado de «Próximamente» encima del camino, aviso del nivel que aparecía detrás del mapa, mapa apretado
    en pantallas bajas.
- `prefers-reduced-motion: reduce` en los 5 niveles: 0 partículas de ambiente y 0 efectos (sin reducir: 12–40 motas
  según el mundo); sin errores JS.
- Costo de dibujo (promedio móvil de `dibujar`) a 390×844, dpr 3 (K = 5): 0.6–1.0 ms por cuadro; en la E2E 0.72 ms.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
