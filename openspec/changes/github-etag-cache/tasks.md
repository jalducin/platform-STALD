## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `fix/github-etag-cache`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/store_test.ts`, con `fetch` falso):
  - ETag y 304 sin repetir la descarga;
  - 404 limpia la copia;
  - límite agotado con copia → la copia; sin copia → `github_rate_limit`;
  - `put` invalida la copia y la lista;
  - el tope de entradas.
- [x] 1.2 `server/store.ts` (caché condicional y respaldo) y `server/main.ts` (503 `mucho_trafico`)

- [x] 1.3 Sesiones muertas (pedido del profe): una sala vencida responde 410 sin leer a sus jugadores, y la página
  deja de consultar cuando la partida terminó, la sala venció o no existe, o tras 1 h abierta.

## 2. Frontend

- [x] 2.1 `juegos.html` e `ingles.html`: mensaje para `mucho_trafico`

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Suite completa en verde

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check` y `lint`
- [x] 4.2 Regresión E2E de juegos y partidas
- [x] 4.3 Reporte `openspec/changes/github-etag-cache/reports/2026-10-02-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 5.1 Tras el reinicio del límite y el despliegue:
  - Juegos, Inglés y el portal responden;
  - una sala consultada varias veces no consume el límite.
  - Se mide con `x-ratelimit-used`, sin `gh` innecesario.

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` (caché condicional, respaldo y `mucho_trafico`)
