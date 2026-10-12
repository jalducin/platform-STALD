## Why

El profe pidió que cada juego de sala tenga su regla de mesa. Por ejemplo, en el Dominó de 4, si entran 3 personas,
juega 1 bot, y si entra la cuarta, el bot se quita. Hoy eso está escrito a mano solo para Brisca y ajedrez, y vienen
14 juegos nuevos.

## What Changes

- Una tabla común de mesas (`max`, `asientos`, `min` y `bots`) en el servidor y en la página.
- Brisca y ajedrez pasan a esa tabla sin cambiar su comportamiento.
- La sala de espera muestra «Mesa de N · X personas + Y bots» y se vuelve a dibujar cuando una persona desplaza a un
  bot. Antes no se redibujaba porque la lista no cambiaba de largo.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `juegos`: requisito nuevo «Mesas de las partidas con bots que ceden su lugar».

## Impact

- `server/salas.ts` (`MESAS`, `enMesa`, cupo y mínimo).
- `juegos/mesas.js` (nuevo) y `juegos.html` (`participantes`, sala de espera).
- `server/mesas_test.ts`.
