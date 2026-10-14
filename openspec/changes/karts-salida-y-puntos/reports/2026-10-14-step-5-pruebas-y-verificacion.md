# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-14
- Cambio: karts-salida-y-puntos
- Agente: Claude Code (Opus 5.5)

## Causa confirmada

1. **Salían lejos**: la parrilla ya era compacta en píxeles (filas a 40 px, lados ±0.42 del medio ancho: las muestras
   de la pista van cada 8 px también en las pistas grandes). Lo que separaba los karts era la **hora de salida de cada
   aparato**: (a) el desfase con el servidor salía de la última respuesta, con `ahora` sellado al empezar la petición
   (queda corto por el procesamiento y la bajada; una petición sin sesión a producción ya tarda 0.2–0.6 s); (b) el
   juego sumaba `inicioEn` después de pintar la pista (≈ 1 s en la máquina de pruebas, más en un celular).
2. **Ganó puntos quien no ganó**: el tiempo de cada quien se medía desde SU salida; quien arrancó tarde tenía «menos
   tiempo» aunque cruzara después. Reproducido en la E2E antes del arreglo: Marisol cruzó 0.8 s antes y Angel (red
   lenta) quedó 1.º con 500 contra 425. Los puntos de sala no mezclaban monedas (descartado), pero el servidor
   aceptaba los puntos de la página (hasta 10 000), `puntosLugar(7) = puntosLugar(8) = 50` y, en la copa, la suma de
   puntos por carrera podía empatar o quedar al revés que la tabla (1,1,3,3 / 3,3,1,1 / 2,2,2,2 → 1700 los tres).

## Comandos ejecutados

- `npx -y deno test -A server/` · `npx -y deno lint server/` · `npx -y deno check server/main.ts`
- `cd tests/calidad && npm run calidad` (y la misma en una copia de `origin/main` para comparar)
- `KARTS_VIVO_SOLO=salida bash tests/e2e/correr.sh … karts-vivo` (en rojo antes del arreglo, en verde después)
- `bash tests/e2e/correr.sh --datos <copia> --puerto-api 9851 --puerto-web 9861 karts karts-vivo partidas juegos`
- `bash tests/e2e/correr.sh … karts karts-vivo plataformas emocion mando`
- Línea base: `bash tests/e2e/correr.sh … --puerto-api 9852 --puerto-web 9862 karts karts-vivo` sobre `origin/main`

## Resultados de pruebas

- Deno: 651 pasaron, 0 fallaron, 6 omitidas (nuevas: `karts_salida_puntos_test.ts` 8, `karts_parrilla_test.ts` 9,
  `reloj_sala_test.ts` 7; todas en rojo antes de implementar). Lint y check limpios.
- Calidad: 317 avisos, igual que `main` (se partió `guardarPartida` en `puntosDeSala` y el gancho de pruebas de
  `karts.html` en `estadoSalida` para no subir la complejidad).
- E2E: `juegos` 31/0, `partidas` 15/0, `plataformas` 115/0, `emocion` 45/0, `mando` 64/0.
  `karts-vivo` 63 PASS / 3 FAIL y `karts` 216 PASS / 8 FAIL: **las mismas fallas que `main` en esta máquina** (línea
  base: `karts` 8 FAIL de fps con CPU ×4 en las 8 pistas; `karts-vivo` 4 FAIL: fps con CPU ×4, latencia del canal
  simulado, «lo ve cerca de donde Angel va» y «lugar de Angel ± 1» en la sala de 8). Son de carga/rendimiento del
  equipo, no de este cambio. Las 11 verificaciones nuevas de `salidaYPodio` pasan (reloj ≈ 0 ms en todos los
  aparatos con red lenta, salidas a ≤ 3 ms, 2 personas a ≈ 52 px al arrancar, podio Marisol 500 / Angel 440 con los
  puntos del servidor, casillas de 3 personas en Teotihuacan pegadas e iguales en las 3 pantallas).
- `e2e-karts.js`: la sala con fantasmas esperaba 35 s fijos; con 8 s de cuenta no llegaba al mínimo de la pista. Ahora
  espera al reloj de la carrera.

## Verificación de estado

- Antes / después: las pruebas usan `MemoryStore` y una copia del repo de datos en el scratchpad. Nada en tablas
  `stald_`, nada en producción. Estado restaurado: no aplica (copias desechables).
- Partidas de sala ya guardadas en producción con la regla anterior: no se reescriben.

## Capturas revisadas

- `karts-salida-volcan-390.png`, `karts-salida-volcan-844x390.png`, `karts-salida-volcan-cuenta-390.png` (Volcán).
- `karts-salida-teotihuacan-390.png`, `karts-salida-teotihuacan-844x390.png` (Teotihuacan).
- `karts-salida-podio-390.png`, `karts-salida-podio-844x390.png`: Marisol 500, Angel 440, BOT-VACHIRA 380.

## Resultado

- Estado Step 5: PASS (las fallas restantes también ocurren en `main` en este equipo)
- Pendiente observado: si un aparato abre la pista después de la salida (sin Realtime y con mala señal), su kart sale
  tarde de su casilla; su tiempo ya cuenta desde la salida común, así que no gana ventaja (en la E2E, 0.2–0.8 s).
