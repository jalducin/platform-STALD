## 0. Rama (OBLIGATORIO)

- [ ] 0.1 Crear y usar la rama `feature/juegos-recarga` desde `main`

## 1. Pruebas primero (TDD)

- [ ] 1.1 `server/salas_test.ts`: volver a unirse con la partida empezada o la sala llena no duplica al jugador ni
  borra sus respuestas
- [ ] 1.2 `tests/e2e/e2e-juegos-recarga.js` (registrada en `ORDEN` de `correr.sh`, fase `base`): (a) sala de 2
  personas, recargar a una a mitad de la partida, misma sala y sin duplicar; (b) Sudoku y Cálculo y secuencias:
  recargar, continuar con el mismo avance, un solo `POST /juegos/partida`; (c) salir de la sala y recargar ya no
  entra; aviso `beforeunload` en Memorama; descartar la partida guardada
- [ ] 1.3 Correr la E2E nueva antes de implementar y confirmar que falla

## 2. Salas (`juegos.html`)

- [ ] 2.1 `recordarSala`/`olvidarSala`/`salaGuardada`: URL con `history.replaceState` y la clave
  `juegos_sala_activa`
- [ ] 2.2 Al cargar: reconectar por la URL (como antes) o por la clave (vigente, mismo `quien`, con `GET`)
- [ ] 2.3 Limpiar en `pantallaHub`, `pantallaAvatar` y `pintarFinalSala`
- [ ] 2.4 Basta por rondas: no reenviar rondas que el servidor ya tiene; Lotería: guardar y restaurar las marcas

## 3. Juegos individuales (`juegos.html`)

- [ ] 3.1 `enCurso` en `marco` (las pantallas de menú con `{ menu: true }`), `limpiar` lo borra junto con la
  instantánea
- [ ] 3.2 Instantánea en `quiz` (contadores, vidas, segundos que quedan y la categoría de cultura) y en Sudoku
- [ ] 3.3 Pantalla «¿Continuar tu partida de X?» al cargar
- [ ] 3.4 `beforeunload` para los juegos sin instantánea
- [ ] 3.5 `overscroll-behavior-y: contain` con la clase `jugando`

## 4. Revisar y actualizar pruebas existentes (OBLIGATORIO)

- [ ] 4.1 Revisar las E2E de salas y de juegos individuales que dependan de la URL o del regreso al inicio

## 5. Pruebas y verificación de estado (OBLIGATORIO)

- [ ] 5.1 `npx -y deno test -A server/`, `npx -y deno lint server/` y `npx -y deno check server/main.ts`
- [ ] 5.2 E2E `juegos-recarga` y la regresión: juegos, partidas, enlace-sala, una-sala, poker, cartas-espanolas,
  ajedrez, ajustes-salas, basta-rondas, loteria-sala, sudoku, clasicos, fusion y login (puertos 8837/8815, con una
  copia de los datos; la carpeta original no se toca)
- [ ] 5.3 Reporte en `openspec/changes/juegos-recarga/reports/2026-10-05-step-5-pruebas-y-verificacion.md`

## 6. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 6.1 UI: la E2E recorre el flujo en el navegador (recargar en sala, reanudar, descartar y salir) con capturas
  en `tests/e2e/salida/`. Estado: `correr.sh` trabaja sobre una copia temporal que borra al terminar
- [ ] 6.2 Tras el merge (lo hace el usuario): abrir la página publicada, entrar a una sala y recargar

## 7. Documentación (OBLIGATORIO)

- [ ] 7.1 `docs/frontend-standards.md`: claves `juegos_sala_activa` y `juegos_partida_individual`, el `?sala=` que
  queda en la URL, qué juegos se reanudan y cuáles solo avisan (con un enlace a este diseño, sin copiarlo)

## 8. Archivo

- [ ] 8.1 `openspec archive juegos-recarga` después del merge (lo integra el usuario)
