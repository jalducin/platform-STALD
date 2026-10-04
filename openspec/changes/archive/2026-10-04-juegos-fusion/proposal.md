## Why

El profe pidió (Sprint 4) menos juegos repetidos en el menú y temas nuevos:
- Completa la frase y Responde en inglés en un solo juego.
- Ortografía, Acentos y Sinónimos y antónimos en un solo juego, que se llame Ortografía.
- Temas de inteligencia artificial y tecnología en el Maratón de cultura.
- Cálculo mental y Secuencias en un solo juego.

## What Changes

- **🧩 Completa y responde** (`en-frases`): mezcla frases para completar con preguntas para responder en inglés.
- **✍️ Ortografía** (`es-ortografia`): mezcla letras (b/v, c/s/z…), acentos, sinónimos y antónimos.
- **🧮 Cálculo y secuencias** (`mente-calculo`): alterna operaciones con «¿qué número sigue?». Dura 75 s contra
  reloj.
- Se conservan los ids que se quedan, para no perder récords ni historial.
- Los juegos absorbidos (`en-preguntas`, `es-acentos`, `es-sinonimos` y `mente-secuencias`):
  - salen del menú y ya no se pueden crear en partidas nuevas;
  - siguen en el catálogo del servidor, así que sus puntos anteriores se conservan en el ranking;
  - una sala que ya existía con uno de ellos se puede terminar.
- En partida, cada juego fusionado reparte sus 10 preguntas entre sus fuentes.
- **Maratón de cultura**: nuevas categorías 🤖 Inteligencia artificial y 💻 Tecnología, con 16 preguntas cada
  una (6 fáciles, 6 medias y 4 difíciles), cada una con su dato curioso.

## Capabilities

### Modified Capabilities
- `juegos`: menú y contenidos de los juegos de preguntas.

## Impact

- `juegos.html`, `juegos/datos/cultura.json`, `server/salas.ts`, `server/juegos.ts` y sus pruebas.
- Documentación: `docs/backend-standards.md` y `docs/frontend-standards.md`.
- Los E2E con conteos del menú pasan de 25 a 21 juegos.
