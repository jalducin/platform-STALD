## Why

El usuario pidió (2026-09-30):
- que cada quien pueda **cambiar su avatar**, para entrar en confianza;
- **música de fondo** alegre o relajante en los juegos.

Como la mayoría de quienes usan la plataforma son menores, en lugar de subir fotos se ofrecen **personajes
(emoji) con color de fondo**: no se guardan imágenes ni datos biométricos y no hay contenido que moderar.
Canciones comerciales no se pueden usar por derechos de autor, así que la música se **genera en el
navegador**.

## What Changes

- **Avatar:**
  - Cada jugador elige un personaje de una lista cerrada (32 opciones: animales, comida mexicana,
    deportes, espacio…) y un color de 10.
  - Mientras no elija, tiene uno por defecto a partir de su id.
  - Se ve en el chip de Juegos, en el ranking, en las salas (espera, marcador y podio) y en la tarjeta
    "🎮 Juegos de la semana" del admin.
  - Se cambia tocando el chip → "🎨 Tu avatar".
  - Servidor: `GET /juegos/yo` incluye `jugador.avatar`; `POST /juegos/avatar` `{ emoji, color }`,
    validado contra la lista; se guarda en `juegos/perfiles/<id>.json`.
  - Los bots tienen avatar fijo: BOT-VACHIRA ⚡ y BOT-ISAGII 🌀.
- **Música de fondo** en `juegos.html`:
  - Botón 🎵 con Apagada, 🎵 Alegre, 😌 Relajante y 🎉 Fiesta, y volumen bajo o medio.
  - Se genera con WebAudio: acordes, bajo, melodía y percusión suave; no hay archivos ni derechos.
  - Baja sola mientras habla la voz del gritón o del Spelling.
  - Empieza solo después de un toque del usuario (regla de los navegadores).
  - La preferencia se recuerda en el dispositivo (`localStorage` `juegos_pref`; no es dato personal).

## Capabilities

### Modified Capabilities
- `juegos`: avatar por jugador y música de fondo.

## Impact

- **Superficies:**
  - `juegos.html` e `ingles.html` (admin);
  - `server/juegos.ts` y `server/salas.ts`;
  - repo de datos: `juegos/perfiles/`.
- **Estándar:** `docs/frontend-standards.md` §2 permite además preferencias de interfaz no personales en
  `localStorage`.
- **Acciones externas:** redeploy al hacer merge (el agente verifica y limpia los datos de prueba).

## Matriz de acceso

- Cada jugador cambia solo su avatar.
- El avatar es público dentro de Juegos, como el nombre.
- No se aceptan valores fuera de la lista (400), así que no hay texto libre ni imágenes.
