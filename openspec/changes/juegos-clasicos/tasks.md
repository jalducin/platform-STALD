## 0. Rama (OBLIGATORIO)

- [x] 0.1 Crear y usar la rama `feature/juegos-clasicos`

## 1. Servidor

- [x] 1.1 Prueba que falla: `basta-es`, `basta-en`, `una` y `loteria` aceptados con sus topes (`juegos_test.ts`)
- [x] 1.2 Agregar los 4 juegos a `CATALOGO`

## 2. Frontend (`juegos.html`)

- [x] 2.1 Basta (es/en): letra, categorías, reloj, "¡Basta!", calificación con diccionario y tabla de resultados
- [x] 2.2 ¡Una!: mazo, reglas, bots, "¡Una!" con castigo, modo inglés con voz
- [x] 2.3 Lotería: tablas, gritón con voz (es/en/ambos), marcar solo cartas salidas, Línea y Tabla llena, bots
- [x] 2.4 Categoría 🎲 Clásicos en el hub y descripción en la tarjeta del portal

## 3. Pruebas y verificación de estado (OBLIGATORIO)

- [x] 3.1 `deno test`, `check` y `lint`; E2E:
  - Basta con respuestas verificadas, desconocidas y con otra letra;
  - ¡Una! hasta el final, con jugada inválida rechazada y castigo por no decir "¡Una!";
  - Lotería con marca inválida, grito falso y lotería válida o bot ganador.
  - Regresión de juegos.
- [x] 3.2 Reporte `openspec/changes/juegos-clasicos/reports/2026-09-30-step-3-pruebas-y-verificacion.md`

## 4. Verificación manual — EL AGENTE EJECUTA (OBLIGATORIO)

- [ ] 4.1 Tras el merge:
  - curl de partida con tope de `loteria` como admin;
  - **restaurar** borrando la partida de prueba;
  - revisión de solo lectura en Pages: la categoría Clásicos con 4 juegos.

## 5. Documentación (OBLIGATORIO)

- [x] 5.1 `docs/backend-standards.md` (catálogo) y `docs/data-model.md` (`basta.json`, `loteria.json`)
- [ ] 5.2 Commit, push, PR y merge a `main`
