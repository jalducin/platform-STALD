## Why

El usuario pidió (2026-09-30) que cada quien pueda **subir una imagen de su galería como avatar**, para
entrar en confianza. En `juegos-avatar-musica` se evitaron las fotos porque la mayoría de quienes usan la
plataforma son menores; ahora se agregan con salvaguardas: permiso explícito, imagen pequeña, enlace no
adivinable y moderación del admin.

## What Changes

- **Subir foto** desde "🎨 Tu avatar" en Juegos (`📷 Subir foto`):
  - el navegador recorta al centro y reduce la imagen a **128×128 JPEG** antes de enviarla;
  - casilla obligatoria: "Tengo permiso de mi mamá, papá o tutor para usar esta imagen";
  - el personaje con color sigue disponible; elegir un personaje quita la foto.
- **Servidor:**
  - `POST /juegos/foto` `{ imagen: "data:image/jpeg;base64,…", acepto: true }` (≤ 40 KB, JPEG real);
    guarda la imagen en el repo privado `juegos/fotos/<token>.json` y el avatar queda
    `{ emoji, color, foto: <token> }`;
  - `GET /juegos/foto/<token>` sirve la imagen sin correo: el token es aleatorio (24 hex) y solo se
    reparte a jugadores identificados; caché de 1 h;
  - `POST /juegos/avatar` (personaje) quita la foto y borra su archivo;
  - admin: `GET /juegos/fotos` lista las fotos activas y `POST /juegos/fotos/quitar` `{ id }` quita la
    de cualquier jugador (vuelve a su personaje).
- **Dónde se ve:** donde ya se ve el avatar (chip, ranking, salas, podio, resumen del admin en
  `ingles.html` y saludo del portal). Si la foto ya no existe, se muestra el personaje.
- **Admin:** pestaña "📷 Fotos" en Juegos para revisar y quitar.

## Capabilities

### Modified Capabilities
- `juegos`: avatar con foto opcional y moderación.

## Impact

- **Superficies:** `server/juegos.ts`, `juegos.html`, `ingles.html`,
  `index.html`; repo de datos `juegos/fotos/`.
- **Acciones externas:** redeploy al hacer merge; el agente verifica en producción y borra sus datos de
  prueba.

## Matriz de acceso

- Cada jugador sube o quita solo su foto, y solo con la casilla de permiso marcada.
- La foto se ve dentro de Juegos y del portal como el nombre; la URL no contiene el id ni el correo.
- Solo el admin lista todas las fotos y puede quitar cualquiera.
- Nada se guarda en el repo público.
