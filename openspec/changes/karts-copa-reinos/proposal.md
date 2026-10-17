## Why

El profe pidió: «necesitamos la tercera copa, sería Reinos Antiguos: recorrerán pirámides como Chichén Itzá, las de
Egipto, etc., carreras por dentro que sean más difíciles». Hoy Karts Turbo tiene dos copas: la Copa Fiesta (fácil) y
la Copa Mesoamericana (media). Falta un escalón difícil antes de la Copa Espacio (la más difícil, sprint 35, otro
agente en paralelo). La curva de dificultad queda así: Fiesta → Mesoamericana → **Reinos Antiguos** → Espacio.

## What Changes

- **Cuatro pistas nuevas** del tamaño de las pistas grandes, cada una con **tramos DENTRO del monumento**:
  - **Gran Pirámide de Giza** (Egipto): desierto con arena que frena y, adentro, el corredor descendente, la Gran
    Galería con bloques que caen y la cámara del rey.
  - **Interior de El Castillo** (Chichén Itzá, maya): la serpiente de luz del equinoccio afuera (turbo), las escaleras
    interiores en zigzag y el templo interior con el trono del jaguar rojo; compuertas de piedra.
  - **Templo de Karnak** (Egipto): avenida de esfinges, la sala hipóstila con columnas gigantes en el camino (slalom)
    y el santuario con compuertas.
  - **Galerías de Angkor Wat** (jemer): la calzada sobre el foso, las galerías de bajorrelieves con una roca rodante y
    bloques que caen, y la selva con raíces.
- **Interiores en Mode-7**: piso de piedra oscura, muros que rebotan en las dos orillas (frenan al tocarlos), cielo
  interior oscuro con antorchas, luz limitada (viñeta y brillo de antorchas) y portada de piedra en cada entrada.
  Con `prefers-reduced-motion`, sin parpadeo de antorchas ni transiciones animadas.
- **Mecánicas nuevas, deterministas y baratas**: bloques que caen en ciclo, roca rodante, losas (compuertas de piedra)
  que se deslizan, arena, columnas en el camino y franjas de luz (turbo). Todas dependen solo de la posición y del reloj de la
  carrera (iguales en todos los aparatos de una sala).
- **Más difícil, pero justa**: carriles angostos adentro, curvas más cerradas (radio ≥ el mínimo global de 100 px),
  muros que frenan, obstáculos con aviso visible y bots un poco más rápidos en el modo individual (design.md §3).
- **Copa Reinos Antiguos** (`reinos`, `nivel: 3`): en el modo individual (se abre con 1 podio en otra copa, la regla
  de desbloqueo de la Copa del Espacio), en las **copas en sala** (siempre abierta) y como pistas sueltas en salas
  (`MAPAS_SALA` y límites por pista). Récords con `VERSION_PISTAS` como las demás.
- **Sin listas fijas**: las copas de sala, sus nombres y emojis, `MAPAS_SALA` y el selector de la página de Juegos salen
  de `KartsPistas.COPAS` / `PISTAS` (como dejó karts-copa-espacio); los selectores ordenan por `nivel`.
- **Rendimiento**: 60 fps en un celular con el CPU ×4 y 8 karts en vivo (los interiores acortan la vista).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `juegos`: requisitos nuevos «Copa Reinos Antiguos de Karts», «Interiores de monumentos en Karts» y «Copas de Karts
  sin listas fijas».

## Impact

- Superficies: `juegos.html` (Juegos: `?v=`), `juegos/karts-pistas.js`, `juegos/karts-reinos.js` (nuevo),
  `juegos/karts.html`; servidor Deno (pruebas; `server/carreras.ts` ya deriva las pistas de sala).
- Matriz de acceso: sin cambios. El progreso de Karts sigue siendo solo de su dueño; la copa nueva agrega llaves de
  copa y de pista (ids públicos), sin datos personales.
- Coordinación: el sprint 35 (Copa del Espacio) tocó los mismos archivos y llegó antes a `main`; los cambios van
  marcados `// karts-copa-reinos` y se adoptó su desbloqueo (`nivel`, `requiere: { podios }`, design.md §5).
- No se escribe en tablas `stald_`. No se toca `supabase/`, Notion ni `.env`. Sin acciones externas.
