# Reporte Step 3 — Pruebas y verificación de estado

- Fecha: 2026-09-30
- Cambio: juegos-loteria-preguntas
- Agente: Claude Code (Opus 5.5)

## Comandos ejecutados
- `npx -y deno test --allow-env --allow-read server/`, `deno check` y `deno lint`
- Contenido: `preguntas-en.json` (124 preguntas) integrado en `juegos/datos/ingles.json`, con una muestra
  al azar de 8 revisada.
- E2E:
  - `e2e-loteria-sala.js`: "Responde en inglés" en solitario y Lotería en partida con bots;
  - `e2e-loteria-humano.js`: Lotería en partida sin bots, para verificar que gana una persona;
  - regresiones: `e2e-partidas`, `e2e-resultados`, `e2e-juegos`, `e2e-clasicos`, `e2e-enlace-sala` y
    `e2e-enlace-juegos`.

## Resultados de pruebas
- **TDD:**
  - `salas_test.ts` (modo de Lotería válido o inválido, `linea` por defecto, grito único y sala de
    `en-preguntas`) y `juegos_test.ts` (`en-preguntas` con tope 2000) fallaron antes de implementar.
  - Después, 79 pasaron y 6 omitidas. `check` y `lint` limpios.
- **"Responde en inglés":** pregunta en inglés con traducción; termina y guarda.
- **Lotería en partida con bots:** 10/10.
  - Selector de modo visible y bots renombrados (BOT-VACHIRA y BOT-ISAGII).
  - Misma carta en ambos; la diferencia de una carta se debe a que las dos páginas se leen una después de
    la otra.
  - Tablas distintas.
  - El **mismo ganador** en ambos (un bot) y **podio idéntico**, guardado en el ranking.
- **Lotería sin bots:** ganó una persona ("¡Lotería de Marisol!"), con el mismo resultado y podio en ambos
  navegadores.
- **Regresiones:**
  - partidas 15/15, resultados 8/8, juegos 29/29, enlace de sala 8/8 y enlace a juegos 2/2;
  - clásicos 10/10: la verificación del castigo de ¡Una! quedó como informativa porque la partida al azar
    no llegó a una carta; se verificó aparte en `juegos-clasicos`.
  - Las expectativas se actualizaron a 19 juegos y a los nombres nuevos de los bots.

## Verificación de estado
- Sin datos reales modificados. Las copias se borraron y el servidor local se detuvo.
- Estado restaurado: Sí.

## Resultado
- Estado Step 3: PASS
- Bloqueos: ninguno
