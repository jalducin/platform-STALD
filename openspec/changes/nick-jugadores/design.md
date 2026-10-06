## Decisiones
- **Archivo propio `juegos/nicks.json`** (`{ "<id>": "<nick>" }`), sin correos. No se guarda en
  `juegos/perfiles/<id>.json` porque `guardarAvatar` reescribe ese archivo completo (elegir personaje quita la foto)
  y borraría el nick.
- **Identidad:** después de `resolverJugador`, si el id tiene nick, `jugador.nombre = nick` y
  `jugador.nombreReal = <nombre de las clases o apodo>`. Todo lo que ya usa `jugador.nombre` (ranking, salas, chip,
  fotos) muestra el nick sin más cambios.
- **`POST /juegos/nick`:**
  - valida con `APODO`; con `""` quita el nick;
  - escribe con reintentos por concurrencia y actualiza `nombre` en la entrada de la semana, si existe;
  - limpia las cachés de identidad de ese id y de la semana.
- **Admin:** `armarJugadores` recibe `nicks` y agrega `nick` a cada jugador.
- **Pantalla:** en «🎨 Tu avatar», un campo «✏️ Tu nick» con su propio botón «Guardar nick». El valor se conserva
  aunque la pantalla se vuelva a dibujar al elegir personaje o color.

## Pruebas
- Unitarias (`server/nick_test.ts`):
  - poner, cambiar y quitar el nick;
  - `nombre` y `nombreReal` en `/juegos/yo`;
  - el ranking usa el nick tras una partida y al cambiarlo;
  - nick inválido → 400;
  - el admin ve `nick` en `/juegos/jugadores`.
- E2E `e2e-nick.js`:
  - una alumna pone su nick en «Tu avatar» y lo ve en el chip y en el ranking;
  - lo quita y vuelve su nombre.
