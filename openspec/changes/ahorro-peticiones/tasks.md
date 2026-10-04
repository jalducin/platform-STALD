## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `fix/ahorro-peticiones` (incluye el cambio local del sondeo adaptativo de otra sesión)

## 1. Servidor

- [x] 1.1 Prueba que falla: `OPTIONS` con `Access-Control-Max-Age` y un POST con `text/plain` procesado como JSON
- [x] 1.2 `server/main.ts`: `Access-Control-Max-Age: 86400`

## 2. Frontend

- [x] 2.1 POST con `text/plain` en `juegos.html`, `ingles.html` e `index.html`
- [x] 2.2 Sondeo por tipo de juego y corte de la sala de espera a los 15 min (sobre el cambio de la otra sesión)

## 3. Limpieza y vigilante

- [x] 3.1 Quitar `server/juegos.html` (copia accidental) y `deno-deploy-usage-alert.md` (nota suelta, resumida en
  este cambio)
- [x] 3.2 Vigilante cada 30 min

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 4.1 Suite completa en verde

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 5.1 `deno test`, `check` y `lint`
- [x] 5.2 E2E:
  - contar en el navegador las peticiones `OPTIONS` (0 en partidas);
  - una partida de quiz consulta cada 5 s y una de ¡Una! cada 2.5 s.
  - Regresiones de partidas, Basta por rondas, Inglés y alta de alumnos.
- [x] 5.3 Reporte `openspec/changes/ahorro-peticiones/reports/2026-10-03-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 Producción, sin escrituras:
  - `OPTIONS` con `Max-Age`;
  - un POST `text/plain` a una ruta de solo validación responde como antes (400 con body inválido).

## 7. Documentación (OBLIGATORIO)

- [x] 7.1 `docs/frontend-standards.md` (POST sin preflight y sondeo por tipo) y `docs/backend-standards.md` (CORS)
