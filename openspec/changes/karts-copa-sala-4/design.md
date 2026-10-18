## 1. Diagnóstico: por qué la copa «solo tuvo 2 carreras»

Hipótesis revisadas (con pruebas de Deno en `server/karts_copa_sala_4_test.ts` y lectura del código):

| Hipótesis | Resultado |
|---|---|
| El índice salta 2 al cerrar por límite o por «todos reportaron» | No: el calendario avanza de 1 en 1; `fase: 'final'` solo con la carrera 4 cerrada. |
| `carrera_cerrada` / `carrera_fuera_de_turno` hacen que la página se salte una carrera | **Sí, como efecto** de la causa de abajo: el tiempo de quien no estaba «esperado» se rechaza con `carrera_cerrada`. |
| Reportes duplicados (dos aparatos, reintentos) | No: solo cuenta el primero de cada carrera; la prueba lo fija. |
| Copas con otro número de pistas (mixta, Mesoamericana, Reinos, Espacio) | No: todas tienen 4; ahora `CARRERAS` sale de las pistas y la prueba recorre fiesta, mesoamerica y reinos. |
| El podio final sale cuando termina quien reportó primero | No en el servidor; la página solo pinta el podio con `fase: 'final'`. |
| Depende del número de vueltas (cambio 43b) | No: la regla nueva solo usa llegadas y el reloj del servidor. |

**Causa confirmada.** En `juegos/karts-copa.js` (sprint 30) las personas esperadas en la carrera k ≥ 1 eran solo
las que reportaron la carrera k−1 **sin abandonarla**, y la carrera cerraba en cuanto reportaban todas las esperadas.
Esa regla se retroalimenta:

1. Alguien pierde un reporte en la carrera k−1. Pasa en la vida real: la página abandona sola la carrera si se entera
   de la salida más de 4 s tarde (`tarde` en `pintarCopaSala`: celular bloqueado mientras esperaba hasta 5 min a los
   demás, aviso de Realtime perdido con el sondeo de respaldo a 30 s), cierra la pestaña, o el servidor rechaza su
   tiempo.
2. En la carrera k ya no se le espera: la carrera cierra al llegar quien sí estaba esperado, a esta persona se le
   corta la carrera a media pista (su página arranca la siguiente) y su tiempo llega tarde → `carrera_cerrada`.
3. Como tampoco tiene reporte de la carrera k, tampoco se le espera en la k+1… y así **hasta el final de la copa**.

Con 2 personas + bots: una corre las 4; la otra solo tuvo premio en las 2 primeras y en las demás le cortaban la
carrera y le rechazaban el tiempo («solo hubo 2 premios»). La prueba roja lo reproduce: Angel abandona la carrera 1 y
en las carreras 2–4 llega 5 s después de Marisol; antes la carrera 2 cerraba al llegar Marisol y Angel quedaba fuera.

Agravante (punto 2 del profe): si alguien esperado no llega, la carrera solo cerraba al vencer el límite de la pista
(≈ 300–340 s + 10 s de gracia).

## 2. Regla nueva (compartida: `juegos/karts-copa.js`, la usan la página y el servidor)

`KartsCopa.cierreCarrera({ inicio, limite, reportes, total }, ahora)` — `reportes` = `[{ t, ms }]` de las personas
(uno por persona, el primero), `total` = personas de la sala. Devuelve `{ cierre, plazo }`:

- `plazo` = `t` de la primera llegada (`ms !== null`) + `PLAZO_MS` (30 000), o `null` si nadie ha llegado.
- `cierre` (en orden):
  1. todas las personas reportaron (`reportes.length >= total`) → la hora del último reporte;
  2. hay plazo y `ahora >= plazo` → `plazo`;
  3. `ahora >= inicio + limite + GRACIA_SALA` → esa hora (nadie llegó);
  4. si no, `null` (abierta).

Solo cuentan los reportes con `t` ≤ al cierre que resulta (con el plazo vencido, un reporte posterior no existe:
el servidor lo rechaza).

**Calendario de la copa**: en cada carrera cuentan **todas** las personas de la sala (`esperados` = todas, se conserva
el campo para la página). La siguiente empieza `INTERPODIO_MS` (10 s) después del cierre. `CARRERAS` = número de
pistas de la copa (4 hoy). `fase: 'final'` solo con la última carrera cerrada → el podio final es uno y al final para
todas las personas.

**Carrera suelta en sala (Karts)**: la misma función con los reportes `carrera` de cada persona y `inicio` de la sala.
El servidor la usa en `POST /respuesta` (rechaza con `carrera_cerrada` un tiempo posterior al cierre) y en
`rankingCarreraSala` (deja de responder `en_curso`); la página, para pintar el podio y la cuenta. Axo (plataformas)
no cambia.

**Quien no termina**: NT, 0 puntos (como hasta hoy en la copa). Decisión: no se dan puntos por avance porque el avance
lo calcula el aparato y el servidor no lo puede comprobar; sí se usa para **ordenar** a quienes no terminaron
(`Arcade.podioCarrera` ya lo hace). El reporte de copa acepta `{ carrera, ms: null, monedas, avance }` (avance 0–999).

**Plausibilidad**: sin cambios — `validarCarrera` con el mínimo y el límite de la pista y el reloj del servidor desde
el inicio de esa carrera (`ms` ≤ transcurrido + 3 s y ≥ transcurrido − 20 s).

## 3. Página (`juegos/app/arcade.js`) y juego (`juegos/karts.html`)

- Se quita el abandono automático por llegar tarde: si la carrera está abierta y no la has reportado, el juego la
  arranca (aunque ya haya empezado, «La carrera ya empezó: ¡arranca!»); el tiempo se mide desde la salida común, así
  que la plausibilidad del servidor sigue valiendo. Salir de la sala sigue mandando abandono (cuenta como reporte NT).
- Con plazo abierto la página manda al juego `{ tipo: 'plazo', finLocal }` (hora del aparato, reloj común) y el juego
  muestra «⏱️ N s para terminar» mientras corres. En la tabla de espera: «⏱️ N s para terminar».
- Al cerrar la carrera mientras sigues corriendo, la página manda la siguiente `inicio` (tabla + cuenta) como antes.
- Al acabar tu plazo el juego manda `meta` con `ms: null` y `avance`; la página lo reenvía al servidor.
- Carrera suelta: el podio se pinta al cerrar con la misma regla (todas reportaron, plazo o límite).

## 4. Coordinación

Cambios marcados `// karts-copa-sala-4`. 43b (3 vueltas) toca límites y pistas: esta regla no depende de vueltas.
43c (control y ceremonia) toca la UI del podio: aquí solo se agrega el aviso del plazo en el HUD.
