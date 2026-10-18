## Context

En sala en vivo (`juegos-en-vivo`) cada aparato manda sobre su kart y publica su estado (`k`) por el canal de la sala;
los demás lo interpolan. Los objetos (cáscara, bola, cohete) y el rayo solo existían en el modo individual porque
afectan a otros karts. El reloj común de la sala (`reloj-sala.js`, sprint 31) hace que `tCarrera` sea la misma hora
de la carrera en todos los aparatos (± decenas de ms).

## Goals / Non-Goals

**Goals:** todos los ítems en sala en vivo; nadie modifica el kart de otra persona; mismo dibujo en todos los
aparatos; anti-abuso básico; 60 fps con CPU ×4 y 8 karts con ítems.

**Non-Goals:** autoridad del servidor sobre los ítems (el servidor solo valida el tiempo); ítems contra fantasmas;
reconciliar perfectamente el cohete entre aparatos (cada quien lo ve cerrarse sobre el blanco que tiene a la vista).

## Decisions

### 1. «La víctima decide»
- Quien usa un ítem crea el objeto en su aparato **con el mismo evento** que manda (`item`), así su objeto y el de los
  demás salen de la misma función.
- Cada aparato solo revisa choques entre objetos y **su** kart. Si le pegan: gira (o se frena con el rayo), anota la
  gracia y manda `item-golpe { id }`. Los demás quitan el objeto; el giro lo ven por la bandera `giro` de `k`.
- Alternativa descartada: que quien lanza decida los golpes (necesitaría la posición exacta del otro, que solo conoce
  interpolada 100 ms atrás, y le daría autoridad sobre otro kart).

### 2. Evento `item` (arreglo de números, como `k`)
`[n, tipo, x·10, y·10, ángulo·1000, vel, vuelta, idx, tc, avance, blanco, carrera]`:
`n` = número de ítem del dueño (id = `dueño:n`), `tipo` = índice en `TIPOS` (cascara, bola, cohete, rayo), `tc` = ms de
la carrera (`tCarrera`, reloj común), `avance` = vuelta·N + idx de quien lo usa, `blanco` = índice del blanco en la
lista de humanos de la sala (−1 sin blanco), `carrera` = carrera de la copa (0 suelta). Nunca viaja un correo ni un
nombre: el blanco es la posición en la lista que ya tienen todos los aparatos. `item-golpe` = `[n del dueño, índice
del dueño, carrera]`.

Ambos se mandan con `enviarYa` y ritmo 0 (eventos sueltos: `EnVivo` descarta solo sobres repetidos) y **dos veces**
(la segunda a los 150 ms) para tolerar pérdida; el registro descarta la copia por id.

### 3. Simulación determinista
Funciones puras en `juegos/karts-objetos.js` con paso fijo de 1/60 s: `crear(ev, geo)` y `avanzar(o, geo, hastaTc,
lateralBlanco)`. `geo` = `{ pts, n, mitad, velKart, paso, punto }` de la pista. Al llegar un evento remoto se
simula desde `tc` hasta la hora local de la carrera (máximo 3 s de atraso), así todos ven la cáscara en el mismo
lugar y la bola en el mismo rebote. El cohete avanza por la pista a 1.7× la velocidad del kart y se cierra al carril
de su blanco (en el aparato del blanco, su kart real; en los demás, el interpolado).

En el modo individual se usa la misma física del cohete y la bola (las funciones de `karts.html` llaman al módulo),
sin el paso fijo: el comportamiento individual no cambia.

### 4. Rayo por avance
Cada aparato guarda su avance de los últimos 5 s (muestra por cuadro, en un anillo). Al llegar `rayo`, toma su avance
a la hora `tc` del evento y se frena si era mayor que el de quien lo usó (y no tiene estrella ni gracia).

### 5. Anti-abuso (registro por carrera)
- id ya visto o retirado → `repetido`; `n` menor o igual al último aceptado de ese dueño → `viejo` (seq viejo);
- `tc` más de 4 s antes de la hora local → `viejo`;
- menos de 1000 ms (hora de la carrera) desde el último ítem aceptado del mismo dueño → `rapido`;
- `EnVivo` ya descarta a quien no es participante y los sobres de más de 2 KB; el módulo valida forma y rangos.
- Quien usa un ítem en sala también respeta 1 por segundo en su aparato (si no, los demás se lo descartarían).

### 6. Gracia y límite del servidor
Tras un golpe de ítem en sala (objeto, rayo o choque con estrella), 4 s sin recibir otro. Peor caso por ciclo de 4 s:
giro (0.9 s casi detenido) + recuperar la velocidad (≈ VEL_KART / ACEL / 2 ≈ 0.83 s perdidos) ≈ 1.73 s → se pierde a
lo más el 43 % → tiempo ≤ 1.76 × el de referencia, por debajo del límite de sala (2.5 × la referencia en todas las
pistas). La prueba unitaria `factorPeorCaso` lo comprueba contra `limitesKarts` de cada pista. El servidor no cambia.

### 7. Tabla de ítems en sala en vivo
Igual que la individual por lugar, un poco más suave porque los golpes entre personas frustran más que contra bots:

| lugar (r) | individual | sala en vivo |
|---|---|---|
| 1.º | cáscara 45, bola 25, monedas 30 | cáscara 40, bola 20, monedas 40 |
| < 0.4 | cáscara 25, bola 30, monedas 15, turbo 25, cohete 5 | cáscara 25, bola 25, monedas 20, turbo 25, cohete 5 |
| < 0.75 | bola 15, turbo 35, cohete 30, estrella 10, monedas 10 | bola 15, turbo 40, cohete 20, estrella 15, monedas 10 |
| resto | turbo 30, cohete 30, estrella 25, rayo 15 | turbo 35, cohete 25, estrella 30, rayo 10 |

Atrás sigue tocando lo mejor (cohete, estrella, rayo), pero con más ayudas propias (turbo, estrella) que ataques. Sin
canal en vivo (respaldo con fantasmas) se queda la tabla reducida de siempre (monedas, turbo, estrella).

## Risks / Trade-offs

- Dos aparatos pueden pisar la misma cáscara casi a la vez → los dos giran (aceptable; cada quien decide por su kart).
- El cohete puede verse un poco distinto entre aparatos (el blanco interpolado) → solo golpea en el aparato del blanco.
- Un evento perdido dos veces seguidas → ese aparato no ve el objeto; no afecta a nadie más (la víctima decide).
- Reloj común con error de decenas de ms → el rayo usa el avance de esa hora, con margen de un cuadro.
