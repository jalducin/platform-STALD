# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: juegos-clasicos
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/` y `deno lint server/`
- Servidor local con fixture y almacén en memoria.
- E2E:
  - `e2e-clasicos.js`: Basta, ¡Una! y Lotería;
  - `e2e-una.js` y `e2e-una-grito.js`: castigo por no gritar y grito a tiempo;
  - `dbg-una3.js`: jugador automático dentro de la página, 30 partidas;
  - `e2e-juegos.js`: regresión de los 14 juegos anteriores.
- Simulación fuera del navegador de las reglas de ¡Una! (`sim-una.js`, 4000 partidas).

## Resultados de pruebas
- **TDD:** la prueba de topes de los clásicos falló antes de agregarlos al catálogo; ahora pasa.
- **Suite:** 68 pasaron y 6 omitidas. `lint` limpio.
- **E2E de clásicos:** 11/11.
  - **Basta (es):** una respuesta verificada vale 100, una desconocida 50 ("no la conozco") y una con
    otra letra 0. En MAYÚSCULAS también cuenta como verificada.
  - **Basta (en):** 6 verificadas y bono por "¡Basta!".
  - **¡Una!:** rechaza jugadas inválidas ("Match red or 7"); la partida termina y se guarda. Si no
    presionas "¡Una!", la mano pasa de 1 a 3 cartas.
  - **Lotería:** no marca cartas que no han salido; un grito falso avisa "Aún no tienes lotería" y el
    juego sigue; la partida termina (tú o un bot) y se guarda.
- **Justicia de ¡Una!:**
  - En la E2E con Playwright el jugador perdía siempre (0 de 20). Se investigó.
  - La simulación de las reglas da 50.5 % contra 1 bot y 28.8 % contra 3, así que las reglas son justas.
  - El jugador automático dentro de la página ganó 17 de 30 y gritó "¡Una!" a tiempo 40 veces, así que
    gritar evita el castigo.
  - Causa: con los relojes acelerados, la latencia de Playwright no alcanzaba a presionar "¡Una!" en la
    ventana, y la prueba recibía el castigo cada vez. No era un bug del juego.
  - **Ajustes de diseño:**
    - los bots castigan con cartas de acción solo el 40 % de las veces;
    - la ventana para gritar pasó de 2.5 a 3 s.
    - Quedaron registrados en `design.md`.
- **Regresión de juegos:** 29/29, con las expectativas actualizadas a 18 juegos en 5 categorías. "Mejor
  de la semana" se revisa en cualquier tarjeta, porque una partida aleatoria puede dar 0.
- **Capturas revisadas:** Lotería (carta, tabla, bots, aviso) y ¡Una! (mesa, mano, bots).

## Verificación de estado
- Sin cambios de datos. Las pruebas usaron almacén en memoria, que se borró, y el servidor local se
  detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
