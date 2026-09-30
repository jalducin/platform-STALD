## Why

El usuario quiere usar las partidas en la clase del domingo para hacerla dinámica, y ver los resultados de
los juegos en su vista de admin (2026-09-30). Hoy solo ve el ranking dentro de Juegos, y las partidas no
dejan registro consultable después de jugarlas.

## What Changes

- **Registro de partidas:**
  - Al crear una sala se agrega a un índice semanal: `juegos/salas-semana/<lunes>.json`.
  - Al terminar, cada jugador guarda su total final en su archivo de sala, y el anfitrión guarda el
    podio completo con los bots.
- **Ruta `GET /juegos/admin/resumen?semana=`** (solo admin):
  - todos los jugadores de la semana: total, mejores por juego, partidas jugadas y última vez;
  - las partidas de la semana: juego, fecha, anfitrión, jugadores con su total y podio.
- **Vista de admin de `ingles.html`:**
  - Tarjeta **"🎮 Juegos de la semana"**, con el ranking completo y la lista de partidas con su podio.
  - En el bloque de cada alumno o alumna, una línea "🎮 Juegos: ⭐ total · N juegos · N partidas".

- **Enlace para compartir una partida** (pedido durante el cambio):
  - `juegos.html?sala=<código>` lleva directo a la sala. Si no hay sesión, pide el correo y, si es nuevo,
    el registro de invitado; después se une solo.
  - En la sala de espera: el enlace, el botón "📤 Compartir" (menú del celular o copiar) y un código QR para
    proyectar en el Meet, con la misma librería que la presentación.

## Capabilities

### Modified Capabilities
- `juegos`: índice semanal de partidas, total final y podio, y resumen para el admin.
- `dashboard-ingles`: resultados de juegos en la vista de admin.

## Impact

- **Superficies:**
  - `server/salas.ts` y `server/juegos.ts`;
  - `juegos.html`: envía el total final y el podio;
  - `ingles.html`: vista de admin;
  - repo de datos: `juegos/salas-semana/`.
- **Acciones externas:** redeploy al hacer merge (el agente verifica y limpia los datos de prueba).

## Matriz de acceso

| Quién | Qué ve |
|---|---|
| Admin | El resumen completo: nombres, apodos y puntos, sin correos. Los correos de invitados siguen solo en 📋 Invitados |
| Cualquier otro correo | `/juegos/admin/resumen` responde 403 |
