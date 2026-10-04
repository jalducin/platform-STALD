## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/basta-rondas`

## 1. Servidor

- [x] 1.1 Pruebas que fallan (`server/salas_test.ts`): `rondas` por defecto 10, 5/12 válidos, otro 400;
  respuesta con `ronda` (válida, fuera de rango 400), primer `basta` por ronda; salas viejas sin `ronda`;
  `final` hasta 10000
- [x] 1.2 Implementación en `server/salas.ts`

## 2. Frontend

- [x] 2.1 `juegos.html`: selector de rondas al crear Basta; calendario por rondas; letras sin repetir;
  resultados por ronda con acumulado; bots por ronda; podio final y tabla por ronda

## 3. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [x] 3.1 Ajustar pruebas de Basta existentes (servidor y E2E de partidas) al formato por rondas

## 4. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 4.1 `deno test`, `check`, `lint`; E2E `e2e-basta-rondas` (dos navegadores, 5 rondas acelerado y
  10 por defecto: letras distintas, mismo marcador, ¡Basta! adelanta, podio acumulado) y regresiones
- [x] 4.2 Reporte `openspec/changes/basta-rondas/reports/2026-09-30-step-4-pruebas-y-verificacion.md`

## 5. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [x] 5.1 Producción: crear sala Basta (10 por defecto y 7 inválido) y responder por ronda con curl;
  **borrar** la sala de prueba y su entrada del índice

## 6. Documentación (OBLIGATORIO)

- [x] 6.1 `docs/backend-standards.md` y `docs/data-model.md` (`opciones.rondas`, `rondasBasta`)
