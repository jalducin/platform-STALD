# Reporte Step 6 — Pruebas y verificación de estado

- Fecha: 2026-10-14
- Cambio: karts-pistas-grandes
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/` · `cd tests/calidad && npm run calidad`
- `CHROME=… bash tests/e2e/correr.sh --datos <copia> --puerto-api 9733 --puerto-web 9743 karts karts-vivo partidas juegos categorias emocion`
- Suite E2E completa (`bash tests/e2e/correr.sh --datos <copia> --puerto-api 9731 --puerto-web 9741`) sobre una copia
  exacta del commit (`git archive HEAD`).
- Medición A/B de fps con 8 karts en vivo (`fpsAislado` de `e2e-karts-vivo.js`, 3 corridas seguidas) en `main` y en la
  rama, con la máquina sin otras pruebas.
- Herramientas de diseño (fuera del repo): búsqueda local de los puntos de control con metas de largo, radio,
  separación, recta de meta y caja; dibujo de cada trazado y prueba de humo de las 8 pistas a 390×844 y 844×390.

## Resultados de pruebas
- Deno: 621 pasaron, 0 fallaron, 6 omitidas (las de siempre). Lint: 110 archivos sin avisos.
- Calidad: 317 avisos, igual que `main` (sin avisos nuevos; se partió `prepararPista` y `validarKarts` para no subir la
  complejidad).
- E2E dirigidas: `juegos` 31/31, `categorias` 49/49, `partidas` 15/15, `karts` 223/223, `karts-vivo` 38/38.
- Suite completa: ver «Suite completa» abajo.

### Pistas (Deno, `server/karts_pistas_test.ts`)
| Pista | Largo (veces) | Radio mín. (antes) | Caja | Vueltas | Referencia | Mínimo / límite de sala |
|---|---|---|---|---|---|---|
| Pradera | 11 968 (3.00×) | 125 (118) | 10.4 M px | 2 | 1:59.6 | 29.9 s / 300 s |
| Cañón | 12 664 (3.00×) | 131 (124) | 11.6 | 2 | 2:06.6 | 31.7 s / 320 s |
| Lago Helado | 12 763 (3.00×) | 137 (131) | 11.7 | 2 | 2:07.6 | 31.9 s / 320 s |
| Volcán | 13 257 (3.00×) | 100 (83) | 12.5 | 2 | 2:12.5 | 33.1 s / 340 s |
| Tenochtitlan | 12 364 (3.00×) | 109 (104) | 10.9 | 2 | 2:03.6 | 30.9 s / 310 s |
| Teotihuacan | 12 677 (3.00×) | 102 (92) | 11.0 | 2 | 2:06.7 | 31.7 s / 320 s |
| Chichén Itzá | 12 132 (3.00×) | 139 (120) | 10.2 | 2 | 2:01.3 | 30.3 s / 310 s |
| La Venta | 13 115 (3.00×) | 141 (85) | 11.8 | 2 | 2:11.1 | 32.8 s / 330 s |

### Rendimiento (fps con CPU ×4, E2E `karts`, 390×844)
- Pistas mesoamericanas: Tenochtitlan 59, Teotihuacan 60, Chichén 59, La Venta 59.
- Pistas originales escaladas: Pradera 57, Cañón 55, Lago Helado 58, Volcán 59. Escritorio 59.
- 8 karts en vivo (`karts-vivo`): 60 sin límite y **60 con CPU ×4**; 87 mensajes/s.
- A/B aislado (3 corridas): `main` 60/60, 60/60, 60/60 — rama 60/60, 60/60, 60/60. Las corridas con 8 navegadores a la
  vez en la misma máquina salen contaminadas (30–53 fps también en `main`).
- Preparación de la pista (pintar la textura): 0.4–1.7 s sin límite de CPU (antes 0.15–0.5 s); ocurre durante la cuenta
  regresiva.

## Verificación de estado
- Antes: copia del repo de datos de prueba (`--datos`), sin Postgres (`stald_test_` intactas, no se usan).
- Después: el orquestador trabaja sobre su copia; la original no cambia. No se escribió en tablas `stald_`.
- Estado restaurado: Sí — servidores de prueba apagados y copias temporales fuera del repo.

## Verificación manual (Step 7) — EL AGENTE EJECUTÓ
- Capturas revisadas: las 8 pistas a 390×844 y 844×390 (`karts-grande-*`, `karts-meso-*`), selector con «pista chica»
  (`karts-pista-chica.png`) y minimapa (trazo fino, tramos separados). Ajuste tras revisar: el aviso de récords no
  cabía en una línea de celular → se partió en dos avisos cortos.
- curl local (servidor de pruebas): sala de Karts en el Lago Helado con `ms: 20000` → 400 `carrera_invalida`; progreso
  con `pistasV: 2` y `recordsV1` → 200; con `pistasV: 3` → 400 `progreso_invalido`; sin sesión → 400 `missing_email`.

## Resultado
- Estado Step 6: PASS
- Bloqueos: ninguno
