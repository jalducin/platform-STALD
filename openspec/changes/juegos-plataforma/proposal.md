## Why

El usuario pidió (2026-09-30) juegos para que aprender sea más dinámico: Inglés, Español, maratón de
cultura (historia, geografía, etc.) y mente ágil, con **puntos y ranking semanal**. También pidió que
entren **invitados**, cuyo correo se guarda para análisis. Basta, ¡Una! (tipo UNO) y Lotería van en el
cambio siguiente, `juegos-clasicos`.

## What Changes

- **`juegos.html`**, con acceso desde la tarjeta 🎮 Juegos del portal:
  - catálogo por categoría;
  - pantalla de juego con tiempo, puntos y vidas;
  - resultado con récord y posición;
  - pestaña 🏆 Ranking de la semana;
  - panel de invitados solo para el admin.
- **Juegos de esta entrega** (14):
  - **Inglés:** Vocabulario contra reloj, Spelling bee (voz), Completa la frase, Memorama inglés–español
    y Ordena la oración.
  - **Español:** Ortografía, Acentos, Sinónimos y antónimos, y Ordena la oración.
  - **Maratón de cultura:** trivia con vidas y niveles en 8 categorías (Historia de México, Historia
    universal, Geografía, Capitales, Banderas, Ciencias, Arte y literatura, Cuerpo humano) o todas
    mezcladas.
  - **Mente ágil:** Cálculo mental, Secuencias, Simón dice y Sopa de letras.
- **Contenido** en `juegos/datos/*.json` del repo público: vocabulario, frases, trivia. No son datos
  personales ni respuestas de evaluaciones.
- **Servidor:**
  - `POST /juegos/partida`: guarda los puntos.
  - `GET /juegos/ranking`: top de la semana y la posición propia.
  - `POST /juegos/invitado`: registro y entrada de invitados.
  - `GET /juegos/invitados`: solo admin, para análisis.
  - Los datos van en el repo privado (`juegos/`).
- **Invitados:**
  - Cualquier correo que no esté en las clases puede entrar solo a Juegos, con un apodo y aceptando el
    aviso de uso de su correo.
  - Su correo se guarda en el repo privado (`juegos/invitados.json`), nunca en el público.
- **Portal:**
  - La tarjeta Juegos deja de estar "muy pronto".
  - Un correo desconocido ve la opción "Entrar como invitado a Juegos".
  - `/perfil` reconoce a los invitados registrados.

## Capabilities

### New Capabilities
- `juegos`: catálogo, partidas con puntos, ranking semanal e invitados.

### Modified Capabilities
- `portal`: entrada de invitados y tarjeta Juegos activa.

## Impact

- **Superficies**:
  - `juegos.html` (nuevo), `juegos/datos/*.json` (nuevo) e `index.html`.
  - `server/juegos.ts` (nuevo), `server/perfil.ts` y `server/main.ts`.
  - Repo de datos (`juegos/`).
- **Estándares:** los juegos cargan su contenido de archivos JSON del mismo sitio; es la excepción a
  "HTML autocontenido" (ver design). Se documenta en `docs/frontend-standards.md`.
- **Acciones externas:** redeploy de Deno y Pages al hacer merge (el agente verifica). Sin cambios en
  Notion.

## Matriz de acceso

| Quién | Juega y suma puntos | Ve el ranking | Ve correos de invitados |
|---|---|---|---|
| Alumno o alumna (Inglés o Secundaria) | Sí, con su nombre de pila | Sí | No |
| Invitado registrado | Sí, con su apodo y la marca "invitado" | Sí | No |
| Admin | Sí, como "Profe" | Sí | Sí (`/juegos/invitados`) |
| Correo sin registro | No (403 `no_registrado`); puede registrarse como invitado | No | No |

- El ranking muestra solo nombres de pila o apodos, nunca correos.
- Los archivos de partidas usan un id (`a-<slug>`, `s-<slug>`, `i-<hash>`), nunca el correo. Los correos
  de invitados viven solo en `juegos/invitados.json` del repo privado.
