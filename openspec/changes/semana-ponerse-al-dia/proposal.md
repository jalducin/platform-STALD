## Why

Quien se pone al día con prórrogas (Fernando, y antes José, Bianca Mariel y Jacqueline) tiene actividades de la
semana 1 que vencen esta semana. En la sección «Semana», la línea «Lunes a domingo» sí las cuenta, pero la
lista solo muestra los elementos de la semana actual. Por eso Fernando ve que «le falta la semana 1».

## What Changes

- La sección «Semana» agrega, debajo de «📚 Esta semana», la tarjeta «📌 Para ponerte al día». Ahí van los
  elementos de otras semanas cuya fecha (con prórroga) cae en esta semana, con el mismo formato y botón.
- El filtro por día de «Lunes a domingo» también las incluye.
- Pedido del profe: un aviso arriba de Inicio y Semana, «Tienes N para hoy y M atrasadas», con un acceso que muestra
  solo eso (de cualquier semana), cada uno con su botón.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `dashboard-ingles`: «Esta semana» muestra también lo de otras semanas que vence esta semana; aviso y vista de
  hoy y atrasadas.

## Impact

- `ingles/comun.js` (`renderWeekCard`), `ingles/alumno.js` (aviso y `openPendientes`), `ingles/app.js` y la E2E
  `presentar`.
