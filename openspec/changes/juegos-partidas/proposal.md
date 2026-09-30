## Why

El usuario pidió (2026-09-30) poder **crear partidas** para jugar varios juegos entre varias personas a
la vez, con **2 jugadores automáticos** que contesten al azar. Así los juegos sirven para el Meet y para
competir entre alumnos y alumnas.

## What Changes

- **Pestaña 👥 Partidas** en `juegos.html`:
  - **Crear partida:** elegir el juego y sus opciones y decidir si entran los 2 bots. Se genera un código
    de 4 letras.
  - **Unirse con código:** muestra la sala de espera con los jugadores en vivo.
  - **Quien crea la partida la inicia**, con una cuenta regresiva.
- **Juegos con partida:**
  - **Preguntas** (8): Vocabulario, Completa la frase, Ortografía, Acentos, Sinónimos y antónimos,
    Maratón de cultura, Cálculo mental y Secuencias.
    - 10 preguntas, iguales para todos.
    - 15 s para responder cada una y 4 s de revelación, con la respuesta correcta y el marcador de la
      sala.
    - Puntos por pregunta: 100 si es correcta, más hasta 100 por rapidez.
  - **Basta** (es y en):
    - una letra para todos y 60 s;
    - quien grita "¡Basta!" (con todo lleno) cierra la ronda para todos, con 3 s de gracia;
    - puntos: única y verificada 100, repetida 50, no verificada 25 si es única y 10 si se repite,
      inválida 0.
- **Bots "Bot Ajolote 🦎" y "Bot Colibrí 🐦":**
  - contestan al azar, con 60 % y 45 % de acierto y tiempos variables;
  - en Basta llenan palabras del diccionario al azar;
  - se calculan igual en todos los dispositivos a partir de la semilla de la partida, así que no escriben
    nada en el servidor.
- **Resultado:** podio de la sala. Los puntos de cada persona cuentan en el ranking semanal de ese juego
  (`/juegos/partida`, con los mismos topes).
- **Acceso directo:** enlace "🎮 Juegos" junto a "← Inicio" en `ingles.html` y `secundaria.html`. Lo pidió el
  usuario durante el cambio; ya existía en el portal.
- **Servidor** (`server/salas.ts`):
  - `POST /juegos/sala` (crear);
  - `POST /juegos/sala/<código>/unirse`;
  - `POST /juegos/sala/<código>/empezar` (solo quien la creó);
  - `POST /juegos/sala/<código>/respuesta`;
  - `GET /juegos/sala/<código>` (estado, con la hora del servidor).

## Capabilities

### Modified Capabilities
- `juegos`: partidas multijugador con código y bots.

## Impact

- **Superficies:**
  - `juegos.html`;
  - `server/salas.ts` (nuevo) y `server/main.ts`;
  - repo de datos: `juegos/salas/<código>/`.
- **Límites:**
  - La API de GitHub admite unas 5000 peticiones por hora. Una partida de 5 personas usa unas 500:
    caché de 2 s en el servidor, sondeo cada 2.5 s y una escritura por respuesta.
  - Alcanza para varias partidas por hora. Si crece mucho, conviene una base de datos en tiempo real
    (Deno KV); se deja anotado.
- **Fuera de alcance:** ¡Una! y Lotería multijugador, porque requieren turnos en tiempo real.
- **Acciones externas:** redeploy de Deno y Pages al hacer merge (el agente verifica y limpia las salas de
  prueba).

## Matriz de acceso

| Quién | Crear | Unirse | Empezar | Ver la sala |
|---|---|---|---|---|
| Alumno, alumna, invitado o admin | Sí | Sí (antes de empezar; máximo 30) | Solo quien la creó | Solo sus jugadores |
| Correo sin registro | No (403) | No | No | No |

- La sala muestra nombres de pila o apodos, sin correos.
- Los archivos de sala usan ids de jugador, igual que las partidas.
- Una sala vence a las 3 horas (410).
