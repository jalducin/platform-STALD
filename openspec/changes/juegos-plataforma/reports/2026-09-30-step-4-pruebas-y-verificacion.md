# Reporte Step 4 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: juegos-plataforma
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/` (sin y con `DATA_DIR`), `deno check` y `deno lint`
- Servidor local con fixture y almacén en memoria.
- E2E: `e2e-juegos.js` (los 14 juegos, ranking, invitado y admin), `e2e-portal.js` y `e2e-semana.js`.
- Revisión del contenido de `juegos/datos/*.json`:
  - JSON válido, conteos y sin correos;
  - muestra al azar para verificar exactitud: 14 preguntas de trivia y ejemplos de cada banco.

## Resultados de pruebas
- **TDD:**
  - `juegos_test.ts` no compilaba sin `juegos.ts`. Después, 11/11.
  - En la primera corrida fallaron 2 pruebas:
    - el correo con mayúsculas no se normalizaba en el registro de invitado. Se corrigió en
      `handleJuegos`;
    - el apodo "G" de la prueba era inválido (menos de 2 letras). Se corrigió el dato de la prueba.
  - `perfil_test.ts`, con el invitado nuevo, 7/7.
- **Suites:** sin `DATA_DIR`, 67 pasaron y 6 omitidas; con `DATA_DIR`, 73 pasaron. `check` y `lint`
  limpios.
- **E2E de juegos:** 29/29, con los relojes acelerados por `window.__TIEMPO_JUEGOS`.
  - Los 14 juegos terminan y guardan con "#N de la semana".
  - Memorama y los dos "Ordena" se resolvieron con los datos: 8/8 y 6/6.
  - El hub muestra el mejor de la semana y el chip suma puntos.
  - Ranking: la alumna aparece marcada como "yo" y no ve la pestaña de invitados.
  - Invitado: el portal ofrece la entrada; sin aceptar no entra; aceptando, entra con el chip INVITADO.
    Su partida se guarda, aparece como "(invitado)" en el ranking y en el portal solo ve Juegos.
  - El admin ve al invitado con su correo.
  - La primera corrida se cortó por una referencia a un campo que se volvió a dibujar en Spelling. Era
    de la prueba y se hizo tolerante.
- **Ajustes tras revisar las capturas:**
  - Se quitó el reloj del Memorama, que salía en rojo desde el inicio.
  - El ícono de Acentos pasó de "´" a "á".
- **Regresiones:** portal 16/16 (Juegos ya como enlace) y semana de Inglés 16/16.
- **Contenido:**
  - ingles: 198 palabras, 97 de dictado, 106 frases y 53 oraciones.
  - español: 106 de ortografía, 69 de acentos, 67 de sinónimos, 67 de antónimos y 52 oraciones.
  - cultura: 352 preguntas en 8 categorías.
  - 0 correos en `juegos/datos`.
  - Lotería: "The Death" → "Death" y "The Brave Man" → "The Brave One".

## Producción (5.1)
- **Antes:** el repo de datos no tenía `juegos/`.
- **Curl a `https://stald.jalducin.deno.net`:**
  - partida con un correo desconocido → 403 `no_registrado`;
  - `/juegos/invitados` como alumna → 403 `solo_admin`;
  - invitado sin aceptar → 400 `debe_aceptar`;
  - juego inválido → 400;
  - partida del admin con 999999 → se guardaron 2000 (tope de `mente-calculo`);
  - registro del invitado de prueba → 200, visible en el ranking y en `/juegos/invitados` para el admin;
  - `/perfil` del invitado → `invitado: true`, solo Juegos.
- **Restauración:**
  - Se borraron `juegos/invitados.json` y `juegos/semanas/2026-09-28/admin.json`, que solo tenían la
    prueba.
  - Después: ranking con 0 jugadores y el invitado de prueba ya no se reconoce.
- **Revisión de solo lectura en Pages (Marisol):** 14 juegos, 9 maratones y portal con Inglés y Juegos
  como enlaces; 0 envíos.

## Verificación de estado
- Sin cambios en Notion. En el repo de datos solo cambió el README.
- Las pruebas usaron almacén en memoria y copias que se borraron, y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 4: PASS
- Bloqueos: ninguno
- Aviso para el usuario: en Windows de escritorio, los emojis de banderas se ven como letras (p. ej.
  "DK"); en celulares se ven bien.
