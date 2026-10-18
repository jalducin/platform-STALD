## Contexto

`KartsEntrada` separa fuentes (teclado, botones táctiles, joystick/sensor, mando de Arcade) de acciones. Los saltos
de rampa (Chichén Itzá, huecos del espacio) usan `k.aire`, que exenta del cenote, del lodo, de la orilla, del vacío y
de las trampas de Reinos. La reversa (`karts-reversa`) agregó la tercera fila «⏪ REVERSA» en `#m-der`.

## Decisiones

### 1. El brinco NO es `k.aire`
El brinco vive en `k.brinco` (segundos en el aire), `k.brincoEnf` (enfriamiento) y `k.aplasta` (aplastón). Nada de lo
que revisa `k.aire` lo ve: huecos (`bordeEspacio`), cenote y lodo (`frenoZonas`, `entrarZona`), la orilla y las
trampas siguen igual. Esa es la garantía estructural de que el brinco no cruza un hueco ni el cenote ni se salta la
caída y el dron. `KartsSalto.enAireDeRampa(k)` documenta y prueba la regla. El brinco no toca `idx`, `vuelta`,
`mitadOk` ni `vel`: el conteo de vueltas es el de siempre.

### 2. Física (`KartsSalto`)
- `DURACION` 0.4 s, `ALTO` 14 px (la rampa usa 22), altura `sin(π·f)·ALTO`.
- `ENFRIA` 0.6 s desde que cae. `puede(k)`: en el piso, sin enfriamiento, sin rampa, sin caída ni dron, sin giro por
  golpe y sin terminar.
- En el aire el giro se multiplica por 0.35 (si no vienes derrapando): no hay volantazos.
- Aplastón de 0.14 s al caer (solo dibujo).
- Esquiva (`esquiva(k, peligro)`): `cascara` y `bola` cuando la altura es ≥ 7 px (la parte central del brinco,
  ≈ 0.27 s). La roca rodante (44 px) es más alta que el brinco: no se esquiva. Cohete, rayo, bloques, hueco, cenote y
  lodo: tampoco.

### 3. Derrape
Regla única: `derrapa = derrape || (salto && en el piso)`. Así:
- El botón DERRAPE del celular sigue igual (derrape inmediato, sin brinco).
- «⤴ SALTO» mantenido: brinca y, al caer girando, empieza el derrape (mini-turbo como siempre).
- ESPACIO y R/L del mando valen derrape **y** salto: brincan al presionar y el derrape empieza como antes (no cambia
  la carga del mini-turbo ni las pruebas existentes).

### 4. Controles
- **Celular: botón separado** «⤴ SALTO». Un solo botón «SALTO/DERRAPE» obligaría a distinguir tocar de mantener con
  el dedo (fácil de confundir para niñas y niños) y retrasaría 0.4 s el derrape de quien ya lo usa. El botón es una
  columna alta a la derecha (tercera columna `salto` en las tres filas de `#m-der`), donde descansa el pulgar; no
  achica DERRAPE, FRENO, 🎁 ni REVERSA. En horizontal cabe en la esquina derecha.
- **Mando: combinado en R/L** (presionar = brinco, mantener = derrape): no hay botón libre (A gas, B frenar/rev,
  X/Y ítem, START pausa; ▲/▼ no se usan en Karts y la cruceta pierde ▼ en horizontal). Es el esquema de los clásicos.
  `mando.js` no cambia: el adaptador de Karts responde `salto` con el estado de `derrape`; etiqueta «salto/derrape».
- **Teclado: ESPACIO** (combinado, igual que el mando). No hay tecla nueva que memorizar.

### 5. En vivo
`kartVivo()` agrega `d[10]` = altura visible (brinco o rampa, px enteros de 0 a 40). El remoto la interpola como
quinto valor del interpolador y la acota a ≥ 0. Mensajes sin `d[10]`: altura 0.

### 6. Fuera de alcance
Bots que brincan para esquivar (opcional): no en este cambio (cambiaría los resultados de las carreras de las
pruebas). El piloto de prueba no brinca.
