# Reporte Step 5 — Pruebas y verificación de estado

- Fecha: 2026-10-11
- Cambio: karts-pseudo3d
- Agente: Claude (worktree aislado)

## Comandos ejecutados
- Diagnóstico «antes» (`origin/main`): script de Playwright en el scratchpad contra un servidor de prueba propio
  (puertos 8939/8919, copia de los datos) — resultados en `design.md`.
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8939 --puerto-web 8919 karts`
- `bash tests/e2e/correr.sh --datos <scratchpad/data> --puerto-api 8939 --puerto-web 8919 karts juegos plataformas revancha`
- `npx -y @fission-ai/openspec@1.4.1 validate karts-pseudo3d --strict` → válido

## Resultados de pruebas
- Dirigidas (`karts`): 65 pasaron, 0 fallaron, 0 omitidas (antes 48). Nuevas: tutorial visible y que se quita a los
  3 s; vista 3D (horizonte en la fila 175 y 195 sprites en escena); ⬅ con toque real gira el carro y la cámara; ➡ gira a la derecha;
  multitáctil ⬅ + DERRAPE → morado; ACELERAR en modo «Con botón» (sin él < 20 px/s, con él > 120 px/s); joystick y
  «Con botón» guardados tras recargar; teclado → (carro y cámara), A y ↓; vuelta completa con el piloto de prueba;
  320×640 sin nada fuera; horizontal dentro de Juegos con marco de 720×374 (antes 720×250); vuelta completa en 22.1 s; sensor que falla → Botones. Se
  conservan copa (puntos 58, carrera 2 de 4 tras recargar), ⭐ individuales, sala con 2 fantasmas, podio y que la
  partida no guarda progreso.
- Regresión: 4 corridas, 4 PASS, 0 FAIL, 0 omitidas: `juegos` 29, `revancha` 20, `plataformas` 31 y `karts` 65.
- Duración: ~4 min la regresión.

## Capturas revisadas (`tests/e2e/salida/`)
- `karts-390-carrera-3d`, `karts-390-tutorial`, `karts-320-vertical`, `karts-844-horizontal`, `karts-escritorio`,
  `karts-escritorio-vuelta`, `karts-390-joystick`, `karts-390-sala`: se ve claramente un juego de karts en 3D (carro
  de espaldas, pista en perspectiva, piano, cielo con montañas, rivales con número, arco de META, señales de curva).
- Hallazgos corregidos al revisarlas: línea vertical en el cielo (costura del panorama) → lienzo con copia extra;
  rivales y cajas demasiado grandes → cámara a 115 px y cajas de 11 px; tu carro tapado por el que viene detrás → tu
  carro siempre encima y los de en medio translúcidos; arco de META deformado pegado a la cámara → no se dibuja a
  menos de 45 px; tutorial encima del «3» → abajo al centro; globos y mesetas junto a la pista → solo a lo lejos.

## Verificación manual (Step 6.1, el agente ejecuta)
- `juegos/karts.html` suelto, Chromium móvil (pantalla 2x) con piloto de prueba y CPU ×4: 390×844 60 fps, 360×740
  60 fps, 844×390 55–60 fps, escritorio 1100×700 57–60 fps (CPU ×1 en la E2E: ≥ 50 fps). Sin errores JS.

## Verificación de estado
- Antes: copia de prueba en `scratchpad/data` (no se modificó; el diagnóstico usó otra copia en `scratchpad/diag`).
- Después: `correr.sh` borró su copia temporal; las preferencias nuevas solo viven en el `localStorage` de cada
  contexto de prueba. Sin cambios en servidor, Supabase, `stald_*`, `.env` ni Notion.
- Estado restaurado: Sí.

## Resultado
- Estado Step 5: PASS
- Bloqueos: ninguno. Pendiente del usuario: prueba en celulares reales (6.2).
