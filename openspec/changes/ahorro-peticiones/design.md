## Decisiones

### 1. POST como petición simple (sin preflight)
- `fetch(..., { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(…) })`.
  Un POST con `text/plain` y sin encabezados personalizados es una *simple request* de CORS, así que el navegador no
  manda `OPTIONS` antes.
- El servidor usa `req.json()` y `req.text()` + `JSON.parse`, que no dependen del `content-type`. No cambia nada en
  las rutas.
- `DELETE` (reiniciar resultados, muy poco frecuente) sigue con preflight. `corsHeaders` agrega
  `Access-Control-Max-Age: 86400`.

### 2. Intervalo de sondeo de salas
```
esperando (inicio === null) → 2500 ms; si pasan 15 min desde que se entró sin empezar → parar
en juego: juego ∈ {una, basta-es, basta-en, loteria} → 2500 ms; si no → 5000 ms
```
- Se mantienen las paradas existentes: vista final, 403/404/410 y 1 h.
- Se usa `setTimeout` encadenado (de la otra sesión), así nunca se encima una consulta con otra.

### 3. Estimación
Partida de quiz con 5 jugadores durante 10 min:
- antes: 5 × 24 por min × 10 = 1,200 consultas, más 5 × 10 envíos × 2 = 100;
- después: 5 × 12 por min × 10 = 600, más 50 envíos;
- ahorro: alrededor del 50 %.

En ¡Una!, Basta y Lotería el ahorro viene solo de los envíos, que en ¡Una! son muchos.
