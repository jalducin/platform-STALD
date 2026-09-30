## Why

Tercera entrega de juegos pedida por el usuario (2026-09-30): **Basta**, uno **similar al UNO** y
**Lotería**. Son juegos conocidos en México que se pueden aprovechar para practicar vocabulario, en
especial en inglés.

## What Changes

- Categoría nueva **🎲 Clásicos** en `juegos.html`, con cuatro juegos.
- **Basta** y **Basta en inglés** (`basta-es`, `basta-en`):
  - sale una letra al azar y hay 60 segundos para escribir una palabra por categoría;
  - el botón "¡Basta!" termina antes y da bono de tiempo;
  - cada respuesta se revisa con el diccionario `juegos/datos/basta.json`:
    - verificada: 100 puntos;
    - empieza con la letra pero no está en el diccionario: 50 ("no la conozco");
    - vacía, con otra letra o repetida: 0.
- **¡Una!** (`una`), juego de cartas de colores tipo UNO. El nombre "UNO" es marca registrada.
  - Tú contra 1 a 3 bots, con 108 cartas: números, Salta, Reversa, +2, Comodín y +4.
  - Botón **"¡Una!"** al quedar con una carta; si no lo presionas, robas 2.
  - **Modo inglés:** los nombres y el anuncio por voz salen en inglés ("Red seven!").
- **Lotería** (`loteria`), lotería mexicana bilingüe:
  - 54 cartas y tu tabla de 4×4 contra 2 bots;
  - el gritón canta cada carta con su verso y la voz en español, inglés o ambos;
  - marcas con 🫘 las cartas que ya salieron y gritas "¡Lotería!";
  - modo **Línea** (rápido) o **Tabla llena**.
- En el servidor, cuatro juegos nuevos en `CATALOGO` con su tope de puntos.

## Capabilities

### Modified Capabilities
- `juegos`: categoría Clásicos con Basta, ¡Una! y Lotería.

## Impact

- **Superficies**:
  - `juegos.html`;
  - `server/juegos.ts` (catálogo);
  - `juegos/datos/basta.json` y `loteria.json` (ya en el repo desde `juegos-plataforma`);
  - `index.html` (descripción de la tarjeta Juegos).
- Sin cambios en rutas ni datos privados.
- **Acciones externas:** redeploy de Deno y Pages al hacer merge (el agente verifica).

## Matriz de acceso

Sin cambios respecto a `juegos-plataforma`: alumnos y alumnas, invitados y admin juegan y suman puntos.
