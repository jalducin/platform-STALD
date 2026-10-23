# Línea base — peticiones y tiempo del panel del profe (antes)

- Fecha: 2026-10-22
- Cambio: panel-profe-peticiones
- Agente: Claude Code (Opus)
- Código: `main` 98a91d3 (con #247).
- Entorno: servidor Deno local (9041) con copia temporal del repo de datos y `ROWS_FIXTURE`, `HOY_FIJO` 2026-10-27,
  PostgREST falso en memoria (9043, solo `stald_test_*`, migración de `herramientas/migrar-ingles.ts` y «Grupo 1»),
  estáticos en 9042. Sesión de prueba del admin (`admin@example.com`).
- Cómo: Playwright (Chromium headless shell 1243) abre `ingles.html#resumen` en un contexto nuevo (sin caché) y
  habla con el API por un proxy local que cuenta **todas** las peticiones, `OPTIONS` incluidas, con su inicio y fin
  (ms desde la navegación). 3 repeticiones por perfil; se informa la mediana.
- Usable = el encabezado del panel tiene sus números (sin «…» en «🚨 En riesgo») y el tablero del resumen (o su aviso)
  está pintado.
- Perfiles:
  - **celular**: 360×740, táctil, red Slow 4G de Lighthouse (150 ms RTT, 1.6 Mbps de bajada, 750 kbps de subida) y CPU
    4× más lento;
  - **PC**: 1280×800, sin limitar.

## Resultado

| Perfil | Peticiones al API (OPTIONS) | Oleadas tras `/config` | Usable (mediana; 3 corridas) |
|---|---:|---:|---|
| Celular (Slow 4G, CPU 4×) | 15 (7) | 3 | **6 311 ms** (6 860 / 5 815 / 6 311) |
| PC | 15 (7) | 3 | **829 ms** (593 / 829 / 1 098) |

En celular, los primeros ~3 s son los scripts y estilos estáticos de la página (no cambian con este cambio). Del
resto, cada oleada espera a la anterior y al dibujo con el CPU lento.

## Orden y cascadas

```
/config
  └─► OPTIONS+GET /ingles/actividades ‖ OPTIONS+GET /ingles/data           (oleada 1)
        └─► isAdmin ─► OPTIONS+GET /juegos/admin/resumen ‖ /ingles/alumnos ‖ /ingles/grupos   (oleada 2)
              └─► render() ─► OPTIONS+GET /ingles/resumen ‖ /profe/entregas                  (oleada 3)
```

- Oleada 2 depende de `isAdmin` (respuesta de `/ingles/data`): `loadFor` en `ingles/app.js`.
- Oleada 3 sale al final de `render()` (`cargarResumen` en `ingles/tablero.js`, que también pide la bandeja para
  «📥 Por revisar»).
- Cada URL distinta paga su `OPTIONS` (la petición lleva `Authorization`).

### Celular (primera corrida)

| # | Método | Ruta | Inicio (ms) | Fin (ms) | Status |
|---:|---|---|---:|---:|---:|
| 1 | GET | /config | 3095 | 3154 | 200 |
| 2 | OPTIONS | /ingles/actividades | 3372 | 3376 | 200 |
| 3 | OPTIONS | /ingles/data | 3376 | 3378 | 200 |
| 4 | GET | /ingles/actividades | 3379 | 3668 | 200 |
| 5 | GET | /ingles/data | 3386 | 3592 | 200 |
| 6 | OPTIONS | /juegos/admin/resumen | 4268 | 4279 | 200 |
| 7 | OPTIONS | /ingles/alumnos | 4273 | 4281 | 200 |
| 8 | GET | /juegos/admin/resumen | 4296 | 4364 | 200 |
| 9 | OPTIONS | /ingles/grupos | 4307 | 4400 | 200 |
| 10 | GET | /ingles/alumnos | 4311 | 4437 | 200 |
| 11 | GET | /ingles/grupos | 4413 | 4443 | 200 |
| 12 | OPTIONS | /profe/entregas | 5745 | 5748 | 200 |
| 13 | OPTIONS | /ingles/resumen | 5746 | 5751 | 200 |
| 14 | GET | /profe/entregas | 5751 | 5787 | 200 |
| 15 | GET | /ingles/resumen | 5754 | 5774 | 200 |

### PC (primera corrida)

| # | Método | Ruta | Inicio (ms) | Fin (ms) | Status |
|---:|---|---|---:|---:|---:|
| 1 | GET | /config | 229 | 234 | 200 |
| 2 | OPTIONS | /ingles/actividades | 245 | 250 | 200 |
| 3 | OPTIONS | /ingles/data | 247 | 251 | 200 |
| 4 | GET | /ingles/actividades | 257 | 312 | 200 |
| 5 | GET | /ingles/data | 258 | 276 | 200 |
| 6 | OPTIONS | /juegos/admin/resumen | 321 | 324 | 200 |
| 7 | OPTIONS | /ingles/alumnos | 324 | 333 | 200 |
| 8 | OPTIONS | /ingles/grupos | 325 | 336 | 200 |
| 9 | GET | /juegos/admin/resumen | 328 | 342 | 200 |
| 10 | GET | /ingles/alumnos | 342 | 348 | 200 |
| 11 | GET | /ingles/grupos | 342 | 351 | 200 |
| 12 | OPTIONS | /profe/entregas | 437 | 439 | 200 |
| 13 | OPTIONS | /ingles/resumen | 438 | 441 | 200 |
| 14 | GET | /profe/entregas | 442 | 473 | 200 |
| 15 | GET | /ingles/resumen | 447 | 461 | 200 |

Las 17–19 de la auditoría `navegacion-dispositivos` (tarea «profe-grupos») incluyen además la navegación y el filtro
de grupo; el tope de la E2E `peticiones` para abrir el panel era 17.

Las otras pestañas ya eran perezosas: «🛡️ Nicks» pide `/profe/nicks` al abrirla y «📥 Entregas» repinta la bandeja
que ya había pedido «📥 Por revisar».
