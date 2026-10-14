# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-14
- Cambio: karts-copa-en-sala
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test -A server/` · `npx -y deno lint server/ juegos/karts-copa.js` · `cd tests/calidad && npm run calidad`
- Suite E2E completa sobre una copia exacta del commit (`git archive HEAD`), repartida en dos mitades: la primera
  (login … basta-rondas, con `karts` y `karts-vivo`) la corrió este agente; la segunda (salas, cartas, tablero, mando,
  emocion, login-despues e Inglés), otro agente en los puertos 9811/9821.
- curl contra un servidor local con datos de prueba copiados (`scratchpad/data-curl`).

## Resultados de pruebas
- Deno: 627 pasaron, 0 fallaron, 6 omitidas (las de siempre); `server/karts_copa_test.ts` 6/6. Lint: 113 archivos sin
  avisos.
- Calidad: 317 avisos, igual que `main` (se partió `pintarCopaSala` y el despacho de la sala para no subir la
  complejidad; las llamadas en orden de la prueba de Deno llevan `NOSONAR`).
- E2E de la copa (`copaEnSala` en `e2e-karts-vivo.js`, también corrida sola): 17/17 — formulario con «Una carrera» y
  las 3 copas, la pista se oculta con copa, las 4 carreras en Pradera → Cañón → Lago Helado → Volcán con el otro en vivo
  y el bot fantasma, canal en vivo abierto en la carrera 2, tabla entre carreras con cuenta regresiva en los 2 aparatos,
  el servidor en `interpodio` con la carrera siguiente, podio final de la Copa Fiesta con la tabla de las 4 carreras,
  revancha, copa cerrada en el servidor con 3 en la tabla y puntos de partida guardados (Marisol 2,000 = tope).
- Primera mitad de la suite: ver «Suite completa».

## Suite completa
- Primera mitad (este agente): login 66, portal 16, juegos 31, categorias 49, juegos-ingles 25, jugadores 33, nick 7,
  partidas 15, enlace-sala 7, juegos-recarga 37 — PASS. El resto se repitió en otros puertos porque los servidores de
  prueba de la primera corrida se apagaron a media suite (`ERR_CONNECTION_REFUSED`, ajeno al cambio).
- Segunda mitad: la reporta el coordinador.

## Verificación de estado
- Antes: copia del repo de datos de prueba; sin Postgres (`stald_test_` no se usan; nada en tablas `stald_`).
- Después: el orquestador trabaja sobre su copia; la original no cambia.
- Estado restaurado: Sí — servidores de prueba y servidor local de curl apagados; copias temporales fuera del repo.

## Verificación manual (Step 6) — EL AGENTE EJECUTÓ
- Capturas revisadas: tabla entre carreras a 390×844 (`karts-copa-tabla-390.png`) y 844×390
  (`karts-copa-tabla-844x390.png`), podio de la copa (`karts-copa-podio-390.png`) y formulario
  (`karts-copa-crear.png`). Ajuste tras revisar: el tutorial de controles ya no sale detrás de la tabla en las
  carreras 2 a 4.
- curl local (respuestas reales):
  - crear copa mixta → 200 con `opciones { modo: "copa", copa: "mixta", mapa: <1.ª pista> }`;
  - `copa: "luna"` → 400 `copa_invalida`; `modo: "torneo"` → 400 `modo_invalido`; sin sesión → 400 `missing_email`;
  - carrera 2 adelantada → 409 `carrera_fuera_de_turno`; carrera 0 durante la cuenta regresiva → 409
    `carrera_fuera_de_turno`; `ms: 2000` → 400 `carrera_invalida`; abandono de Angel → 200 con la copa en la respuesta;
    `{ carrera }` suelta en sala de copa → 400 `carrera_invalida`; persona fuera de la sala → 403 `no_en_sala`;
  - vista: `fase carrera, carrera 0`, pistas de la mixta (2 + 2), 2 esperados, tabla con Marisol, Angel y BOT-VACHIRA.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno

## Segunda mitad de la suite (verificación en paralelo)

- Commit probado: 90ab372, en una copia aparte con puertos 9811/9821.
- Resultado: 29 corridas, 28 PASS, 1 FAIL y 0 omitidas.
- La única falla es `peticiones`: 41 peticiones contra un tope de 40. También falla en `main` (e2f121b) con los mismos datos, así que no la causa este cambio.
- El commit fusionado (7f3ed9f) solo agrega un tope de 150 adornos dibujados en Karts. Las pruebas de la segunda mitad no dependen de eso.
