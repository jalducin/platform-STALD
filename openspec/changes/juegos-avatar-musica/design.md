## Decisiones

### 1. Avatar en el servidor
- **Listas** en `server/juegos.ts`: `AVATARES` (32 emojis) y `COLORES` (10 hex). Son la única fuente
  válida.
- **Por defecto:** `AVATARES[fnv(id) % 32]` y `COLORES[fnv(id) % 10]`, así cada quien tiene uno distinto
  desde el inicio.
- **Carga:** al resolver al jugador se lee `juegos/perfiles/<id>.json`. Esa lectura queda en la misma
  caché de identidad de 60 s.
- **Propagación:**
  - las partidas (`juegos/semanas/...`) y los archivos de sala guardan `avatar` al escribir;
  - el ranking, las salas y el resumen del admin lo devuelven;
  - al cambiarlo, también se actualiza el archivo de la semana si existe, para que el ranking lo muestre
    de inmediato.

### 2. Avatar en la página
- **Chip:** botón con el avatar (círculo de color con el emoji) y el nombre.
- **Selector:** una cuadrícula de personajes, una fila de colores, vista previa y "Guardar".
- **Componente:** `avatarHtml(av, tamaño)` se reutiliza en el ranking, la sala, el marcador y el podio.
  En `ingles.html`, `renderJuegosAdmin` muestra el avatar junto al nombre.

### 3. Música generada (WebAudio)
- **Secuenciador:** planifica por adelantado 120 ms, con un intervalo de 25 ms. Loop de 4 compases con la
  progresión I–V–vi–IV.
- **Estilos:**

  | Estilo | Tempo | Instrumentos |
  |---|---|---|
  | 🎵 Alegre | 118 bpm | arpegio de pentatónica mayor (onda cuadrada suave), bajo triangular en los tiempos, hi-hat de ruido |
  | 😌 Relajante | 72 bpm | acordes sostenidos (seno con desafinado leve), arpegio lento, ruido "vinilo" muy bajo |
  | 🎉 Fiesta | 126 bpm | bombo en cada tiempo (seno con caída), bajo en contratiempo, acordes cortos (sierra con pasa-bajos) |

- **Volumen:** ganancia maestra de 0.08 (bajo) o 0.16 (medio).
- **Voz:** `hablar()` baja la música al 25 % durante 2.5 s.
- **Arranque:** solo tras un gesto del usuario. Si hay preferencia guardada, arranca con el primer toque
  en la página.
- **Preferencia:** `localStorage.juegos_pref = { musica, volumen }`, sin datos personales.

### 4. Estándar
En `docs/frontend-standards.md` §2, `localStorage` admite, además del correo, preferencias de interfaz sin
datos personales (música).
