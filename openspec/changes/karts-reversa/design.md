## Contexto

La capa de entrada de Karts (`KartsEntrada`, cambio `karts-pseudo3d`) ya separa fuentes (teclado, botones táctiles,
joystick/sensor y adaptadores externos como el mando de Arcade) de acciones. La física (`pasoKart`) solo lee
`leerEntrada()`. La vuelta se cuenta en `actualizarIdx` al pasar de la muestra > 85 % a < 15 % con `mitadOk`.

## Decisiones

### 1. Acción `reversa` en la capa de entrada
- `ACCIONES` suma `reversa`. `leerEntrada(vel)` devuelve `reversa` = `activo('reversa')` **o** «freno estando parado»
  (`KartsReversa.quiereReversa`): freno del teclado (↓/S) o del mando (B) con `vel ≤ 8` px/s. Una vez en reversa
  (`vel < 0`) se sigue mientras se mantenga.
- El botón táctil FRENO **no** se vuelve reversa: en el celular hay botón propio (evita sorpresas a quien mantiene
  FRENO con «Automático»). El joystick «abajo frena» tampoco.

### 2. Movimiento (`KartsReversa.pasoVel`)
- Si `vel > 0`: frena con la fuerza del freno (380 px/s²) hasta 0.
- Si no: se acerca a `−0.38 × punta` (punta con zonas y rayo) con aceleración 90 px/s² (suave; el turbo no la acelera).
- El giro ya usa `min(1, vel/90)`: con `vel < 0` el factor es negativo, así el volante queda **invertido** como en un
  carro real. No hay derrape en reversa.
- Sin reversa: motor ahogado, `k.giro` (golpe), `sinControl` (caída, dron, fantasma), `termino`, piloto de prueba y
  bots.

### 3. Meta en ambos sentidos (`KartsReversa.cruzarMeta`)
- Adelante (> 85 % → < 15 % con `mitadOk`): `vuelta++`; si hay `deuda`, la salda **sin** `alCruzar` (sin sonido, aviso
  ni término posible: la vuelta vuelve al valor que ya tenía).
- Atrás (< 15 % → > 85 %, salto ≤ 30 muestras, `vuelta ≥ 0`, sin terminar): `vuelta--`, `deuda++`, `mitadOk = true`.
  Así el avance (`vuelta × N + idx`) no brinca casi una vuelta al retroceder (lugar y ‰ correctos) y no se pueden
  sumar vueltas yendo y viniendo sobre la meta. Aplica también a quien da la vuelta y maneja al revés.
- Rescates, dron y portales fijan `idx` directo (sin pasar por el cruce): no cambian.

### 4. Botón «⏪ REVERSA»
- Tercera fila de `#m-der`, a lo ancho de las dos columnas, más baja (34 px vertical, 30 px horizontal), color ámbar.
  Se ve en Botones, Joystick y Sensor (el Mando clásico usa B).

### 5. Mando clásico
- Sin tocar `juegos/mando.js`: el adaptador ya expone `presionado('freno')`; la etiqueta de B pasa a «frenar/rev».
  Se eligió «B parado» (y no un botón extra) porque el rombo A/B/X/Y y L/R ya están ocupados y así lo hacen muchos
  juegos de carreras.

### 6. Sala
- El estado se manda igual (`Math.round(vel)` puede ser negativo; `vuelta` puede bajar dentro de [−1, vueltas]: el
  receptor ya lo acota). El servidor no valida la vuelta en vivo.

## Riesgos
- Lógica de vuelta tocada: cubierta con pruebas unitarias (adelante, atrás, ida y vuelta repetida, inicio y saltos).
