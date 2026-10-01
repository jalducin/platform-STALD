## Decisiones

### 1. Modelo
- `Partida` gana `modo?: "sala"` y `sala?: string`. Sin `modo` se considera individual (compatibilidad).
- `Semana` gana `totalIndividual` y `totalPartidas`; `total` = la suma de ambos (lo siguen usando invitados y
  otros resúmenes).
- `totales(s)` los calcula siempre desde `partidas`, tanto al guardar como al leer, así los documentos viejos
  quedan bien sin migrar sus totales.

### 2. Guardar una partida de sala
`POST /juegos/partida { juego, puntos, …, sala }`:
1. El código tiene 4 letras mayúsculas; si no, 400 `sala_invalida`.
2. `juegos/salas/<código>/sala.json` existe, su `juego` es el mismo y `inicio` no es nulo; si no, 400
   `sala_invalida`.
3. El jugador tiene su archivo en la sala; si no, 403 `no_en_sala`.
4. Ninguna partida suya de la semana tiene esa `sala`; si la hay, 409 `ya_guardada`.
5. Tope: 10,000.

### 3. Ranking
- `ordenar(docs, tipo)` ordena por `totalIndividual` o `totalPartidas`; el empate lo decide `actualizado`.
- Solo aparece en un ranking quien tiene puntos de ese tipo.
- Cada fila trae los dos totales.
- `yo` trae los dos totales y `pos` del tipo pedido.
- `/yo` trae `pos` (individual) y `posPartidas`.

### 4. Página
- El chip muestra `⭐ <individual> · 👥 <partidas> · #<pos individual>`.
- Resultado individual: "+N a tus puntos individuales · ⭐ total".
- Resultado de sala: "+N a tus puntos de partidas · 👥 total (#pos)".
- Ranking: botones `data-rtipo`. El texto deja de decir "cuenta tu mejor puntaje de cada juego".

### 5. Migración (una vez, semana 2026-09-28)
- Por cada sala del jugador con `inicio`: busca su partida con el mismo `juego`.
  - Si la sala guardó `final`, la partida debe tener esos puntos.
  - Si no, se toma la primera partida del mismo juego entre `inicio` e `inicio + 30 min` que no esté usada.
- La partida encontrada se marca `modo: "sala"` y `sala`, y se recalculan los totales.
- Script en `herramientas/migraciones/puntos-por-tipo.py` del repo de datos. Se ejecuta tras el deploy y el
  commit sirve de respaldo.
