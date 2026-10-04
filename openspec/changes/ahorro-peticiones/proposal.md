## Why

Aviso de Deno Deploy (2026-10-03): la organización `jalducin` usó el **90 % de las HTTP Requests** del plan gratis.
Se revisó y no hay bucles: el consumo es uso real de las partidas. Por ejemplo, el 3 de octubre hubo 9 salas con 3–5
jugadores. Cada jugador consulta su sala cada 2.5 s, y cada envío (POST) cuesta 2 peticiones por la verificación
previa de CORS. Al llegar al 100 %, Deno puede frenar el servidor hasta el reinicio del ciclo.

## What Changes

- **Envíos sin verificación previa:** las páginas mandan los POST con `Content-Type: text/plain` (petición
  "simple"), y el servidor sigue leyendo JSON igual. Cada envío pasa de 2 peticiones a 1. Además, `OPTIONS` responde
  con `Access-Control-Max-Age: 86400`, para que el navegador recuerde la verificación cuando sí haga falta.
- **Sondeo por tipo de juego** (incorpora el intervalo adaptativo de otra sesión):
  - sala de espera: 2.5 s; se deja de consultar a los 15 min si nadie empieza;
  - en juego: **2.5 s en ¡Una!, Basta y Lotería** (se ven las jugadas de los demás a tiempo; la ventana de UNA es
    de 5 s) y **5 s en los juegos de preguntas** (van sincronizados por reloj);
  - sigue parando al terminar, al vencer la sala o tras 1 h.
- **Vigilante cada 30 min** en lugar de 15.
- **Limpieza:** se quita `server/juegos.html`, una copia accidental de `juegos.html` que entró en el commit "Ok"
  (`eaffbd7`).

## Capabilities

### Modified Capabilities
- `plataforma`: menos peticiones al servidor.

## Impact

- `juegos.html`, `ingles.html`, `index.html` (envíos), `server/main.ts` (CORS) y `.github/workflows/vigilancia.yml`.
- Siguiente paso, aparte, si hace falta: espera larga (long polling) o Supabase Realtime para las salas.
