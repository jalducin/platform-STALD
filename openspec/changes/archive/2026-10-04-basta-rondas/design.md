## Decisiones

### 1. Reloj determinista por ronda (cliente)
Todo se calcula con `inicio` de la sala, la hora del servidor de cada "¡Basta!" y constantes:
- `P_BASTA = 60 s` (escribir), `P_GRACIA = 3 s`, `P_PAUSA = 10 s` (resultados de la ronda).
- `inicio_0 = inicio`; `cierre_r = min(inicio_r + P_BASTA, primerBasta_r + P_GRACIA)`;
  `inicio_{r+1} = cierre_r + P_PAUSA`.
- La ronda actual es la primera `r` con `ahora < cierre_r + P_PAUSA`; después de la última, final.
- Todos los navegadores llegan al mismo calendario porque los gritos vienen del servidor.

### 2. Letras
`barajar(d.letras, rngDe(seed, 'letras')).slice(0, rondas)`: sin repetir (es 20 letras, en 17 ≥ 12).

### 3. Envío y resultados
- Al cerrar la ronda, cada navegador envía `{ ronda, palabras }` una vez; "¡Basta!" envía
  `{ ronda, palabras, basta: true }`.
- Resultados de la ronda cuando todos enviaron o a los 6 s del cierre (lo que pase primero), dentro de
  la pausa.
- Puntuación por ronda con `puntuarBasta` (sin cambios); bots con `botBasta(seed + ronda)`.
- Acumulado = suma de rondas.

### 4. Servidor
- Crear: `opciones.rondas` = `"5" | "10" | "12"` para Basta (por defecto `"10"`).
- `respuesta` con `ronda`: entero `0 ≤ ronda < rondas`; `palabras` como hoy (≤ 10 claves, 40 car.);
  `rondasBasta[ronda]` conserva el primer `basta`. Sin `ronda` se mantiene el formato anterior
  (`palabras`, `basta`) para salas viejas.
- `final` y `podio.total` hasta 10000.

### 5. Final
- Podio acumulado (`pintarFinalSala`) más una tabla "Puntos por ronda" (letra y puntos propios).
- Ranking: `POST /juegos/partida` con el total; el servidor lo topa a 1500 como cualquier partida.
